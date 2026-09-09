"""
Rotas de certificados.

Regra de negócio: um certificado só pode ser emitido para uma inscrição que
já tenha check-in registrado. Uma vez emitido, o código e o hash de
verificação não mudam — o PDF é gerado sob demanda a partir desses dados,
então o download sempre reflete o mesmo conteúdo (o arquivo não fica salvo
em disco, é remontado a cada requisição).
"""
import hashlib
from datetime import datetime

from flask import Blueprint, request, jsonify, send_file, current_app

from db import get_db
from auth_utils import login_required, estudante_required, admin_required, usuario_atual
from certificado_pdf import gerar_pdf_certificado

bp = Blueprint("certificados", __name__, url_prefix="/api")

SIGNATARIO_PADRAO_NOME = "Carla Menezes"
SIGNATARIO_PADRAO_CARGO = "Coordenadora de Extensão e Eventos"


def _formatar_data_br(iso_date: str) -> str:
    try:
        return datetime.strptime(iso_date, "%Y-%m-%d").strftime("%d/%m/%Y")
    except (ValueError, TypeError):
        return iso_date or ""


def _gerar_hash(codigo, usuario_id, evento_id, data_emissao_iso):
    base = f"{codigo}|{usuario_id}|{evento_id}|{data_emissao_iso}|{current_app.config['SECRET_KEY']}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()[:16].upper()


def _proximo_codigo(db):
    ano = datetime.utcnow().year
    row = db.execute(
        "SELECT COUNT(*) AS n FROM certificados WHERE codigo LIKE ?", (f"CERT-{ano}-%",)
    ).fetchone()
    return f"CERT-{ano}-{row['n'] + 1:04d}"


def _serializar(row, db):
    d = dict(row)
    evento = db.execute("SELECT titulo, data_evento FROM eventos WHERE id = ?", (d["evento_id"],)).fetchone()
    aluno = db.execute("SELECT nome, identificador FROM usuarios WHERE id = ?", (d["usuario_id"],)).fetchone()
    d["evento_titulo"] = evento["titulo"] if evento else None
    d["evento_data"] = evento["data_evento"] if evento else None
    d["aluno_nome"] = aluno["nome"] if aluno else None
    d["aluno_identificador"] = aluno["identificador"] if aluno else None
    return d


@bp.post("/inscricoes/<int:inscricao_id>/certificado")
@estudante_required
def emitir_certificado(inscricao_id):
    db = get_db()
    usuario = usuario_atual()

    inscricao = db.execute("SELECT * FROM inscricoes WHERE id = ?", (inscricao_id,)).fetchone()
    if inscricao is None:
        return jsonify(erro="Inscrição não encontrada."), 404
    if inscricao["usuario_id"] != usuario["id"]:
        return jsonify(erro="Esta inscrição não pertence ao seu perfil."), 403

    existente = db.execute("SELECT * FROM certificados WHERE inscricao_id = ?", (inscricao_id,)).fetchone()
    if existente is not None:
        return jsonify(certificado=_serializar(existente, db))

    checkin = db.execute("SELECT * FROM checkins WHERE inscricao_id = ?", (inscricao_id,)).fetchone()
    if checkin is None:
        return jsonify(erro="É preciso fazer o check-in no evento antes de emitir o certificado."), 403

    evento = db.execute("SELECT * FROM eventos WHERE id = ?", (inscricao["evento_id"],)).fetchone()

    signatario = None
    if evento["criado_por"]:
        signatario = db.execute("SELECT nome, cargo FROM usuarios WHERE id = ?", (evento["criado_por"],)).fetchone()
    nome_signatario = signatario["nome"] if signatario else SIGNATARIO_PADRAO_NOME
    cargo_signatario = signatario["cargo"] if signatario else SIGNATARIO_PADRAO_CARGO

    codigo = _proximo_codigo(db)
    data_emissao_iso = datetime.utcnow().isoformat(timespec="seconds")
    hash_verificacao = _gerar_hash(codigo, usuario["id"], evento["id"], data_emissao_iso)

    cur = db.execute(
        "INSERT INTO certificados (inscricao_id, usuario_id, evento_id, codigo, carga_horaria, "
        "hash_verificacao, assinado_por_id, data_emissao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (
            inscricao_id, usuario["id"], evento["id"], codigo, evento["carga_horaria"],
            hash_verificacao, evento["criado_por"], data_emissao_iso,
        ),
    )
    db.execute("UPDATE inscricoes SET certificado_emitido = 1 WHERE id = ?", (inscricao_id,))
    db.commit()

    row = db.execute("SELECT * FROM certificados WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(certificado=_serializar(row, db)), 201


@bp.get("/certificados/meus")
@estudante_required
def meus_certificados():
    db = get_db()
    usuario = usuario_atual()
    linhas = db.execute(
        "SELECT * FROM certificados WHERE usuario_id = ? ORDER BY data_emissao DESC", (usuario["id"],)
    ).fetchall()
    return jsonify(certificados=[_serializar(r, db) for r in linhas])


@bp.get("/certificados")
@admin_required
def listar_certificados_admin():
    """Busca por nome ou identificador do aluno (para o painel administrativo)."""
    db = get_db()
    q = request.args.get("q", "").strip()
    sql = (
        "SELECT c.* FROM certificados c JOIN usuarios u ON u.id = c.usuario_id WHERE 1=1"
    )
    params = []
    if q:
        sql += " AND (u.nome LIKE ? OR u.identificador LIKE ?)"
        curinga = f"%{q}%"
        params += [curinga, curinga]
    sql += " ORDER BY c.data_emissao DESC"
    linhas = db.execute(sql, params).fetchall()
    return jsonify(certificados=[_serializar(r, db) for r in linhas])


@bp.get("/certificados/<codigo>/pdf")
@login_required
def baixar_pdf(codigo):
    db = get_db()
    row = db.execute("SELECT * FROM certificados WHERE codigo = ?", (codigo,)).fetchone()
    if row is None:
        return jsonify(erro="Certificado não encontrado."), 404

    usuario = usuario_atual()
    if usuario["tipo"] != "administrador" and row["usuario_id"] != usuario["id"]:
        return jsonify(erro="Você não tem permissão para baixar este certificado."), 403

    evento = db.execute("SELECT * FROM eventos WHERE id = ?", (row["evento_id"],)).fetchone()
    aluno = db.execute("SELECT * FROM usuarios WHERE id = ?", (row["usuario_id"],)).fetchone()
    signatario = None
    if row["assinado_por_id"]:
        signatario = db.execute("SELECT * FROM usuarios WHERE id = ?", (row["assinado_por_id"],)).fetchone()

    pdf_bytes = gerar_pdf_certificado({
        "nome_aluno": aluno["nome"],
        "identificador_aluno": aluno["identificador"],
        "titulo_evento": evento["titulo"],
        "data_evento": _formatar_data_br(evento["data_evento"]),
        "carga_horaria": row["carga_horaria"],
        "codigo_certificado": row["codigo"],
        "hash_verificacao": row["hash_verificacao"],
        "nome_signatario": signatario["nome"] if signatario else SIGNATARIO_PADRAO_NOME,
        "cargo_signatario": signatario["cargo"] if signatario else SIGNATARIO_PADRAO_CARGO,
        "data_emissao": _formatar_data_br(row["data_emissao"][:10]) if row["data_emissao"] else "",
    })

    from io import BytesIO
    return send_file(
        BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"certificado-{row['codigo']}.pdf",
    )


@bp.get("/certificados/verificar/<codigo>")
def verificar_certificado(codigo):
    """Endpoint público (sem login) para checar a autenticidade de um
    certificado a partir do código impresso nele — não expõe dados sensíveis,
    só confirma validade e mostra dados básicos do evento."""
    db = get_db()
    row = db.execute("SELECT * FROM certificados WHERE codigo = ?", (codigo,)).fetchone()
    if row is None:
        return jsonify(valido=False, mensagem="Certificado não encontrado."), 404

    evento = db.execute("SELECT titulo, data_evento FROM eventos WHERE id = ?", (row["evento_id"],)).fetchone()
    aluno = db.execute("SELECT nome FROM usuarios WHERE id = ?", (row["usuario_id"],)).fetchone()

    hash_esperado = row["hash_verificacao"]
    hash_informado = request.args.get("hash")
    integro = (hash_informado is None) or (hash_informado.upper() == hash_esperado)

    return jsonify(
        valido=True,
        integro=integro,
        codigo=row["codigo"],
        aluno_nome=aluno["nome"] if aluno else None,
        evento_titulo=evento["titulo"] if evento else None,
        evento_data=evento["data_evento"] if evento else None,
        carga_horaria=row["carga_horaria"],
        data_emissao=row["data_emissao"],
    )
