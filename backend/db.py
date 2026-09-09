"""
Camada de acesso ao banco de dados (SQLite puro, sem ORM).

Usamos sqlite3 da biblioteca padrão do Python. A conexão é aberta uma vez
por requisição (guardada em `flask.g`) e fechada automaticamente ao final,
via `teardown_appcontext`.
"""
import sqlite3
import secrets
import string
from datetime import datetime
from pathlib import Path

from flask import g, current_app
from werkzeug.security import generate_password_hash

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "instance" / "eventos.db"
SCHEMA_PATH = BASE_DIR / "schema.sql"


def get_db():
    """Retorna a conexão SQLite da requisição atual (cria se não existir)."""
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Cria as tabelas (se não existirem) e popula dados iniciais se vazio."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.commit()

    row = conn.execute("SELECT COUNT(*) AS n FROM usuarios").fetchone()
    if row["n"] == 0:
        _seed(conn)
        conn.commit()
    conn.close()


def gerar_codigo_checkin(tamanho=6):
    alfabeto = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alfabeto) for _ in range(tamanho))


def _seed(conn):
    """Popula o banco com os mesmos dados de demonstração do protótipo
    front-end (js/data.js), para que o sistema já suba com conteúdo."""

    def add_usuario(**kw):
        kw["senha_hash"] = generate_password_hash(kw.pop("senha"))
        cols = ", ".join(kw.keys())
        placeholders = ", ".join("?" for _ in kw)
        cur = conn.execute(
            f"INSERT INTO usuarios ({cols}) VALUES ({placeholders})",
            tuple(kw.values()),
        )
        return cur.lastrowid

    admin_id = add_usuario(
        tipo="administrador", nome="Carla Menezes", identificador="ADM-045",
        email="carla.menezes@multivix.edu.br", telefone="(27) 3333-4444",
        senha="admin123", cargo="Coordenadora de Extensão e Eventos",
    )
    aluno1_id = add_usuario(
        tipo="estudante", nome="Ana Luiza Costa", identificador="2023104032",
        email="ana.costa@multivix.edu.br", telefone="(27) 99999-1111",
        senha="1234", curso="Engenharia Civil — 5º Período",
    )
    aluno2_id = add_usuario(
        tipo="estudante", nome="Bruno Silva", identificador="2022108871",
        email="bruno.silva@multivix.edu.br", telefone="(27) 99999-2222",
        senha="1234", curso="Ciência da Computação — 6º Período",
    )

    def add_evento(**kw):
        kw["codigo_checkin"] = gerar_codigo_checkin()
        kw["criado_por"] = admin_id
        cols = ", ".join(kw.keys())
        placeholders = ", ".join("?" for _ in kw)
        cur = conn.execute(
            f"INSERT INTO eventos ({cols}) VALUES ({placeholders})",
            tuple(kw.values()),
        )
        return cur.lastrowid

    ev1 = add_evento(
        titulo="Semana Acadêmica de Engenharia Civil", categoria="Semana Acadêmica",
        data_evento="2026-09-15", hora_inicio="08:00", hora_fim="18:00",
        local="Auditório Principal – Bloco A", vagas=200, vagas_ocupadas=2,
        descricao="Palestras, workshops e visitas técnicas com profissionais do setor de construção civil. Certificado de 40h.",
        status="aberto", carga_horaria=40,
    )
    ev2 = add_evento(
        titulo="Workshop de Machine Learning Aplicado", categoria="Workshop",
        data_evento="2026-09-22", hora_inicio="14:00", hora_fim="18:00",
        local="Laboratório de Informática 2", vagas=40, vagas_ocupadas=2,
        descricao="Introdução prática a modelos de machine learning com Python, voltado a alunos de Ciência da Computação e áreas afins.",
        status="encerrado", carga_horaria=8,
    )
    add_evento(
        titulo="Palestra: Carreira em Dados", categoria="Palestra",
        data_evento="2026-09-30", hora_inicio="19:00", hora_fim="21:00",
        local="Auditório Principal – Bloco A", vagas=150, vagas_ocupadas=0,
        descricao="Profissionais do mercado compartilham experiências sobre trilhas de carreira em Ciência de Dados e Engenharia de Dados.",
        status="aberto", carga_horaria=2,
    )
    add_evento(
        titulo="Minicurso de Excel Avançado", categoria="Minicurso",
        data_evento="2026-10-10", hora_inicio="08:00", hora_fim="12:00",
        local="Laboratório de Informática 1", vagas=30, vagas_ocupadas=0,
        descricao="Fórmulas avançadas, tabelas dinâmicas e automação com macros para uso acadêmico e profissional.",
        status="breve", carga_horaria=4,
    )

    def add_inscricao(usuario_id, evento_id, status="confirmada"):
        cur = conn.execute(
            "INSERT INTO inscricoes (usuario_id, evento_id, status) VALUES (?, ?, ?)",
            (usuario_id, evento_id, status),
        )
        return cur.lastrowid

    insc1 = add_inscricao(aluno1_id, ev1)
    insc2 = add_inscricao(aluno1_id, ev2)
    add_inscricao(aluno2_id, ev2)
    add_inscricao(aluno2_id, ev1)

    # Simula que aluno1 e aluno2 já fizeram check-in e tiraram certificado
    # no evento 2 (workshop já encerrado), igual ao protótipo original.
    for insc_id, usuario_id in ((insc2, aluno1_id),):
        conn.execute(
            "INSERT INTO checkins (inscricao_id, usuario_id, evento_id, metodo, codigo_utilizado) "
            "VALUES (?, ?, ?, 'codigo', 'SEED01')",
            (insc_id, usuario_id, ev2),
        )
        conn.execute(
            "UPDATE inscricoes SET certificado_emitido = 1 WHERE id = ?", (insc_id,)
        )
        conn.execute(
            "INSERT INTO certificados (inscricao_id, usuario_id, evento_id, codigo, carga_horaria, hash_verificacao, assinado_por_id) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (insc_id, usuario_id, ev2, "CERT-2026-0001", 8, "seed-hash-0001", admin_id),
        )
