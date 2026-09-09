"""Rotas de eventos (CRUD de administração + listagem/busca para todos)."""
from flask import Blueprint, request, jsonify

from db import get_db, gerar_codigo_checkin
from auth_utils import login_required, admin_required, usuario_atual

bp = Blueprint("eventos", __name__, url_prefix="/api/eventos")

CAMPOS_OBRIGATORIOS = [
    "titulo", "categoria", "data_evento", "hora_inicio", "hora_fim",
    "local", "vagas", "descricao", "status", "carga_horaria",
]


def _serializar(row, incluir_codigo_checkin=False):
    d = dict(row)
    if not incluir_codigo_checkin:
        d.pop("codigo_checkin", None)  # o código só é visível para o admin
    return d


@bp.get("")
@login_required
def listar():
    db = get_db()
    categoria = request.args.get("categoria")
    status = request.args.get("status")
    busca = request.args.get("busca", "").strip()

    sql = "SELECT * FROM eventos WHERE 1=1"
    params = []
    if categoria:
        sql += " AND categoria = ?"
        params.append(categoria)
    if status:
        sql += " AND status = ?"
        params.append(status)
    if busca:
        sql += " AND (titulo LIKE ? OR descricao LIKE ? OR local LIKE ?)"
        curinga = f"%{busca}%"
        params += [curinga, curinga, curinga]
    sql += " ORDER BY data_evento ASC"

    linhas = db.execute(sql, params).fetchall()
    admin = usuario_atual()["tipo"] == "administrador"
    return jsonify(eventos=[_serializar(r, incluir_codigo_checkin=admin) for r in linhas])


@bp.get("/<int:evento_id>")
@login_required
def obter(evento_id):
    db = get_db()
    row = db.execute("SELECT * FROM eventos WHERE id = ?", (evento_id,)).fetchone()
    if row is None:
        return jsonify(erro="Evento não encontrado."), 404
    admin = usuario_atual()["tipo"] == "administrador"
    return jsonify(evento=_serializar(row, incluir_codigo_checkin=admin))


@bp.post("")
@admin_required
def criar():
    dados = request.get_json(silent=True) or {}
    faltando = [c for c in CAMPOS_OBRIGATORIOS if dados.get(c) in (None, "")]
    if faltando:
        return jsonify(erro=f"Campos obrigatórios ausentes: {', '.join(faltando)}"), 400

    db = get_db()
    codigo = gerar_codigo_checkin()
    cur = db.execute(
        "INSERT INTO eventos (titulo, categoria, data_evento, hora_inicio, hora_fim, local, "
        "vagas, vagas_ocupadas, descricao, status, carga_horaria, codigo_checkin, criado_por) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)",
        (
            dados["titulo"], dados["categoria"], dados["data_evento"], dados["hora_inicio"],
            dados["hora_fim"], dados["local"], int(dados["vagas"]), dados["descricao"],
            dados["status"], int(dados["carga_horaria"]), codigo, usuario_atual()["id"],
        ),
    )
    db.commit()
    row = db.execute("SELECT * FROM eventos WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(evento=_serializar(row, incluir_codigo_checkin=True)), 201


@bp.put("/<int:evento_id>")
@admin_required
def editar(evento_id):
    db = get_db()
    atual = db.execute("SELECT * FROM eventos WHERE id = ?", (evento_id,)).fetchone()
    if atual is None:
        return jsonify(erro="Evento não encontrado."), 404

    dados = request.get_json(silent=True) or {}
    campos = dict(atual)
    for campo in CAMPOS_OBRIGATORIOS:
        if campo in dados:
            campos[campo] = dados[campo]

    novas_vagas = int(campos["vagas"])
    if novas_vagas < campos["vagas_ocupadas"]:
        return jsonify(erro="O número de vagas não pode ser menor que as vagas já ocupadas."), 400

    db.execute(
        "UPDATE eventos SET titulo=?, categoria=?, data_evento=?, hora_inicio=?, hora_fim=?, "
        "local=?, vagas=?, descricao=?, status=?, carga_horaria=? WHERE id = ?",
        (
            campos["titulo"], campos["categoria"], campos["data_evento"], campos["hora_inicio"],
            campos["hora_fim"], campos["local"], novas_vagas, campos["descricao"],
            campos["status"], int(campos["carga_horaria"]), evento_id,
        ),
    )
    db.commit()
    row = db.execute("SELECT * FROM eventos WHERE id = ?", (evento_id,)).fetchone()
    return jsonify(evento=_serializar(row, incluir_codigo_checkin=True))


@bp.delete("/<int:evento_id>")
@admin_required
def excluir(evento_id):
    db = get_db()
    row = db.execute("SELECT * FROM eventos WHERE id = ?", (evento_id,)).fetchone()
    if row is None:
        return jsonify(erro="Evento não encontrado."), 404
    db.execute("DELETE FROM eventos WHERE id = ?", (evento_id,))
    db.commit()
    return jsonify(ok=True)


@bp.get("/<int:evento_id>/codigo-checkin")
@admin_required
def obter_codigo_checkin(evento_id):
    """Devolve o código atual para o administrador exibir/projetar aos
    participantes no dia do evento (ou gerar um QR code no front-end)."""
    db = get_db()
    row = db.execute("SELECT id, codigo_checkin, checkin_liberado FROM eventos WHERE id = ?", (evento_id,)).fetchone()
    if row is None:
        return jsonify(erro="Evento não encontrado."), 404
    return jsonify(codigo_checkin=row["codigo_checkin"], checkin_liberado=bool(row["checkin_liberado"]))


@bp.post("/<int:evento_id>/regenerar-codigo-checkin")
@admin_required
def regenerar_codigo_checkin(evento_id):
    db = get_db()
    row = db.execute("SELECT * FROM eventos WHERE id = ?", (evento_id,)).fetchone()
    if row is None:
        return jsonify(erro="Evento não encontrado."), 404
    novo_codigo = gerar_codigo_checkin()
    db.execute("UPDATE eventos SET codigo_checkin = ? WHERE id = ?", (novo_codigo, evento_id))
    db.commit()
    return jsonify(codigo_checkin=novo_codigo)


@bp.post("/<int:evento_id>/alternar-checkin")
@admin_required
def alternar_checkin(evento_id):
    """Liga/desliga manualmente a liberação do check-in para este evento —
    é assim que o administrador 'abre' o check-in no dia, projetando o
    código na tela para os participantes digitarem no app."""
    db = get_db()
    row = db.execute("SELECT * FROM eventos WHERE id = ?", (evento_id,)).fetchone()
    if row is None:
        return jsonify(erro="Evento não encontrado."), 404
    novo_valor = 0 if row["checkin_liberado"] else 1
    db.execute("UPDATE eventos SET checkin_liberado = ? WHERE id = ?", (novo_valor, evento_id))
    db.commit()
    return jsonify(checkin_liberado=bool(novo_valor))
