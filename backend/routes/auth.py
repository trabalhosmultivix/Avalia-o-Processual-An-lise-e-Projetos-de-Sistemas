"""
Rotas de autenticação: login, logout, "quem sou eu" e cadastro de novo perfil.
"""
import sqlite3
import secrets
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash

from db import get_db
from auth_utils import usuario_atual, sanitizar_usuario, login_required

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/registrar")
def registrar():
    """Cria um novo perfil (estudante ou administrador)."""
    dados = request.get_json(silent=True) or {}

    tipo = (dados.get("tipo") or "").strip().lower()
    nome = (dados.get("nome") or "").strip()
    identificador = (dados.get("identificador") or "").strip()
    email = (dados.get("email") or "").strip().lower()
    telefone = (dados.get("telefone") or "").strip()
    senha = dados.get("senha") or ""
    curso = (dados.get("curso") or "").strip() or None
    cargo = (dados.get("cargo") or "").strip() or None

    if tipo not in ("estudante", "administrador"):
        return jsonify(erro="Informe o tipo de perfil: 'estudante' ou 'administrador'."), 400
    if not nome or not identificador or not email or not senha:
        return jsonify(erro="Preencha nome, identificador, e-mail e senha."), 400
    if len(senha) < 4:
        return jsonify(erro="A senha deve ter ao menos 4 caracteres."), 400
    if tipo == "estudante" and not curso:
        return jsonify(erro="Informe o curso do estudante."), 400
    if tipo == "administrador" and not cargo:
        return jsonify(erro="Informe o cargo do administrador."), 400

    db = get_db()
    senha_hash = generate_password_hash(senha)
    try:
        cur = db.execute(
            "INSERT INTO usuarios (tipo, nome, identificador, email, telefone, senha_hash, curso, cargo) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (tipo, nome, identificador, email, telefone, senha_hash, curso, cargo),
        )
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify(erro="Já existe um perfil cadastrado com este e-mail ou identificador."), 409

    novo_id = cur.lastrowid
    row = db.execute("SELECT * FROM usuarios WHERE id = ?", (novo_id,)).fetchone()

    # Loga automaticamente o usuário recém-cadastrado.
    session.clear()
    session["usuario_id"] = novo_id
    session.permanent = True

    return jsonify(usuario=sanitizar_usuario(row)), 201


@bp.post("/login")
def login():
    dados = request.get_json(silent=True) or {}
    tipo = (dados.get("tipo") or "").strip().lower()
    identificacao = (dados.get("identificacao") or "").strip().lower()
    senha = dados.get("senha") or ""

    if tipo not in ("estudante", "administrador") or not identificacao or not senha:
        return jsonify(erro="Informe tipo, e-mail/identificador e senha."), 400

    db = get_db()
    row = db.execute(
        "SELECT * FROM usuarios WHERE tipo = ? AND (LOWER(email) = ? OR LOWER(identificador) = ?)",
        (tipo, identificacao, identificacao),
    ).fetchone()

    if row is None or not check_password_hash(row["senha_hash"], senha):
        return jsonify(erro="Credenciais inválidas para o perfil selecionado."), 401

    session.clear()
    session["usuario_id"] = row["id"]
    session.permanent = True

    return jsonify(usuario=sanitizar_usuario(row))


@bp.post("/logout")
def logout():
    session.clear()
    return jsonify(ok=True)


@bp.get("/me")
def me():
    """Usado pelo front-end ao carregar a página, para restaurar a sessão
    (login persistido) sem nunca precisar reenviar a senha."""
    u = usuario_atual()
    if u is None:
        return jsonify(erro="Não autenticado."), 401
    return jsonify(usuario=u)


@bp.post("/esqueci-senha")
def esqueci_senha():
    """Gera um token de redefinição de senha.
    Em produção o token seria enviado por e-mail; aqui, para fins de
    protótipo/avaliação, ele é devolvido diretamente na resposta."""
    dados = request.get_json(silent=True) or {}
    identificacao = (dados.get("identificacao") or "").strip().lower()
    if not identificacao:
        return jsonify(erro="Informe seu e-mail ou identificador."), 400

    db = get_db()
    row = db.execute(
        "SELECT * FROM usuarios WHERE LOWER(email) = ? OR LOWER(identificador) = ?",
        (identificacao, identificacao),
    ).fetchone()
    # Resposta genérica mesmo se não encontrar, para não revelar quais
    # e-mails/identificadores existem no sistema.
    if row is None:
        return jsonify(ok=True, mensagem="Se o cadastro existir, um link de redefinição foi gerado.")

    token = secrets.token_urlsafe(24)
    expira_em = (datetime.utcnow() + timedelta(hours=1)).isoformat(timespec="seconds")
    db.execute(
        "INSERT INTO reset_tokens (usuario_id, token, expira_em) VALUES (?, ?, ?)",
        (row["id"], token, expira_em),
    )
    db.commit()
    return jsonify(ok=True, token=token, expira_em=expira_em)


@bp.post("/redefinir-senha")
def redefinir_senha():
    dados = request.get_json(silent=True) or {}
    token = dados.get("token") or ""
    nova_senha = dados.get("nova_senha") or ""
    if not token or len(nova_senha) < 4:
        return jsonify(erro="Token inválido ou nova senha muito curta (mín. 4 caracteres)."), 400

    db = get_db()
    row = db.execute("SELECT * FROM reset_tokens WHERE token = ?", (token,)).fetchone()
    if row is None or row["usado"] or row["expira_em"] < datetime.utcnow().isoformat(timespec="seconds"):
        return jsonify(erro="Token inválido ou expirado. Solicite um novo."), 400

    db.execute(
        "UPDATE usuarios SET senha_hash = ? WHERE id = ?",
        (generate_password_hash(nova_senha), row["usuario_id"]),
    )
    db.execute("UPDATE reset_tokens SET usado = 1 WHERE id = ?", (row["id"],))
    db.commit()
    return jsonify(ok=True, mensagem="Senha redefinida com sucesso.")
