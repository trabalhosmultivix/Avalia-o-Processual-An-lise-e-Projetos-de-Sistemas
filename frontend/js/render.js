// ─── Helpers de formatação / componentes ─────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function statusBadge(status) {
  const map = { aberto: "Inscrições abertas", breve: "Em breve", encerrado: "Encerrado" };
  return `<span class="badge badge-${status}">${map[status] ?? status}</span>`;
}

function inscricaoBadge(status) {
  const map = { confirmada: "Confirmada", pendente: "Pendente", cancelada: "Cancelada" };
  return `<span class="badge badge-${status}">${map[status] ?? status}</span>`;
}

function vagasBar(vagas, ocupadas) {
  const pct = vagas > 0 ? Math.min(100, Math.round((ocupadas / vagas) * 100)) : 0;
  const cor = pct >= 100 ? "#9E9E9E" : "#CC0000";
  return `
    <div class="vagas-bar-track"><div class="vagas-bar-fill" style="width:${pct}%; background:${cor};"></div></div>
    <div class="vagas-bar-label">${ocupadas}/${vagas} vagas preenchidas</div>
  `;
}

function iniciais(nome) {
  return (nome || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

// ─── Tela de Login ─────────────────────────────────────────────────────────────

function renderLoginSelecaoTipo() {
  return `
    <div class="login-logo">
      <div class="logo-mark">EA</div>
      <span class="login-logo-text">Eventos Acadêmicos</span>
    </div>
    <h1 class="login-title">Bem-vindo(a)</h1>
    <p class="login-subtitle">Selecione o tipo de acesso para continuar.</p>

    <div class="login-tipo-grid">
      <button class="login-tipo-card" id="btn-tipo-estudante">
        <span class="login-tipo-icon">🎓</span>
        <span class="login-tipo-label">Estudante</span>
        <span class="login-tipo-desc">Inscrições, certificados e acompanhamento de eventos</span>
      </button>
      <button class="login-tipo-card" id="btn-tipo-admin">
        <span class="login-tipo-icon">🛠</span>
        <span class="login-tipo-label">Administrador</span>
        <span class="login-tipo-desc">Gestão de eventos, certificados e relatórios</span>
      </button>
    </div>
  `;
}

function renderLoginForm(tipo, erro) {
  const isAdmin = tipo === "administrador";
  const label = isAdmin ? "Administrador" : "Estudante";
  const placeholderId = isAdmin ? "Ex.: ADM-045" : "Ex.: 2023104032";
  const dica = isAdmin
    ? "Demonstração: carla.menezes@multivix.edu.br / admin123"
    : "Demonstração: ana.costa@multivix.edu.br / 1234";

  return `
    <div class="login-logo">
      <div class="logo-mark">EA</div>
      <span class="login-logo-text">Eventos Acadêmicos</span>
    </div>

    <button class="login-back" id="btn-login-voltar">‹ Trocar tipo de acesso</button>

    <h1 class="login-title">Acesso do ${label}</h1>
    <p class="login-subtitle">Entre com seu e-mail ou ${isAdmin ? "ID de administrador" : "matrícula"} institucional.</p>

    <div id="login-erro">${erro ? `<div class="form-error">${escapeHtml(erro)}</div>` : ""}</div>

    <div class="form-field">
      <label>E-mail ou ${isAdmin ? "ID de administrador" : "Matrícula"}</label>
      <input id="login-identificacao" type="text" placeholder="${isAdmin ? "seuemail@multivix.edu.br ou " + placeholderId : "seuemail@multivix.edu.br ou " + placeholderId}" />
    </div>

    <div class="form-field">
      <label>Senha</label>
      <input id="login-senha" type="password" placeholder="••••••••" />
    </div>

    <button class="btn btn-accent btn-block" id="btn-login-entrar">Entrar como ${label}</button>

    <div class="login-hint">${dica}</div>

    <button class="link-btn" id="btn-ir-cadastro" style="width:100%; text-align:center; margin-top:16px;">Ainda não tem conta? Criar cadastro</button>
  `;
}

// ─── Tela de Cadastro (criar novo perfil) ────────────────────────────────────

function renderCadastroForm(tipo, erro) {
  const isAdmin = tipo === "administrador";
  const label = isAdmin ? "Administrador" : "Estudante";

  return `
    <div class="login-logo">
      <div class="logo-mark">EA</div>
      <span class="login-logo-text">Eventos Acadêmicos</span>
    </div>

    <button class="login-back" id="btn-cadastro-voltar">‹ Voltar para o login</button>

    <h1 class="login-title">Criar cadastro (${label})</h1>
    <p class="login-subtitle">Preencha seus dados para criar seu perfil no sistema.</p>

    <div id="cadastro-erro">${erro ? `<div class="form-error">${escapeHtml(erro)}</div>` : ""}</div>

    <div class="form-field">
      <label>Nome completo</label>
      <input id="c-nome" type="text" placeholder="Seu nome completo" />
    </div>

    <div class="form-row cols-2">
      <div class="form-field">
        <label>${isAdmin ? "ID de administrador" : "Matrícula"}</label>
        <input id="c-identificador" type="text" placeholder="${isAdmin ? "Ex.: ADM-045" : "Ex.: 2023104032"}" />
      </div>
      <div class="form-field">
        <label>Telefone</label>
        <input id="c-telefone" type="text" placeholder="(27) 90000-0000" />
      </div>
    </div>

    <div class="form-field">
      <label>E-mail institucional</label>
      <input id="c-email" type="text" placeholder="seuemail@multivix.edu.br" />
    </div>

    <div class="form-field">
      <label>${isAdmin ? "Cargo" : "Curso / Período"}</label>
      <input id="c-curso-cargo" type="text" placeholder="${isAdmin ? "Ex.: Coordenador de Eventos" : "Ex.: Engenharia Civil — 5º Período"}" />
    </div>

    <div class="form-field">
      <label>Senha</label>
      <input id="c-senha" type="password" placeholder="Mínimo 4 caracteres" />
    </div>

    <button class="btn btn-accent btn-block" id="btn-cadastro-enviar">Criar conta e entrar</button>
  `;
}

// ─── Dashboard (Estudante) ────────────────────────────────────────────────────

function renderDashboard() {
  const minhas = inscricoesDoUsuario(currentUser.id);
  const confirmadas = minhas.filter((i) => i.status === "confirmada");
  const abertos = eventos.filter((e) => e.status === "aberto").length;
  const proximos = eventos.filter((e) => e.status === "aberto" || e.status === "breve").slice(0, 3);
  const cargaAcumulada = eventos
    .filter((e) => confirmadas.find((i) => i.eventoId === e.id))
    .reduce((a, e) => a + e.cargaHoraria, 0);
  const meusCertificados = certificadosDoUsuario(currentUser.id);

  const stats = [
    { label: "Eventos Ativos", value: abertos, sub: "neste semestre", accent: true },
    { label: "Eventos Participados", value: confirmadas.length, sub: "inscrições confirmadas", accent: false },
    { label: "Minhas Inscrições", value: minhas.length, sub: "no total", accent: false },
    { label: "Certificados Disponíveis", value: meusCertificados.length, sub: "para download", accent: false },
  ];

  const primeiroNome = currentUser.nome.split(" ")[0];
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return `
    <div class="page">
      <div class="page-header">
        <h1>Bom dia, ${escapeHtml(primeiroNome)} 👋</h1>
        <p>Aqui está um resumo da sua atividade acadêmica — ${hoje}.</p>
      </div>

      <div class="stats-grid">
        ${stats.map((s) => `
          <div class="stat-card ${s.accent ? "accent" : ""}">
            <div class="stat-value">${s.value}</div>
            <div class="stat-label">${s.label}</div>
            <div class="stat-sub">${s.sub}</div>
          </div>
        `).join("")}
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <h2>Próximos Eventos</h2>
            <button class="link-btn" data-goto="eventos">Ver todos →</button>
          </div>
          <div>
            ${proximos.map((ev) => `
              <div class="evento-row">
                <div class="evento-date-box">
                  <span class="day">${ev.data.split(" ")[0]}</span>
                  <span class="month">${ev.data.split(" ")[1]}</span>
                </div>
                <div style="flex:1; min-width:0;">
                  <div class="evento-row-title">${escapeHtml(ev.titulo)}</div>
                  <div class="evento-row-local">${escapeHtml(ev.local)}</div>
                  <div style="margin-top:8px;">${vagasBar(ev.vagas, ev.vagasOcupadas)}</div>
                </div>
                ${statusBadge(ev.status)}
              </div>
            `).join("") || `<div class="evento-row">Nenhum evento próximo.</div>`}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2>Eventos Participados</h2>
            <button class="link-btn" data-goto="inscricoes">Ver todas →</button>
          </div>
          <div>
            ${minhas.map((ins) => `
              <div class="inscricao-row" style="flex-direction:column; align-items:stretch; gap:4px;">
                <div class="evento-row-title">${escapeHtml(ins.eventoTitulo)}</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:11px; color:#9E9E9E;">Inscrito em ${escapeHtml(ins.data)}</span>
                  ${inscricaoBadge(ins.status)}
                </div>
              </div>
            `).join("") || `<div style="padding:24px; text-align:center; color:#9E9E9E; font-size:13px;">Você ainda não tem inscrições.</div>`}
          </div>
          <div class="card-footer">
            Carga horária acumulada: <strong style="color:#111;">${cargaAcumulada}h</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Eventos (listagem para inscrição — Estudante) ───────────────────────────

let filtroBusca = "";

function renderEventos() {
  const filtrados = eventos.filter((ev) =>
    ev.titulo.toLowerCase().includes(filtroBusca.toLowerCase()) ||
    ev.categoria.toLowerCase().includes(filtroBusca.toLowerCase())
  );

  return `
    <div class="page">
      <div class="page-header">
        <h1>Eventos</h1>
        <p>Explore e inscreva-se nos eventos disponíveis para o semestre 2026/2.</p>
      </div>

      <div class="eventos-toolbar">
        <input class="search-input" id="busca-eventos" type="text" placeholder="Buscar eventos..." value="${escapeHtml(filtroBusca)}" />
      </div>

      <div class="eventos-list">
        ${filtrados.map((ev) => {
          const jaInscrito = !!buscarInscricaoAtiva(ev.id, currentUser.id);
          const esgotado = ev.vagasOcupadas >= ev.vagas;
          let textoBotao = "Inscrever-se";
          if (jaInscrito) textoBotao = "Já inscrito ✓";
          else if (esgotado) textoBotao = "Vagas esgotadas";
          else if (ev.status !== "aberto") textoBotao = "Indisponível";

          return `
          <div class="evento-card">
            <div style="flex:1;">
              <h3 class="evento-card-title">${escapeHtml(ev.titulo)}</h3>
              <div class="evento-card-meta">${escapeHtml(ev.categoria)} · ${escapeHtml(ev.data)} · ${escapeHtml(ev.horario)} · ${escapeHtml(ev.local)}</div>
              <div class="evento-card-desc">${escapeHtml(ev.descricao)}</div>
            </div>
            <div class="evento-card-side">
              ${jaInscrito ? '<span class="badge badge-confirmada">Inscrito</span>' : statusBadge(ev.status)}
              <div style="width:140px;">${vagasBar(ev.vagas, ev.vagasOcupadas)}</div>
              <button
                class="btn ${jaInscrito ? "btn-outline" : "btn-accent"}"
                data-inscrever="${ev.id}"
                ${jaInscrito || esgotado || ev.status !== "aberto" ? "disabled" : ""}
              >
                ${textoBotao}
              </button>
            </div>
          </div>
        `;
        }).join("") || `<div class="empty-state"><div class="empty-title">Nenhum evento encontrado</div></div>`}
      </div>
    </div>
  `;
}

// ─── Minhas Inscrições (Estudante) ────────────────────────────────────────────

let filtroInscricao = "todas";

function renderInscricoes() {
  const filtros = [
    { id: "todas", label: "Todas" },
    { id: "confirmada", label: "Confirmadas" },
    { id: "pendente", label: "Pendentes" },
    { id: "cancelada", label: "Canceladas" },
  ];
  const minhas = inscricoesDoUsuario(currentUser.id);
  const filtradas = minhas.filter((i) => filtroInscricao === "todas" || i.status === filtroInscricao);

  return `
    <div class="page narrow">
      <div class="page-header">
        <h1>Minhas Inscrições</h1>
        <p>Acompanhe o status das suas inscrições em eventos acadêmicos.</p>
      </div>

      <div class="filter-chips">
        ${filtros.map((f) => `<button class="chip ${filtroInscricao === f.id ? "active" : ""}" data-filtro-inscricao="${f.id}">${f.label}</button>`).join("")}
      </div>

      <div class="card">
        ${filtradas.map((ins, i) => `
          <div class="inscricao-row" style="flex-direction:column; align-items:stretch; gap:10px; ${i < filtradas.length - 1 ? "" : "border-bottom:none;"}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
              <div style="flex:1;">
                <div class="evento-row-title">${escapeHtml(ins.eventoTitulo)}</div>
                <div class="evento-row-local">Inscrito em ${escapeHtml(ins.data)} · ${escapeHtml(ins.eventoData)}${ins.eventoLocal ? " · " + escapeHtml(ins.eventoLocal) : ""}</div>
                ${ins.checkinFeito ? `<div style="font-size:11px; color:#2E7D32; margin-top:4px;">✓ Check-in realizado</div>` : ""}
              </div>
              ${inscricaoBadge(ins.status)}
            </div>
            ${_acoesInscricao(ins)}
          </div>
        `).join("") || `<div style="padding:32px; text-align:center; color:#9E9E9E; font-size:13px;">Nenhuma inscrição encontrada.</div>`}
      </div>
    </div>
  `;
}

// Botões de ação por inscrição: check-in → emitir certificado → baixar PDF,
// mais o cancelamento (só quando ainda faz sentido cancelar).
function _acoesInscricao(ins) {
  const acoes = [];

  if (ins.status === "confirmada") {
    if (!ins.checkinFeito) {
      acoes.push(`<button class="btn btn-outline" data-fazer-checkin="${ins.id}">Fazer check-in</button>`);
      acoes.push(`<button class="btn btn-outline" data-cancelar-inscricao="${ins.id}">Cancelar inscrição</button>`);
    } else if (!ins.certificado) {
      acoes.push(`<button class="btn btn-primary" data-emitir-certificado="${ins.id}">Emitir certificado</button>`);
    } else {
      acoes.push(`<button class="btn btn-primary" data-baixar-certificado="${ins.certificadoCodigo}">Baixar certificado (PDF)</button>`);
    }
  }

  if (!acoes.length) return "";
  return `<div style="display:flex; gap:8px; flex-wrap:wrap;">${acoes.join("")}</div>`;
}

// ─── Certificados (Estudante) ─────────────────────────────────────────────────

function renderCertificados() {
  const meus = certificadosDoUsuario(currentUser.id);

  return `
    <div class="page narrow">
      <div class="page-header">
        <h1>Certificados</h1>
        <p>Seus certificados de participação em eventos acadêmicos.</p>
      </div>
      ${meus.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">◉</div>
          <div class="empty-title">Nenhum certificado disponível</div>
          <div class="empty-desc">Os certificados ficam disponíveis após a conclusão dos eventos e confirmação de presença. Participe dos eventos inscritos para liberar seus certificados.</div>
        </div>
      ` : `
        <div class="card">
          ${meus.map((c, i) => `
            <div class="inscricao-row" style="${i < meus.length - 1 ? "" : "border-bottom:none;"}">
              <div style="flex:1;">
                <div class="evento-row-title">${escapeHtml(c.eventoTitulo)}</div>
                <div class="evento-row-local">Emitido em ${escapeHtml(c.dataEmissao)} · ${c.cargaHoraria}h · Código ${escapeHtml(c.codigo)}</div>
              </div>
              <button class="btn btn-outline" data-baixar-certificado="${escapeHtml(c.codigo)}">Baixar PDF</button>
            </div>
          `).join("")}
        </div>
      `}
    </div>
  `;
}

// ─── Apoio (Estudante) ────────────────────────────────────────────────────────

function renderApoio() {
  const faqs = [
    { p: "Como me inscrevo em um evento?", r: "Acesse a página \"Eventos\", localize o evento desejado e clique em \"Inscrever-se\". Cada aluno pode ter apenas uma inscrição ativa por evento." },
    { p: "Posso me inscrever duas vezes no mesmo evento?", r: "Não. O sistema permite somente uma inscrição por aluno em cada evento. Se precisar cancelar, entre em contato com a coordenação." },
    { p: "Quando meu certificado fica disponível?", r: "Os certificados são liberados após a conclusão do evento e a confirmação de presença pela organização." },
    { p: "Esqueci minha senha, o que eu faço?", r: "Vá até a página \"Perfil\" e clique em \"Esqueci minha senha\" para receber as instruções de redefinição por e-mail." },
  ];

  return `
    <div class="page narrow">
      <div class="page-header">
        <h1>Apoio</h1>
        <p>Central de ajuda e perguntas frequentes sobre o sistema de eventos.</p>
      </div>

      <div class="card" style="padding:8px 0; margin-bottom:20px;">
        ${faqs.map((f, i) => `
          <div style="padding:16px 24px; ${i < faqs.length - 1 ? "border-bottom:1px solid #F5F5F5;" : ""}">
            <div class="evento-row-title" style="margin-bottom:6px;">${escapeHtml(f.p)}</div>
            <div style="font-size:13px; color:#6B6B6B; line-height:1.5;">${escapeHtml(f.r)}</div>
          </div>
        `).join("")}
      </div>

      <div class="card" style="padding:20px 24px;">
        <h3 style="font-family:'DM Sans',sans-serif; font-weight:700; font-size:14px; margin:0 0 10px;">Fale com a coordenação</h3>
        <div style="font-size:13px; color:#6B6B6B; line-height:1.8;">
          <div>📧 eventos@multivix.edu.br</div>
          <div>📞 (27) 3333-4400 — ramal 210</div>
          <div>🕑 Atendimento: segunda a sexta, 08h às 18h</div>
        </div>
      </div>
    </div>
  `;
}

// ─── Perfil (Estudante e Administrador) ──────────────────────────────────────

function renderPerfil() {
  const isAdmin = currentUser.tipo === "administrador";
  return `
    <div class="page narrow">
      <div class="page-header">
        <h1>Perfil</h1>
        <p>Suas informações de cadastro no sistema.</p>
      </div>

      <div class="card" style="padding:28px;">
        <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px;">
          <div class="user-avatar" style="width:56px; height:56px; font-size:20px;">${iniciais(currentUser.nome)}</div>
          <div>
            <div style="font-family:'DM Sans',sans-serif; font-weight:800; font-size:18px;">${escapeHtml(currentUser.nome)}</div>
            <span class="badge ${isAdmin ? "badge-encerrado" : "badge-aberto"}">${isAdmin ? "Administrador" : "Estudante"}</span>
          </div>
        </div>

        <div class="perfil-grid">
          <div class="perfil-field">
            <label>Nome completo</label>
            <div>${escapeHtml(currentUser.nome)}</div>
          </div>
          <div class="perfil-field">
            <label>${isAdmin ? "ID Administrador" : "ID Aluno / Matrícula"}</label>
            <div>${escapeHtml(currentUser.identificador)}</div>
          </div>
          <div class="perfil-field">
            <label>E-mail</label>
            <div>${escapeHtml(currentUser.email)}</div>
          </div>
          <div class="perfil-field">
            <label>Telefone</label>
            <div>${escapeHtml(currentUser.telefone)}</div>
          </div>
          <div class="perfil-field">
            <label>${isAdmin ? "Cargo" : "Curso / Período"}</label>
            <div>${escapeHtml(isAdmin ? currentUser.cargo : currentUser.curso)}</div>
          </div>
        </div>

        <div class="modal-actions" style="margin-top:8px;">
          <button class="btn btn-outline" id="btn-esqueci-senha">Esqueci minha senha</button>
          <button class="btn btn-accent" id="btn-sair">Sair</button>
        </div>
      </div>
    </div>
  `;
}

// ─── Relatório Geral / Dashboard (Administrador) ─────────────────────────────

function renderRelatorios() {
  const totalVagas = eventos.reduce((a, e) => a + e.vagas, 0);
  const totalOcupadas = eventos.reduce((a, e) => a + e.vagasOcupadas, 0);
  const pctGeral = totalVagas > 0 ? Math.round((totalOcupadas / totalVagas) * 100) : 0;

  const resumo = [
    { label: "Total de Eventos", value: eventos.length },
    { label: "Total de Vagas Oferecidas", value: totalVagas.toLocaleString("pt-BR") },
    { label: "Total de Inscrições", value: totalOcupadas.toLocaleString("pt-BR") },
    { label: "Total de Alunos Cadastrados", value: estatisticasAdmin.totalAlunos },
    { label: "Certificados Emitidos", value: certificados.length },
    { label: "Taxa de Ocupação", value: `${pctGeral}%` },
  ];

  return `
    <div class="page narrow">
      <div class="page-header">
        <h1>Relatório Geral / Dashboard</h1>
        <p>Visão geral dos eventos, inscrições e certificados do semestre 2026/2.</p>
      </div>

      <div class="reports-grid">
        <div class="card" style="padding:24px;">
          <h3 style="font-family:'DM Sans',sans-serif; font-weight:700; font-size:14px; margin:0 0 20px;">Ocupação por Evento</h3>
          ${eventos.map((ev) => {
            const pct = ev.vagas > 0 ? Math.round((ev.vagasOcupadas / ev.vagas) * 100) : 0;
            const cor = ev.status === "encerrado" ? "#9E9E9E" : "#CC0000";
            const titulo = ev.titulo.length > 40 ? ev.titulo.slice(0, 38) + "…" : ev.titulo;
            return `
              <div class="report-item">
                <div class="report-item-top">
                  <span style="font-weight:500;">${escapeHtml(titulo)}</span>
                  <span style="color:#6B6B6B;">${pct}%</span>
                </div>
                <div class="vagas-bar-track"><div class="vagas-bar-fill" style="width:${pct}%; background:${cor};"></div></div>
              </div>
            `;
          }).join("")}
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
          <div class="card" style="padding:24px;">
            <h3 style="font-family:'DM Sans',sans-serif; font-weight:700; font-size:14px; margin:0 0 16px;">Resumo Geral</h3>
            ${resumo.map((r) => `
              <div class="report-summary-row">
                <span style="color:#6B6B6B;">${r.label}</span>
                <span style="font-weight:700;">${r.value}</span>
              </div>
            `).join("")}
          </div>

          <div class="report-highlight" style="flex:1;">
            <div class="report-highlight-label">Semestre 2026/2</div>
            <div class="report-highlight-value">${pctGeral}%</div>
            <div class="report-highlight-sub">de ocupação média</div>
            <div class="report-highlight-box">${totalOcupadas.toLocaleString("pt-BR")} inscrições em ${eventos.length} eventos</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Eventos: ver e criar (Administrador) ────────────────────────────────────

function renderAdmin() {
  return `
    <div class="page">
      <div class="admin-header">
        <div>
          <h1 style="font-family:'DM Sans',sans-serif; font-weight:800; font-size:26px; margin:0;">Eventos</h1>
          <p style="color:#6B6B6B; font-size:14px; margin-top:4px;">Veja todos os eventos cadastrados e crie novos eventos para o semestre.</p>
        </div>
        <button class="btn btn-accent" id="btn-novo-evento">+ Novo Evento</button>
      </div>

      <div class="card">
        <div class="admin-table-head">
          <span>Evento</span><span>Data</span><span>Local</span><span>Vagas</span><span>Status</span><span>Ações</span>
        </div>
        ${eventos.map((ev) => `
          <div class="admin-table-row">
            <div>
              <div class="admin-evento-title">${escapeHtml(ev.titulo)}</div>
              <div class="admin-evento-cat">${escapeHtml(ev.categoria)}</div>
            </div>
            <div class="admin-cell">${escapeHtml(ev.data)}</div>
            <div class="admin-cell">${escapeHtml(ev.local)}</div>
            <div class="admin-cell">${ev.vagasOcupadas}/${ev.vagas}</div>
            <div>${statusBadge(ev.status)}</div>
            <div class="admin-actions">
              <button class="btn-icon" title="Código de check-in" data-codigo-checkin="${ev.id}">🔑</button>
              <button class="btn-icon" title="Editar" data-editar-evento="${ev.id}">✎</button>
              <button class="btn-icon danger" title="Excluir" data-excluir-evento="${ev.id}">🗑</button>
            </div>
          </div>
        `).join("") || `<div style="padding:48px 20px; text-align:center; color:#9E9E9E; font-size:13px;">Nenhum evento cadastrado ainda. Clique em "Novo Evento" para começar.</div>`}
      </div>
    </div>
  `;
}

// ─── Certificados gerados (Administrador) ────────────────────────────────────

let buscaCertificadoAdmin = "";

function renderCertificadosAdmin() {
  const termo = buscaCertificadoAdmin.trim().toLowerCase();
  const resultados = certificados.filter((c) => {
    if (!termo) return true;
    const nome = (c.nomeAluno || "").toLowerCase();
    const idAluno = (c.identificadorAluno || "").toLowerCase();
    return nome.includes(termo) || idAluno.includes(termo);
  });

  return `
    <div class="page">
      <div class="page-header">
        <h1>Certificados Gerados</h1>
        <p>Busque certificados emitidos por nome ou ID do aluno.</p>
      </div>

      <div class="eventos-toolbar">
        <input class="search-input" id="busca-certificado-admin" type="text" placeholder="Buscar por nome ou ID do aluno..." value="${escapeHtml(buscaCertificadoAdmin)}" />
      </div>

      <div class="card">
        <div class="admin-table-head" style="grid-template-columns: 1.6fr 1fr 1.6fr 0.8fr 1fr 0.6fr;">
          <span>Aluno</span><span>ID Aluno</span><span>Evento</span><span>Carga</span><span>Emissão</span><span>PDF</span>
        </div>
        ${resultados.map((c) => `
          <div class="admin-table-row" style="grid-template-columns: 1.6fr 1fr 1.6fr 0.8fr 1fr 0.6fr;">
            <div class="admin-evento-title">${escapeHtml(c.nomeAluno)}</div>
            <div class="admin-cell">${escapeHtml(c.identificadorAluno)}</div>
            <div class="admin-cell">${escapeHtml(c.eventoTitulo)}</div>
            <div class="admin-cell">${c.cargaHoraria}h</div>
            <div class="admin-cell">${escapeHtml(c.dataEmissao)}</div>
            <div class="admin-actions"><button class="btn-icon" title="Baixar PDF" data-baixar-certificado="${escapeHtml(c.codigo)}">⬇</button></div>
          </div>
        `).join("") || `<div style="padding:48px 20px; text-align:center; color:#9E9E9E; font-size:13px;">Nenhum certificado encontrado para essa busca.</div>`}
      </div>
    </div>
  `;
}
