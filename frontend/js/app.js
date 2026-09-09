// ─── Configuração de navegação por perfil ────────────────────────────────────
// O conteúdo disponível para Administrador e Estudante é distinto: cada perfil
// só enxerga os itens da sua própria lista de navegação.

const NAV_ESTUDANTE = [
  { page: "dashboard", icon: "⊞", label: "Dashboard" },
  { page: "eventos", icon: "◈", label: "Eventos" },
  { page: "inscricoes", icon: "✦", label: "Minhas Inscrições" },
  { page: "certificados", icon: "◉", label: "Certificados" },
  { page: "apoio", icon: "❔", label: "Apoio" },
  { page: "perfil", icon: "◍", label: "Perfil" },
];

const NAV_ADMIN = [
  { page: "admin-relatorio", icon: "⊟", label: "Relatório / Dashboard" },
  { page: "admin-eventos", icon: "⚙", label: "Eventos" },
  { page: "admin-certificados", icon: "◉", label: "Certificados Gerados" },
  { page: "perfil", icon: "◍", label: "Perfil" },
];

const PAGINAS = {
  dashboard: renderDashboard,
  eventos: renderEventos,
  inscricoes: renderInscricoes,
  certificados: renderCertificados,
  apoio: renderApoio,
  perfil: renderPerfil,
  "admin-relatorio": renderRelatorios,
  "admin-eventos": renderAdmin,
  "admin-certificados": renderCertificadosAdmin,
};

const TITULOS_TOPBAR = {
  dashboard: "Sistema de Gestão de Eventos e Inscrições Acadêmicas",
  eventos: "Sistema de Gestão de Eventos e Inscrições Acadêmicas",
  inscricoes: "Sistema de Gestão de Eventos e Inscrições Acadêmicas",
  certificados: "Sistema de Gestão de Eventos e Inscrições Acadêmicas",
  apoio: "Sistema de Gestão de Eventos e Inscrições Acadêmicas",
  perfil: "Sistema de Gestão de Eventos e Inscrições Acadêmicas",
  "admin-relatorio": "Painel Administrativo — Eventos Acadêmicos",
  "admin-eventos": "Painel Administrativo — Eventos Acadêmicos",
  "admin-certificados": "Painel Administrativo — Eventos Acadêmicos",
};

// ─── Referências DOM ──────────────────────────────────────────────────────────

const loginScreen = document.getElementById("login-screen");
const loginCard = document.getElementById("login-card");
const appScreen = document.getElementById("app-screen");
const content = document.getElementById("content");
const sidebarNav = document.getElementById("sidebar-nav");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const topbarTitle = document.getElementById("topbar-title");
const userAvatarEl = document.getElementById("user-avatar");
const userNameEl = document.getElementById("user-name");
const userRoleEl = document.getElementById("user-role");

let currentPage = "dashboard";
let loginTipoSelecionado = null;

// ─── Tela de login ────────────────────────────────────────────────────────────

function mostrarSelecaoDeTipo() {
  loginTipoSelecionado = null;
  loginCard.innerHTML = renderLoginSelecaoTipo();

  document.getElementById("btn-tipo-estudante").addEventListener("click", () => mostrarFormLogin("estudante"));
  document.getElementById("btn-tipo-admin").addEventListener("click", () => mostrarFormLogin("administrador"));
}

function mostrarFormLogin(tipo, erro) {
  loginTipoSelecionado = tipo;
  loginCard.innerHTML = renderLoginForm(tipo, erro);

  document.getElementById("btn-login-voltar").addEventListener("click", mostrarSelecaoDeTipo);
  document.getElementById("btn-login-entrar").addEventListener("click", () => tentarLogin(tipo));
  document.getElementById("btn-ir-cadastro").addEventListener("click", () => mostrarFormCadastro(tipo));

  const senhaInput = document.getElementById("login-senha");
  senhaInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tentarLogin(tipo);
  });
}

async function tentarLogin(tipo) {
  const identificacao = document.getElementById("login-identificacao").value;
  const senha = document.getElementById("login-senha").value;

  if (!identificacao.trim() || !senha) {
    mostrarFormLogin(tipo, "Preencha e-mail/identificação e senha para continuar.");
    return;
  }

  const botao = document.getElementById("btn-login-entrar");
  botao.disabled = true;
  botao.textContent = "Entrando...";

  try {
    await autenticar(tipo, identificacao, senha);
    await entrarNoSistema();
  } catch (err) {
    mostrarFormLogin(tipo, err.message);
  }
}

// ─── Cadastro de novo perfil ──────────────────────────────────────────────────

function mostrarFormCadastro(tipo, erro) {
  loginCard.innerHTML = renderCadastroForm(tipo, erro);

  document.getElementById("btn-cadastro-voltar").addEventListener("click", () => mostrarFormLogin(tipo));
  document.getElementById("btn-cadastro-enviar").addEventListener("click", () => tentarCadastro(tipo));
}

async function tentarCadastro(tipo) {
  const dados = {
    tipo,
    nome: document.getElementById("c-nome").value.trim(),
    identificador: document.getElementById("c-identificador").value.trim(),
    email: document.getElementById("c-email").value.trim(),
    telefone: document.getElementById("c-telefone").value.trim(),
    senha: document.getElementById("c-senha").value,
  };
  if (tipo === "estudante") dados.curso = document.getElementById("c-curso-cargo").value.trim();
  else dados.cargo = document.getElementById("c-curso-cargo").value.trim();

  const botao = document.getElementById("btn-cadastro-enviar");
  botao.disabled = true;
  botao.textContent = "Criando...";

  try {
    await registrar(dados);
    await entrarNoSistema();
  } catch (err) {
    mostrarFormCadastro(tipo, err.message);
  }
}

// ─── Entrada / saída do sistema ───────────────────────────────────────────────

async function entrarNoSistema() {
  loginScreen.style.display = "none";
  appScreen.style.display = "flex";

  atualizarSidebarUsuario();
  montarNavegacao();

  const paginaInicial = currentUser.tipo === "administrador" ? "admin-relatorio" : "dashboard";
  await goto(paginaInicial);
}

async function fazerLogout() {
  try {
    await encerrarSessao();
  } catch (_e) {
    // mesmo se der erro de rede, seguimos limpando a tela local
  }
  filtroBusca = "";
  filtroInscricao = "todas";
  buscaCertificadoAdmin = "";
  closeModal();
  appScreen.style.display = "none";
  loginScreen.style.display = "flex";
  mostrarSelecaoDeTipo();
}

// Chamado pelo data.js quando qualquer requisição volta 401 (sessão expirou/caiu).
function aoPerderSessao() {
  if (loginScreen.style.display === "flex") return; // já está na tela de login
  currentUser = null;
  appScreen.style.display = "none";
  loginScreen.style.display = "flex";
  mostrarFormLogin(loginTipoSelecionado || "estudante", "Sua sessão expirou. Faça login novamente.");
}

// ─── Sidebar dinâmica (varia conforme o perfil logado) ───────────────────────

function navAtual() {
  return currentUser && currentUser.tipo === "administrador" ? NAV_ADMIN : NAV_ESTUDANTE;
}

function montarNavegacao() {
  const itens = navAtual();
  sidebarNav.innerHTML = itens
    .map(
      (item) => `
        <button class="nav-item" data-page="${item.page}">
          <span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>
        </button>
      `
    )
    .join("");

  sidebarNav.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => goto(btn.dataset.page));
  });
}

function atualizarSidebarUsuario() {
  userAvatarEl.textContent = iniciais(currentUser.nome);
  userNameEl.textContent = currentUser.nome;
  userRoleEl.textContent = currentUser.tipo === "administrador" ? currentUser.cargo : currentUser.curso;
}

// ─── Roteamento ───────────────────────────────────────────────────────────────

function paginaPermitida(pagina) {
  return navAtual().some((item) => item.page === pagina);
}

// Busca os dados de que cada página precisa antes de renderizar. Isso é
// chamado sempre que se navega para a página (skipFetch=false); ao só
// refiltrar uma lista já carregada (busca/filtro locais), passamos
// skipFetch=true para não bater na API de novo.
async function carregarDadosDaPagina(pagina) {
  if (pagina === "dashboard") {
    await Promise.all([carregarEventos(), carregarMinhasInscricoes(), carregarMeusCertificados()]);
  } else if (pagina === "eventos") {
    await Promise.all([carregarEventos(), carregarMinhasInscricoes()]);
  } else if (pagina === "inscricoes") {
    await carregarMinhasInscricoes();
  } else if (pagina === "certificados") {
    await carregarMeusCertificados();
  } else if (pagina === "admin-relatorio") {
    await Promise.all([carregarEventos(), carregarCertificadosAdmin(), carregarEstatisticasAdmin()]);
  } else if (pagina === "admin-eventos") {
    await carregarEventos();
  } else if (pagina === "admin-certificados") {
    await carregarCertificadosAdmin();
  }
}

async function goto(pagina, opcoes = {}) {
  if (!currentUser || !paginaPermitida(pagina) || !PAGINAS[pagina]) return;

  currentPage = pagina;
  topbarTitle.textContent = TITULOS_TOPBAR[pagina] || "Sistema de Gestão de Eventos e Inscrições Acadêmicas";
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pagina);
  });

  if (!opcoes.skipFetch) {
    content.innerHTML = `<div class="page"><div style="padding:60px; text-align:center; color:#9E9E9E;">Carregando...</div></div>`;
    try {
      await carregarDadosDaPagina(pagina);
    } catch (err) {
      content.innerHTML = `<div class="page"><div class="form-error" style="margin:40px auto; max-width:480px;">${escapeHtml(err.message)}</div></div>`;
      return;
    }
  }

  content.innerHTML = PAGINAS[pagina]();
  ligarEventosDaPagina(pagina);
}

// Liga os event listeners específicos de cada página, já que o HTML é
// recriado a cada navegação (innerHTML).
function ligarEventosDaPagina(pagina) {
  content.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => goto(btn.dataset.goto));
  });

  if (pagina === "eventos") {
    const busca = document.getElementById("busca-eventos");
    if (busca) {
      busca.addEventListener("input", (e) => {
        filtroBusca = e.target.value;
        goto("eventos", { skipFetch: true });
        const novoInput = document.getElementById("busca-eventos");
        novoInput.focus();
        novoInput.selectionStart = novoInput.selectionEnd = novoInput.value.length;
      });
    }
    content.querySelectorAll("[data-inscrever]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const evento = eventos.find((e) => e.id === Number(btn.dataset.inscrever));
        if (evento) abrirModalInscricao(evento);
      });
    });
  }

  if (pagina === "inscricoes") {
    content.querySelectorAll("[data-filtro-inscricao]").forEach((btn) => {
      btn.addEventListener("click", () => {
        filtroInscricao = btn.dataset.filtroInscricao;
        goto("inscricoes", { skipFetch: true });
      });
    });
    content.querySelectorAll("[data-fazer-checkin]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const insc = inscricoes.find((i) => i.id === Number(btn.dataset.fazerCheckin));
        if (insc) abrirModalCheckin(insc);
      });
    });
    content.querySelectorAll("[data-emitir-certificado]").forEach((btn) => {
      btn.addEventListener("click", () => tentarEmitirCertificado(Number(btn.dataset.emitirCertificado), btn));
    });
    content.querySelectorAll("[data-baixar-certificado]").forEach((btn) => {
      btn.addEventListener("click", () => baixarCertificado(btn.dataset.baixarCertificado));
    });
    content.querySelectorAll("[data-cancelar-inscricao]").forEach((btn) => {
      btn.addEventListener("click", () => tentarCancelarInscricao(Number(btn.dataset.cancelarInscricao)));
    });
  }

  if (pagina === "certificados") {
    content.querySelectorAll("[data-baixar-certificado]").forEach((btn) => {
      btn.addEventListener("click", () => baixarCertificado(btn.dataset.baixarCertificado));
    });
  }

  if (pagina === "perfil") {
    document.getElementById("btn-esqueci-senha").addEventListener("click", abrirModalEsqueciSenha);
    document.getElementById("btn-sair").addEventListener("click", fazerLogout);
  }

  if (pagina === "admin-eventos") {
    document.getElementById("btn-novo-evento").addEventListener("click", () => abrirFormEvento(null));

    content.querySelectorAll("[data-editar-evento]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const evento = eventos.find((e) => e.id === Number(btn.dataset.editarEvento));
        if (evento) abrirFormEvento(evento);
      });
    });

    content.querySelectorAll("[data-excluir-evento]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const evento = eventos.find((e) => e.id === Number(btn.dataset.excluirEvento));
        if (evento) abrirConfirmarExclusao(evento);
      });
    });

    content.querySelectorAll("[data-codigo-checkin]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const evento = eventos.find((e) => e.id === Number(btn.dataset.codigoCheckin));
        if (evento) abrirModalCodigoCheckin(evento);
      });
    });
  }

  if (pagina === "admin-certificados") {
    const busca = document.getElementById("busca-certificado-admin");
    if (busca) {
      busca.addEventListener("input", (e) => {
        buscaCertificadoAdmin = e.target.value;
        goto("admin-certificados", { skipFetch: true });
        const novoInput = document.getElementById("busca-certificado-admin");
        novoInput.focus();
        novoInput.selectionStart = novoInput.selectionEnd = novoInput.value.length;
      });
    }
    content.querySelectorAll("[data-baixar-certificado]").forEach((btn) => {
      btn.addEventListener("click", () => baixarCertificado(btn.dataset.baixarCertificado));
    });
  }
}

// ─── Ações de inscrição / check-in / certificado (usadas por render+modal) ──

async function tentarCancelarInscricao(inscricaoId) {
  if (!confirm("Tem certeza que deseja cancelar esta inscrição?")) return;
  try {
    await cancelarInscricao(inscricaoId);
    await goto("inscricoes");
  } catch (err) {
    alert(err.message);
  }
}

async function tentarEmitirCertificado(inscricaoId, botao) {
  const textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = "Emitindo...";
  try {
    await emitirCertificado(inscricaoId);
    await goto("inscricoes");
  } catch (err) {
    alert(err.message);
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

// ─── Sidebar: colapsar/expandir e logout rápido ──────────────────────────────

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  sidebarToggle.textContent = sidebar.classList.contains("collapsed") ? "›" : "‹";
});

document.getElementById("sidebar-user").addEventListener("click", () => goto("perfil"));
document.getElementById("btn-sidebar-logout").addEventListener("click", (e) => {
  e.stopPropagation();
  fazerLogout();
});

// ─── Inicialização ────────────────────────────────────────────────────────────
// Tenta restaurar a sessão (cookie de login) antes de mostrar a tela de
// seleção de tipo — é assim que o "F5" não derruba mais o usuário logado.

(async function iniciar() {
  mostrarSelecaoDeTipo();
  loginCard.innerHTML = `<div style="padding:60px 20px; text-align:center; color:#9E9E9E;">Carregando...</div>`;
  const usuario = await restaurarSessao();
  if (usuario) {
    await entrarNoSistema();
  } else {
    mostrarSelecaoDeTipo();
  }
})();
