"""Rotas de perfil do usuário logado."""
import sqlite3

from flask import Blueprint, request, jsonify

from db import get_db
from auth_utils import login_required, usuario_atual, sanitizar_usuario

bp = Blueprint("perfil", __name__, url_prefix="/api/perfil")


@bp.get("")
@login_required
def obter_perfil():
    return jsonify(usuario=usuario_atual())


@bp.put("")
@login_required
def atualizar_perfil():
    """Permite atualizar apenas dados de contato (telefone/e-mail) —
    identificador e tipo de perfil não podem ser alterados pelo próprio usuário."""
    dados = request.get_json(silent=True) or {}
    u = usuario_atual()
    db = get_db()

    telefone = dados.get("telefone", u["telefone"])
    email = (dados.get("email") or u["email"]).strip().lower()

    try:
        db.execute(
            "UPDATE usuarios SET telefone = ?, email = ? WHERE id = ?",
            (telefone, email, u["id"]),
        )
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify(erro="Este e-mail já está em uso por outro perfil."), 409

    row = db.execute("SELECT * FROM usuarios WHERE id = ?", (u["id"],)).fetchone()
    return jsonify(usuario=sanitizar_usuario(row))
