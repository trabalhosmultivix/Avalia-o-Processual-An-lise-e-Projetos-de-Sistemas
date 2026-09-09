// ─── Sistema genérico de modal ────────────────────────────────────────────────

const modalOverlay = document.getElementById("modal-overlay");
const modalBox = document.getElementById("modal-box");

function openModal(html, wide = false) {
  modalBox.className = "modal-box" + (wide ? " wide" : "");
  modalBox.innerHTML = html;
  modalOverlay.classList.add("open");
}

function closeModal() {
  modalOverlay.classList.remove("open");
  modalBox.innerHTML = "";
}

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

// ─── Modal: formulário de evento (criar / editar) — Administrador ───────────

function abrirFormEvento(eventoExistente) {
  const ev = eventoExistente || {
    id: null,
    titulo: "",
    categoria: CATEGORIAS_EVENTO[0],
    dataISO: "",
    horaInicio: "",
    horaFim: "",
    local: "",
    vagas: 50,
    vagasOcupadas: 0,
    descricao: "",
    status: "breve",
    cargaHoraria: 4,
  };

  const html = `
    <h2 class="modal-title">${eventoExistente ? "Editar Evento" : "Novo Evento"}</h2>
    <p class="modal-subtitle">${eventoExistente ? "Atualize as informações do evento." : "Preencha os dados para publicar um novo evento."}</p>

    <div id="form-erro"></div>

    <div class="form-field">
      <label>Título do evento</label>
      <input id="f-titulo" type="text" value="${escapeHtml(ev.titulo)}" placeholder="Ex.: Semana Acadêmica de Engenharia Civil" />
    </div>

    <div class="form-row cols-2">
      <div class="form-field">
        <label>Categoria</label>
        <select id="f-categoria">
          ${CATEGORIAS_EVENTO.map((c) => `<option value="${c}" ${c === ev.categoria ? "selected" : ""}>${c}</option>`).join("")}
        </select>
      </div>
      <div class="form-field">
        <label>Status</label>
        <select id="f-status">
          <option value="breve" ${ev.status === "breve" ? "selected" : ""}>Em breve</option>
          <option value="aberto" ${ev.status === "aberto" ? "selected" : ""}>Inscrições abertas</option>
          <option value="encerrado" ${ev.status === "encerrado" ? "selected" : ""}>Encerrado</option>
        </select>
      </div>
    </div>

    <div class="form-row cols-3">
      <div class="form-field">
        <label>Data</label>
        <input id="f-data" type="date" value="${escapeHtml(ev.dataISO)}" />
      </div>
      <div class="form-field">
        <label>Hora início</label>
        <input id="f-hora-inicio" type="time" value="${escapeHtml(ev.horaInicio)}" />
      </div>
      <div class="form-field">
        <label>Hora fim</label>
        <input id="f-hora-fim" type="time" value="${escapeHtml(ev.horaFim)}" />
      </div>
    </div>

    <div class="form-field">
      <label>Local</label>
      <input id="f-local" type="text" value="${escapeHtml(ev.local)}" placeholder="Ex.: Auditório Principal – Bloco A" />
    </div>

    <div class="form-row cols-2">
      <div class="form-field">
        <label>Total de vagas</label>
        <input id="f-vagas" type="number" min="1" value="${ev.vagas}" />
      </div>
      <div class="form-field">
        <label>Carga horária (h)</label>
        <input id="f-carga" type="number" min="1" value="${ev.cargaHoraria}" />
      </div>
    </div>
    ${eventoExistente ? `<div style="font-size:12px; color:#9E9E9E; margin:-8px 0 16px;">Vagas ocupadas atualmente: <strong>${ev.vagasOcupadas}</strong> (esse número é atualizado automaticamente pelas inscrições, não é editável aqui).</div>` : ""}

    <div class="form-field">
      <label>Descrição</label>
      <textarea id="f-descricao" placeholder="Descreva o evento, a programação e o certificado oferecido.">${escapeHtml(ev.descricao)}</textarea>
    </div>

    <div class="modal-actions">
      <button class="btn btn-outline" id="btn-cancelar-form">Cancelar</button>
      <button class="btn btn-primary" id="btn-salvar-form">${eventoExistente ? "Salvar alterações" : "Publicar evento"}</button>
    </div>
  `;

  openModal(html, true);

  document.getElementById("btn-cancelar-form").addEventListener("click", closeModal);
  document.getElementById("btn-salvar-form").addEventListener("click", async () => {
    const dados = {
      titulo: document.getElementById("f-titulo").value.trim(),
      categoria: document.getElementById("f-categoria").value,
      status: document.getElementById("f-status").value,
      data_evento: document.getElementById("f-data").value,
      hora_inicio: document.getElementById("f-hora-inicio").value,
      hora_fim: document.getElementById("f-hora-fim").value,
      local: document.getElementById("f-local").value.trim(),
      vagas: Number(document.getElementById("f-vagas").value),
      carga_horaria: Number(document.getElementById("f-carga").value),
      descricao: document.getElementById("f-descricao").value.trim(),
    };

    const erro = validarEvento(dados);
    if (erro) {
      document.getElementById("form-erro").innerHTML = `<div class="form-error">${erro}</div>`;
      return;
    }

    const botao = document.getElementById("btn-salvar-form");
    botao.disabled = true;
    try {
      if (eventoExistente) {
        await editarEvento(eventoExistente.id, dados);
      } else {
        await criarEvento(dados);
      }
      closeModal();
      goto(currentPage);
    } catch (err) {
      document.getElementById("form-erro").innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
      botao.disabled = false;
    }
  });
}

function validarEvento(dados) {
  if (!dados.titulo) return "Informe o título do evento.";
  if (!dados.data_evento) return "Informe a data do evento.";
  if (!dados.hora_inicio || !dados.hora_fim) return "Informe o horário de início e fim do evento.";
  if (!dados.local) return "Informe o local do evento.";
  if (!dados.vagas || dados.vagas <= 0) return "O número de vagas deve ser maior que zero.";
  if (!dados.carga_horaria || dados.carga_horaria <= 0) return "Informe a carga horária do evento.";
  return null;
}

// ─── Modal: confirmação de exclusão — Administrador ──────────────────────────

function abrirConfirmarExclusao(evento) {
  const html = `
    <h3 class="modal-title" style="font-size:16px;">Excluir evento?</h3>
    <p class="modal-subtitle" style="margin-bottom:20px;">Tem certeza que deseja excluir <strong>${escapeHtml(evento.titulo)}</strong>? Essa ação não pode ser desfeita.</p>
    <div class="modal-actions">
      <button class="btn btn-outline" id="btn-cancelar-exclusao">Cancelar</button>
      <button class="btn btn-accent" id="btn-confirmar-exclusao">Excluir</button>
    </div>
  `;
  openModal(html);
  document.getElementById("btn-cancelar-exclusao").addEventListener("click", closeModal);
  document.getElementById("btn-confirmar-exclusao").addEventListener("click", async () => {
    try {
      await excluirEvento(evento.id);
      closeModal();
      goto(currentPage);
    } catch (err) {
      alert(err.message);
    }
  });
}

// ─── Modal: inscrição em evento — Estudante ──────────────────────────────────
// Aplica a regra "1 inscrição por aluno por evento": se o aluno logado já
// tiver uma inscrição ativa nesse evento, mostra um aviso em vez de duplicar.

function abrirModalInscricao(evento) {
  const jaInscrito = buscarInscricaoAtiva(evento.id, currentUser.id);

  if (jaInscrito) {
    const html = `
      <h2 class="modal-title">Inscrição já realizada</h2>
      <p class="modal-subtitle">Você já está inscrito em <strong>${escapeHtml(evento.titulo)}</strong>.</p>
      <div class="form-error">Cada aluno pode ter apenas uma inscrição ativa por evento.</div>
      <button class="btn btn-primary btn-block" id="btn-fechar-ja-inscrito">Entendi</button>
    `;
    openModal(html);
    document.getElementById("btn-fechar-ja-inscrito").addEventListener("click", closeModal);
    return;
  }

  const html = `
    <h2 class="modal-title">Confirmar inscrição</h2>
    <p class="modal-subtitle">${escapeHtml(evento.titulo)}</p>
    <div style="background:#F5F5F5; border-radius:6px; padding:14px 16px; font-size:12px; color:#6B6B6B; margin-bottom:20px; line-height:1.6;">
      <div><strong style="color:#111;">Data:</strong> ${escapeHtml(evento.data)} — ${escapeHtml(evento.horario)}</div>
      <div><strong style="color:#111;">Local:</strong> ${escapeHtml(evento.local)}</div>
      <div><strong style="color:#111;">Carga horária:</strong> ${evento.cargaHoraria}h</div>
    </div>
    <div id="inscricao-erro"></div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="btn-cancelar-inscricao">Cancelar</button>
      <button class="btn btn-primary" id="btn-confirmar-inscricao">Confirmar inscrição</button>
    </div>
  `;
  openModal(html);
  document.getElementById("btn-cancelar-inscricao").addEventListener("click", closeModal);
  document.getElementById("btn-confirmar-inscricao").addEventListener("click", async () => {
    const botao = document.getElementById("btn-confirmar-inscricao");
    botao.disabled = true;
    try {
      await inscreverEmEvento(evento.id);
    } catch (err) {
      document.getElementById("inscricao-erro").innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
      botao.disabled = false;
      return;
    }

    const confirmHtml = `
      <h2 class="modal-title">Inscrição confirmada ✓</h2>
      <p class="modal-subtitle">Você está inscrito em <strong>${escapeHtml(evento.titulo)}</strong>.</p>
      <div style="font-size:12px; color:#9E9E9E; text-align:center; margin-bottom:20px;">
        Acompanhe o status em "Minhas Inscrições".
      </div>
      <button class="btn btn-primary btn-block" id="btn-fechar-confirmacao">Fechar</button>
    `;
    modalBox.innerHTML = confirmHtml;
    document.getElementById("btn-fechar-confirmacao").addEventListener("click", () => {
      closeModal();
      goto(currentPage);
    });
  });
}

// ─── Modal: fazer check-in em um evento — Estudante ─────────────────────────
// O aluno digita, no dia do evento, o código que a organização divulgou/
// projetou. O backend confere inscrição + liberação + código.

function abrirModalCheckin(inscricao) {
  const html = `
    <h2 class="modal-title">Fazer check-in</h2>
    <p class="modal-subtitle">${escapeHtml(inscricao.eventoTitulo)}</p>
    <div style="background:#F5F5F5; border-radius:6px; padding:14px 16px; font-size:12px; color:#6B6B6B; margin-bottom:20px; line-height:1.6;">
      Peça à organização do evento o código de check-in do dia (projetado ou informado no local) e digite abaixo.
    </div>
    <div class="form-field">
      <label>Código de check-in</label>
      <input id="f-codigo-checkin" type="text" maxlength="6" style="text-transform:uppercase; letter-spacing:2px; text-align:center; font-weight:700;" placeholder="Ex.: A1B2C3" />
    </div>
    <div id="checkin-erro"></div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="btn-cancelar-checkin">Cancelar</button>
      <button class="btn btn-primary" id="btn-confirmar-checkin">Confirmar check-in</button>
    </div>
  `;
  openModal(html);
  document.getElementById("btn-cancelar-checkin").addEventListener("click", closeModal);
  document.getElementById("btn-confirmar-checkin").addEventListener("click", async () => {
    const codigo = document.getElementById("f-codigo-checkin").value.trim();
    if (!codigo) {
      document.getElementById("checkin-erro").innerHTML = `<div class="form-error">Informe o código de check-in.</div>`;
      return;
    }
    const botao = document.getElementById("btn-confirmar-checkin");
    botao.disabled = true;
    try {
      await fazerCheckin(inscricao.eventoId, codigo);
    } catch (err) {
      document.getElementById("checkin-erro").innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
      botao.disabled = false;
      return;
    }
    const confirmHtml = `
      <h2 class="modal-title">Check-in confirmado ✓</h2>
      <p class="modal-subtitle">Presença registrada em <strong>${escapeHtml(inscricao.eventoTitulo)}</strong>.</p>
      <div style="font-size:12px; color:#9E9E9E; text-align:center; margin-bottom:20px;">Seu certificado já pode ser emitido em "Minhas Inscrições".</div>
      <button class="btn btn-primary btn-block" id="btn-fechar-checkin">Fechar</button>
    `;
    modalBox.innerHTML = confirmHtml;
    document.getElementById("btn-fechar-checkin").addEventListener("click", () => {
      closeModal();
      goto("inscricoes");
    });
  });
}

// ─── Modal: gerenciar código de check-in de um evento — Administrador ──────

function abrirModalCodigoCheckin(evento) {
  function corpo(ev) {
    return `
      <h2 class="modal-title">Check-in do evento</h2>
      <p class="modal-subtitle">${escapeHtml(ev.titulo)}</p>
      <div style="background:#F5F5F5; border-radius:6px; padding:20px; text-align:center; margin-bottom:16px;">
        <div style="font-size:11px; color:#9E9E9E; margin-bottom:6px;">Código atual (divulgue no dia do evento)</div>
        <div style="font-size:28px; font-weight:800; letter-spacing:4px; font-family:'DM Sans',sans-serif;">${escapeHtml(ev.codigoCheckin || "------")}</div>
      </div>
      <div style="font-size:12px; color:#6B6B6B; text-align:center; margin-bottom:20px;">
        Check-in está: <strong style="color:${ev.checkinLiberado ? "#2E7D32" : "#CC0000"};">${ev.checkinLiberado ? "LIBERADO" : "FECHADO"}</strong>
        <br/>(também libera automaticamente no dia do evento: ${escapeHtml(ev.data)})
      </div>
      <div class="modal-actions" style="flex-wrap:wrap;">
        <button class="btn btn-outline" id="btn-fechar-codigo-checkin">Fechar</button>
        <button class="btn btn-outline" id="btn-gerar-novo-codigo">Gerar novo código</button>
        <button class="btn btn-primary" id="btn-alternar-checkin">${ev.checkinLiberado ? "Fechar check-in" : "Abrir check-in agora"}</button>
      </div>
    `;
  }

  openModal(corpo(evento));

  function religar(evAtualizado) {
    modalBox.innerHTML = corpo(evAtualizado);
    document.getElementById("btn-fechar-codigo-checkin").addEventListener("click", closeModal);
    document.getElementById("btn-gerar-novo-codigo").addEventListener("click", async () => {
      const { codigo_checkin } = await regenerarCodigoCheckin(evento.id);
      evento.codigoCheckin = codigo_checkin;
      religar(evento);
    });
    document.getElementById("btn-alternar-checkin").addEventListener("click", async () => {
      const { checkin_liberado } = await alternarCheckin(evento.id);
      evento.checkinLiberado = checkin_liberado;
      religar(evento);
    });
  }
  religar(evento);
}

// ─── Modal: esqueci minha senha — Perfil (Estudante e Administrador) ────────
// Sem servidor de e-mail neste protótipo: o token de redefinição é mostrado
// na tela mesmo (como um ambiente de testes) e a troca de senha já acontece
// ali, chamando a API de verdade.

function abrirModalEsqueciSenha() {
  const html = `
    <h2 class="modal-title">Esqueci minha senha</h2>
    <p class="modal-subtitle">Vamos gerar um link/token de redefinição para o seu cadastro.</p>
    <div class="form-field">
      <label>E-mail cadastrado</label>
      <input id="f-recuperar-email" type="text" value="${escapeHtml(currentUser.email)}" disabled />
    </div>
    <div id="recuperar-erro"></div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="btn-cancelar-recuperar">Cancelar</button>
      <button class="btn btn-primary" id="btn-confirmar-recuperar">Gerar token</button>
    </div>
  `;
  openModal(html);
  document.getElementById("btn-cancelar-recuperar").addEventListener("click", closeModal);
  document.getElementById("btn-confirmar-recuperar").addEventListener("click", async () => {
    let resultado;
    try {
      resultado = await solicitarRecuperacaoSenha(currentUser.email);
    } catch (err) {
      document.getElementById("recuperar-erro").innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
      return;
    }

    const token = resultado.token;
    const confirmHtml = `
      <h2 class="modal-title">Token gerado ✓</h2>
      <p class="modal-subtitle">Em um ambiente real isso chegaria por e-mail. Aqui, para teste, digite a nova senha abaixo.</p>
      <div style="font-size:11px; color:#9E9E9E; text-align:center; margin-bottom:16px; word-break:break-all;">Token: ${escapeHtml(token)}</div>
      <div class="form-field">
        <label>Nova senha</label>
        <input id="f-nova-senha" type="password" placeholder="Mínimo 4 caracteres" />
      </div>
      <div id="redefinir-erro"></div>
      <div class="modal-actions">
        <button class="btn btn-outline" id="btn-fechar-recuperar">Fechar</button>
        <button class="btn btn-primary" id="btn-confirmar-redefinir">Redefinir senha</button>
      </div>
    `;
    modalBox.innerHTML = confirmHtml;
    document.getElementById("btn-fechar-recuperar").addEventListener("click", closeModal);
    document.getElementById("btn-confirmar-redefinir").addEventListener("click", async () => {
      const novaSenha = document.getElementById("f-nova-senha").value;
      try {
        await redefinirSenha(token, novaSenha);
      } catch (err) {
        document.getElementById("redefinir-erro").innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
        return;
      }
      modalBox.innerHTML = `
        <h2 class="modal-title">Senha redefinida ✓</h2>
        <p class="modal-subtitle">Use a nova senha no seu próximo login.</p>
        <button class="btn btn-primary btn-block" id="btn-fechar-redefinido">Fechar</button>
      `;
      document.getElementById("btn-fechar-redefinido").addEventListener("click", closeModal);
    });
  });
}
