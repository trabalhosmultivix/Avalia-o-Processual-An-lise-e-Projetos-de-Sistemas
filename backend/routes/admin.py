"""Estatísticas agregadas para o painel administrativo."""
from flask import Blueprint, jsonify

from db import get_db
from auth_utils import admin_required

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@bp.get("/estatisticas")
@admin_required
def estatisticas():
    db = get_db()
    total_alunos = db.execute(
        "SELECT COUNT(*) AS n FROM usuarios WHERE tipo = 'estudante'"
    ).fetchone()["n"]
    return jsonify(total_alunos=total_alunos)
