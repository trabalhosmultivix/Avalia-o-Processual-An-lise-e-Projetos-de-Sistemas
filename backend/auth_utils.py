"""
Helpers de autenticação e autorização.

Estratégia de sessão: usamos o mecanismo de sessão nativo do Flask, que
grava um cookie assinado (não é preciso banco de sessão à parte). Ao logar,
gravamos apenas `usuario_id` e `tipo` na sessão — nunca a senha.

Isso resolve o requisito de "salvar as informações de login": o front-end
pode chamar GET /api/auth/me ao carregar a página e, se o cookie de sessão
ainda for válido, o usuário continua logado mesmo após um F5 — sem nunca
reenviar ou reter a senha em lugar nenhum.
"""
from functools import wraps

from flask import session, jsonify, g

from db import get_db


def usuario_atual():
    """Retorna o dict do usuário logado (sem o hash de senha) ou None."""
    if "usuario" in g:
        return g.usuario

    usuario_id = session.get("usuario_id")
    if not usuario_id:
        g.usuario = None
        return None

    db = get_db()
    row = db.execute("SELECT * FROM usuarios WHERE id = ?", (usuario_id,)).fetchone()
    g.usuario = sanitizar_usuario(row) if row else None
    return g.usuario


def sanitizar_usuario(row):
    """Converte uma linha `usuarios` em dict público, removendo o hash."""
    if row is None:
        return None
    d = dict(row)
    d.pop("senha_hash", None)
    return d


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if usuario_atual() is None:
            return jsonify(erro="Não autenticado. Faça login para continuar."), 401
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        u = usuario_atual()
        if u is None:
            return jsonify(erro="Não autenticado. Faça login para continuar."), 401
        if u["tipo"] != "administrador":
            return jsonify(erro="Acesso restrito ao Administrador."), 403
        return fn(*args, **kwargs)
    return wrapper


def estudante_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        u = usuario_atual()
        if u is None:
            return jsonify(erro="Não autenticado. Faça login para continuar."), 401
        if u["tipo"] != "estudante":
            return jsonify(erro="Acesso restrito ao Estudante."), 403
        return fn(*args, **kwargs)
    return wrapper
