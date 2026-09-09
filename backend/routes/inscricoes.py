"""
Rotas de inscrição em eventos e de check-in presencial.

── Ideia do check-in ──────────────────────────────────────────────────────
Cada evento tem um `codigo_checkin` de 6 caracteres, gerado automaticamente.
No dia do evento, o administrador clica em "Abrir check-in" (endpoint
/api/eventos/<id>/alternar-checkin) e projeta/informa esse código aos
participantes (em um slide, cartaz ou QR code gerado a partir dele).

O aluno, dentro do app, abre a inscrição confirmada daquele evento e digita
o código em um campo "Fazer check-in". O back-end valida:
  1. o aluno está autenticado e tem uma inscrição CONFIRMADA nesse evento;
  2. ainda não fez check-in nessa inscrição (uma vez só, não dá pra repetir);
  3. o check-in está liberado (toggle manual do admin OU a data do evento é
     hoje — o que vier primeiro já libera, dando flexibilidade para eventos
     de vários dias);
  4. o código informado bate com o código atual do evento.

Só depois do check-in confirmado é que o botão "Baixar certificado" é
liberado no front-end (ver rota certificados.py).
"""
from datetime import date

from flask import Blueprint, request, jsonify

from db import get_db
from auth_utils import login_required, estudante_required, admin_required, usuario_atual

bp = Blueprint("inscricoes", __name__, url_prefix="/api")


def _evento_ou_404(db, evento_id):
    return db.execute("SELECT * FROM eventos WHERE id = ?", (evento_id,)).fetchone()


def checkin_esta_liberado(evento_row) -> bool:
    if evento_row["checkin_liberado"]:
        return True
    return evento_row["data_evento"] == date.today().isoformat()


def _serializar_inscricao(row, db):
    d = dict(row)
    evento = db.execute("SELECT titulo, data_evento, carga_horaria, local, hora_inicio, hora_fim FROM eventos WHERE id = ?", (d["evento_id"],)).fetchone()
    checkin = db.execute("SELECT data_hora FROM checkins WHERE inscricao_id = ?", (d["id"],)).fetchone()
    certificado = db.execute("SELECT codigo FROM certificados WHERE inscricao_id = ?", (d["id"],)).fetchone()
    d["evento_titulo"] = evento["titulo"] if evento else None
    d["evento_data"] = evento["data_evento"] if evento else None
    d["evento_carga_horaria"] = evento["carga_horaria"] if evento else None
    d["evento_local"] = evento["local"] if evento else None
    d["evento_hora_inicio"] = evento["hora_inicio"] if evento else None
    d["evento_hora_fim"] = evento["hora_fim"] if evento else None
    d["checkin_feito"] = checkin is not None
    d["checkin_data_hora"] = checkin["data_hora"] if checkin else None
    d["certificado_codigo"] = certificado["codigo"] if certificado else None
    return d


# ─── Inscrição ────────────────────────────────────────────────────────────

@bp.post("/eventos/<int:evento_id>/inscrever")
@estudante_required
def inscrever(evento_id):
    db = get_db()
    evento = _evento_ou_404(db, evento_id)
    if evento is None:
        return jsonify(erro="Evento não encontrado."), 404

    usuario = usuario_atual()

    ativa = db.execute(
        "SELECT * FROM inscricoes WHERE evento_id = ? AND usuario_id = ? AND status != 'cancelada'",
        (evento_id, usuario["id"]),
    ).fetchone()
    if ativa is not None:
        return jsonify(erro="Você já está inscrito neste evento. Não é possível se inscrever novamente."), 409

    if evento["vagas_ocupadas"] >= evento["vagas"]:
        return jsonify(erro="Não há mais vagas disponíveis para este evento."), 409

    if evento["status"] == "encerrado":
        return jsonify(erro="As inscrições para este evento estão encerradas."), 409

    try:
        cur = db.execute(
            "INSERT INTO inscricoes (usuario_id, evento_id, status) VALUES (?, ?, 'confirmada')",
            (usuario["id"], evento_id),
        )
        db.execute("UPDATE eventos SET vagas_ocupadas = vagas_ocupadas + 1 WHERE id = ?", (evento_id,))
        db.commit()
    except Exception:
        db.rollback()
        return jsonify(erro="Você já está inscrito neste evento. Não é possível se inscrever novamente."), 409

    row = db.execute("SELECT * FROM inscricoes WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(inscricao=_serializar_inscricao(row, db)), 201


@bp.get("/inscricoes/minhas")
@estudante_required
def minhas_inscricoes():
    db = get_db()
    usuario = usuario_atual()
    linhas = db.execute(
        "SELECT * FROM inscricoes WHERE usuario_id = ? ORDER BY data_inscricao DESC", (usuario["id"],)
    ).fetchall()
    return jsonify(inscricoes=[_serializar_inscricao(r, db) for r in linhas])


@bp.get("/inscricoes")
@admin_required
def listar_inscricoes():
    db = get_db()
    evento_id = request.args.get("evento_id")
    status = request.args.get("status")
    sql = "SELECT * FROM inscricoes WHERE 1=1"
    params = []
    if evento_id:
        sql += " AND evento_id = ?"
        params.append(evento_id)
    if status:
        sql += " AND status = ?"
        params.append(status)
    sql += " ORDER BY data_inscricao DESC"
    linhas = db.execute(sql, params).fetchall()
    return jsonify(inscricoes=[_serializar_inscricao(r, db) for r in linhas])


@bp.delete("/inscricoes/<int:inscricao_id>")
@login_required
def cancelar_inscricao(inscricao_id):
    db = get_db()
    row = db.execute("SELECT * FROM inscricoes WHERE id = ?", (inscricao_id,)).fetchone()
    if row is None:
        return jsonify(erro="Inscrição não encontrada."), 404

    usuario = usuario_atual()
    if usuario["tipo"] != "administrador" and row["usuario_id"] != usuario["id"]:
        return jsonify(erro="Você só pode cancelar suas próprias inscrições."), 403

    if row["status"] == "cancelada":
        return jsonify(erro="Esta inscrição já está cancelada."), 409

    era_confirmada = row["status"] == "confirmada"
    db.execute("UPDATE inscricoes SET status = 'cancelada' WHERE id = ?", (inscricao_id,))
    if era_confirmada:
        db.execute(
            "UPDATE eventos SET vagas_ocupadas = MAX(0, vagas_ocupadas - 1) WHERE id = ?",
            (row["evento_id"],),
        )
    db.commit()
    return jsonify(ok=True)


# ─── Check-in ─────────────────────────────────────────────────────────────

@bp.post("/eventos/<int:evento_id>/checkin")
@estudante_required
def fazer_checkin(evento_id):
    db = get_db()
    dados = request.get_json(silent=True) or {}
    codigo_informado = (dados.get("codigo") or "").strip().upper()
    if not codigo_informado:
        return jsonify(erro="Informe o código de check-in divulgado no evento."), 400

    evento = _evento_ou_404(db, evento_id)
    if evento is None:
        return jsonify(erro="Evento não encontrado."), 404

    usuario = usuario_atual()
    inscricao = db.execute(
        "SELECT * FROM inscricoes WHERE evento_id = ? AND usuario_id = ? AND status = 'confirmada'",
        (evento_id, usuario["id"]),
    ).fetchone()
    if inscricao is None:
        return jsonify(erro="Você não possui uma inscrição confirmada para este evento."), 403

    ja_fez = db.execute("SELECT 1 FROM checkins WHERE inscricao_id = ?", (inscricao["id"],)).fetchone()
    if ja_fez is not None:
        return jsonify(erro="Check-in já realizado para esta inscrição."), 409

    if not checkin_esta_liberado(evento):
        return jsonify(erro="O check-in deste evento ainda não foi liberado pela organização."), 403

    if codigo_informado != evento["codigo_checkin"]:
        return jsonify(erro="Código de check-in inválido."), 400

    db.execute(
        "INSERT INTO checkins (inscricao_id, usuario_id, evento_id, metodo, codigo_utilizado) "
        "VALUES (?, ?, ?, 'codigo', ?)",
        (inscricao["id"], usuario["id"], evento_id, codigo_informado),
    )
    db.commit()
    return jsonify(ok=True, mensagem="Check-in realizado com sucesso! O certificado já pode ser emitido.")


@bp.post("/inscricoes/<int:inscricao_id>/checkin-manual")
@admin_required
def checkin_manual(inscricao_id):
    """Permite que o administrador registre a presença manualmente (ex.: o
    aluno esqueceu de fazer check-in pelo app no dia do evento)."""
    db = get_db()
    inscricao = db.execute("SELECT * FROM inscricoes WHERE id = ?", (inscricao_id,)).fetchone()
    if inscricao is None:
        return jsonify(erro="Inscrição não encontrada."), 404
    if inscricao["status"] != "confirmada":
        return jsonify(erro="Só é possível registrar presença em inscrições confirmadas."), 409

    ja_fez = db.execute("SELECT 1 FROM checkins WHERE inscricao_id = ?", (inscricao_id,)).fetchone()
    if ja_fez is not None:
        return jsonify(erro="Check-in já realizado para esta inscrição."), 409

    db.execute(
        "INSERT INTO checkins (inscricao_id, usuario_id, evento_id, metodo) VALUES (?, ?, ?, 'manual-admin')",
        (inscricao_id, inscricao["usuario_id"], inscricao["evento_id"]),
    )
    db.commit()
    return jsonify(ok=True)


@bp.get("/inscricoes/<int:inscricao_id>/checkin")
@login_required
def status_checkin(inscricao_id):
    db = get_db()
    inscricao = db.execute("SELECT * FROM inscricoes WHERE id = ?", (inscricao_id,)).fetchone()
    if inscricao is None:
        return jsonify(erro="Inscrição não encontrada."), 404

    usuario = usuario_atual()
    if usuario["tipo"] != "administrador" and inscricao["usuario_id"] != usuario["id"]:
        return jsonify(erro="Acesso negado."), 403

    checkin = db.execute("SELECT * FROM checkins WHERE inscricao_id = ?", (inscricao_id,)).fetchone()
    return jsonify(checkin_feito=checkin is not None, checkin=dict(checkin) if checkin else None)
