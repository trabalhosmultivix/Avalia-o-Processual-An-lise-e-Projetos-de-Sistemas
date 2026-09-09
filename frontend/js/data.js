// ─── Camada de dados: agora fala de verdade com o backend Flask ────────────
// Antes os dados viviam só em memória (arrays). Agora este arquivo busca e
// envia tudo para a API via fetch(), mas mantém os MESMOS NOMES de variáveis
// e funções que o resto do app (render.js, modals.js, app.js) já esperava —
// assim o resto do front-end quase não precisou mudar.

// Usa o mesmo hostname que a página atual (localhost ou 127.0.0.1), só troca
// a porta — evita problemas de cookie de sessão por causa de host diferente.
const API_BASE = `${location.protocol}//${location.hostname}:5000/api`;

const CATEGORIAS_EVENTO = ["Semana Acadêmica", "Workshop", "Palestra", "Minicurso", "Seminário", "Visita Técnica"];

// ─── Estado em memória (cache local, alimentado pela API) ───────────────────
let currentUser = null;
let eventos = [];
let inscricoes = [];       // "minhas" (estudante) ou "todas" (admin), conforme a página
let certificados = [];     // idem
let estatisticasAdmin = { totalAlunos: 0 };

// ─── Cliente HTTP genérico ───────────────────────────────────────────────────

async function apiRequest(caminho, { method = "GET", body } = {}) {
  const resposta = await fetch(`${API_BASE}${caminho}`, {
    method,
    credentials: "include", // necessário para o cookie de sessão ir e voltar
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let dados = null;
  try {
    dados = await resposta.json();
  } catch (_e) {
    dados = null;
  }

  if (!resposta.ok) {
    if (resposta.status === 401 && typeof aoPerderSessao === "function") {
      aoPerderSessao();
    }
    const msg = (dados && dados.erro) || `Erro inesperado (HTTP ${resposta.status}).`;
    throw new Error(msg);
  }

  return dados;
}

// ─── Formatação de datas (o backend manda ISO, a tela mostra "15 Set 2026") ─

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatarDataExibicao(isoDate) {
  if (!isoDate) return "";
  const [ano, mes, dia] = isoDate.slice(0, 10).split("-").map(Number);
  if (!ano || !mes || !dia) return isoDate;
  return `${String(dia).padStart(2, "0")} ${MESES_ABREV[mes - 1]} ${ano}`;
}

// ─── Normalização: converte o JSON do backend (snake_case) no formato que
// as telas (render.js) já sabem exibir (camelCase, datas formatadas) ────────

function normalizarEvento(e) {
  return {
    id: e.id,
    titulo: e.titulo,
    categoria: e.categoria,
    data: formatarDataExibicao(e.data_evento),
    horario: `${e.hora_inicio} – ${e.hora_fim}`,
    dataISO: e.data_evento,
    horaInicio: e.hora_inicio,
    horaFim: e.hora_fim,
    local: e.local,
    vagas: e.vagas,
    vagasOcupadas: e.vagas_ocupadas,
    descricao: e.descricao,
    status: e.status,
    cargaHoraria: e.carga_horaria,
    codigoCheckin: e.codigo_checkin,             // só vem preenchido para o admin
    checkinLiberado: !!e.checkin_liberado,
  };
}

function normalizarInscricao(i) {
  return {
    id: i.id,
    usuarioId: i.usuario_id,
    eventoId: i.evento_id,
    eventoTitulo: i.evento_titulo,
    eventoData: formatarDataExibicao(i.evento_data),
    eventoLocal: i.evento_local,
    eventoHorario: i.evento_hora_inicio ? `${i.evento_hora_inicio} – ${i.evento_hora_fim}` : "",
    eventoCargaHoraria: i.evento_carga_horaria,
    data: formatarDataExibicao(i.data_inscricao),
    status: i.status,
    certificado: !!i.certificado_emitido,
    certificadoCodigo: i.certificado_codigo,
    checkinFeito: !!i.checkin_feito,
    checkinDataHora: i.checkin_data_hora,
  };
}

function normalizarCertificado(c) {
  return {
    id: c.id,
    usuarioId: c.usuario_id,
    inscricaoId: c.inscricao_id,
    eventoId: c.evento_id,
    eventoTitulo: c.evento_titulo,
    nomeAluno: c.aluno_nome,
    identificadorAluno: c.aluno_identificador,
    cargaHoraria: c.carga_horaria,
    codigo: c.codigo,
    hashVerificacao: c.hash_verificacao,
    dataEmissao: formatarDataExibicao(c.data_emissao),
  };
}

// ─── Autenticação ────────────────────────────────────────────────────────────

async function restaurarSessao() {
  try {
    const { usuario } = await apiRequest("/auth/me");
    currentUser = usuario;
    return usuario;
  } catch (_e) {
    currentUser = null;
    return null;
  }
}

async function autenticar(tipo, identificacao, senha) {
  const { usuario } = await apiRequest("/auth/login", {
    method: "POST",
    body: { tipo, identificacao, senha },
  });
  currentUser = usuario;
  return usuario;
}

async function registrar(dados) {
  const { usuario } = await apiRequest("/auth/registrar", { method: "POST", body: dados });
  currentUser = usuario;
  return usuario;
}

async function encerrarSessao() {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } finally {
    currentUser = null;
  }
}

async function solicitarRecuperacaoSenha(identificacao) {
  return apiRequest("/auth/esqueci-senha", { method: "POST", body: { identificacao } });
}

async function redefinirSenha(token, novaSenha) {
  return apiRequest("/auth/redefinir-senha", { method: "POST", body: { token, nova_senha: novaSenha } });
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

async function carregarEventos() {
  const { eventos: linhas } = await apiRequest("/eventos");
  eventos = linhas.map(normalizarEvento);
  return eventos;
}

async function criarEvento(dados) {
  return apiRequest("/eventos", { method: "POST", body: dados });
}

async function editarEvento(id, dados) {
  return apiRequest(`/eventos/${id}`, { method: "PUT", body: dados });
}

async function excluirEvento(id) {
  return apiRequest(`/eventos/${id}`, { method: "DELETE" });
}

async function obterCodigoCheckin(eventoId) {
  return apiRequest(`/eventos/${eventoId}/codigo-checkin`);
}

async function regenerarCodigoCheckin(eventoId) {
  return apiRequest(`/eventos/${eventoId}/regenerar-codigo-checkin`, { method: "POST" });
}

async function alternarCheckin(eventoId) {
  return apiRequest(`/eventos/${eventoId}/alternar-checkin`, { method: "POST" });
}

// ─── Inscrições ───────────────────────────────────────────────────────────────

async function carregarMinhasInscricoes() {
  const { inscricoes: linhas } = await apiRequest("/inscricoes/minhas");
  inscricoes = linhas.map(normalizarInscricao);
  return inscricoes;
}

async function carregarTodasInscricoes() {
  const { inscricoes: linhas } = await apiRequest("/inscricoes");
  inscricoes = linhas.map(normalizarInscricao);
  return inscricoes;
}

async function inscreverEmEvento(eventoId) {
  return apiRequest(`/eventos/${eventoId}/inscrever`, { method: "POST" });
}

async function cancelarInscricao(inscricaoId) {
  return apiRequest(`/inscricoes/${inscricaoId}`, { method: "DELETE" });
}

async function fazerCheckin(eventoId, codigo) {
  return apiRequest(`/eventos/${eventoId}/checkin`, { method: "POST", body: { codigo } });
}

// Usado pelas telas (mesma assinatura de antes: eventoId, usuarioId) — como o
// cache `inscricoes` já vem filtrado para o usuário logado, o 2º parâmetro
// não é mais necessário, mas foi mantido para não quebrar quem já chamava.
function buscarInscricaoAtiva(eventoId, _usuarioId) {
  return inscricoes.find((i) => i.eventoId === eventoId && i.status !== "cancelada");
}

function inscricoesDoUsuario(_usuarioId) {
  return inscricoes;
}

// ─── Certificados ─────────────────────────────────────────────────────────────

async function carregarMeusCertificados() {
  const { certificados: linhas } = await apiRequest("/certificados/meus");
  certificados = linhas.map(normalizarCertificado);
  return certificados;
}

async function carregarCertificadosAdmin() {
  const { certificados: linhas } = await apiRequest("/certificados");
  certificados = linhas.map(normalizarCertificado);
  return certificados;
}

function certificadosDoUsuario(_usuarioId) {
  return certificados;
}

async function emitirCertificado(inscricaoId) {
  const { certificado } = await apiRequest(`/inscricoes/${inscricaoId}/certificado`, { method: "POST" });
  return normalizarCertificado(certificado);
}

function urlDownloadCertificado(codigo) {
  return `${API_BASE}/certificados/${codigo}/pdf`;
}

function baixarCertificado(codigo) {
  // GET simples com o cookie de sessão — o navegador cuida do download.
  window.open(urlDownloadCertificado(codigo), "_blank");
}

// ─── Estatísticas (Administrador) ────────────────────────────────────────────

async function carregarEstatisticasAdmin() {
  const { total_alunos } = await apiRequest("/admin/estatisticas");
  estatisticasAdmin = { totalAlunos: total_alunos };
  return estatisticasAdmin;
}

// ─── Perfil ───────────────────────────────────────────────────────────────────

async function atualizarPerfil(dados) {
  const { usuario } = await apiRequest("/perfil", { method: "PUT", body: dados });
  currentUser = usuario;
  return usuario;
}
