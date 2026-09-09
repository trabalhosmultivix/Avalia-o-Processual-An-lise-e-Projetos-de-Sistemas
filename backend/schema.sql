-- ─────────────────────────────────────────────────────────────────────────
-- Sistema de Gestão de Eventos e Inscrições Acadêmicas — Faculdade Multivix
-- Esquema do banco de dados (SQLite)
-- ─────────────────────────────────────────────────────────────────────────

PRAGMA foreign_keys = ON;

-- ─── Usuários (login / perfil) ─────────────────────────────────────────────
-- "tipo" define o perfil de acesso: 'estudante' ou 'administrador'.
-- A senha NUNCA é gravada em texto puro: guardamos apenas o hash (werkzeug).
CREATE TABLE IF NOT EXISTS usuarios (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo            TEXT NOT NULL CHECK (tipo IN ('estudante', 'administrador')),
    nome            TEXT NOT NULL,
    identificador   TEXT NOT NULL UNIQUE,   -- matrícula (estudante) ou ID administrador
    email           TEXT NOT NULL UNIQUE,
    telefone        TEXT,
    senha_hash      TEXT NOT NULL,
    curso           TEXT,                   -- preenchido quando tipo = 'estudante'
    cargo           TEXT,                   -- preenchido quando tipo = 'administrador'
    criado_em       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Eventos ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo              TEXT NOT NULL,
    categoria           TEXT NOT NULL,
    data_evento         TEXT NOT NULL,      -- formato ISO: 'YYYY-MM-DD'
    hora_inicio         TEXT NOT NULL,      -- 'HH:MM'
    hora_fim            TEXT NOT NULL,      -- 'HH:MM'
    local               TEXT NOT NULL,
    vagas               INTEGER NOT NULL DEFAULT 0,
    vagas_ocupadas      INTEGER NOT NULL DEFAULT 0,
    descricao           TEXT,
    status              TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'breve', 'encerrado')),
    carga_horaria       INTEGER NOT NULL DEFAULT 0,
    codigo_checkin      TEXT NOT NULL,       -- código exibido/projetado no dia do evento
    checkin_liberado    INTEGER NOT NULL DEFAULT 0,  -- 1 = admin abriu manualmente o check-in
    criado_por          INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    criado_em           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Inscrições ─────────────────────────────────────────────────────────────
-- Regra de negócio: um usuário não pode ter mais de UMA inscrição ATIVA
-- (status != 'cancelada') no mesmo evento. Isso é garantido tanto na
-- aplicação quanto por um índice único parcial no banco (defesa em profundidade).
CREATE TABLE IF NOT EXISTS inscricoes (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id          INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    evento_id           INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    data_inscricao      TEXT NOT NULL DEFAULT (datetime('now')),
    status              TEXT NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada', 'pendente', 'cancelada')),
    certificado_emitido INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inscricao_unica_ativa
    ON inscricoes (usuario_id, evento_id)
    WHERE status != 'cancelada';

-- ─── Check-ins ──────────────────────────────────────────────────────────────
-- Um check-in por inscrição (garante que não seja feito duas vezes).
CREATE TABLE IF NOT EXISTS checkins (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    inscricao_id        INTEGER NOT NULL UNIQUE REFERENCES inscricoes(id) ON DELETE CASCADE,
    usuario_id          INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    evento_id           INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    data_hora           TEXT NOT NULL DEFAULT (datetime('now')),
    metodo              TEXT NOT NULL DEFAULT 'codigo' CHECK (metodo IN ('codigo', 'manual-admin')),
    codigo_utilizado    TEXT
);

-- ─── Certificados ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificados (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    inscricao_id        INTEGER NOT NULL UNIQUE REFERENCES inscricoes(id) ON DELETE CASCADE,
    usuario_id          INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    evento_id           INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    codigo              TEXT NOT NULL UNIQUE,   -- ex.: CERT-2026-0001
    carga_horaria       INTEGER NOT NULL,       -- snapshot no momento da emissão
    hash_verificacao    TEXT NOT NULL,          -- garante integridade/autenticidade
    assinado_por_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_emissao        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Tokens de redefinição de senha ("Esqueci minha senha") ────────────────
CREATE TABLE IF NOT EXISTS reset_tokens (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id          INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token               TEXT NOT NULL UNIQUE,
    criado_em           TEXT NOT NULL DEFAULT (datetime('now')),
    expira_em           TEXT NOT NULL,
    usado               INTEGER NOT NULL DEFAULT 0
);
