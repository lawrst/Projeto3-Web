const API_URL = window.APP_CONFIG?.API_URL || "http://127.0.0.1:8000";
const WS_URL = window.APP_CONFIG?.WS_URL || API_URL.replace(/^http/, "ws");
const token = localStorage.getItem("token");

if (!token) window.location.href = "../Login/index.html";

const KanbanApp = {
  meuCalendario: null,
  socketChatAtivo: null,
  acaoConfirmacao: null,
  securityPollingId: null,
  agentPollingId: null,

  async init() {
    this.cacheSelectors();
    this.bindEvents();
    this.carregarStatusAgenteInicial();
    this.iniciarMonitorAgente();
    const podeContinuar = await this.verificarEstadoFacial();
    if (!podeContinuar) return;
    this.loadTasks();
    this.atualizarNomeUsuario();
    this.iniciarMonitorSeguranca();
  },

  cacheSelectors() {
    this.form = document.getElementById("formTarefa");
    this.formEditar = document.getElementById("formEditar");
    this.formNovoRelatorio = document.getElementById("formNovoRelatorio");
    this.modal = document.getElementById("modalTarefa");
    this.modalDetalhes = document.getElementById("modalDetalhes");
    this.modalNovoRelatorio = document.getElementById("modalNovoRelatorio");
    this.modalVerRelatorio = document.getElementById("modalVerRelatorio");
    this.columns = document.querySelectorAll(".column");
    this.labelCamera = document.getElementById("labelCamera");
    this.cameraVisor = document.getElementById("cameraStatus");
    this.agenteStatusBadge = document.getElementById("agenteStatusBadge");
    this.agenteStatusDetail = document.getElementById("agenteStatusDetail");
    this.agenteStatusVersion = document.getElementById("agenteStatusVersion");
    this.agenteStatusHeartbeat = document.getElementById("agenteStatusHeartbeat");
    this.agenteStatusMonitoring = document.getElementById("agenteStatusMonitoring");
    this.securityOverlay = document.getElementById("securityOverlay");
    this.securityReason = document.getElementById("securityReason");
    this.securityTime = document.getElementById("securityTime");
    this.unlockSecurityBtn = document.getElementById("unlockSecurityBtn");
  },

  bindEvents() {
    if (this.form) this.form.onsubmit = (e) => this.handleFormSubmit(e);
    if (this.formEditar)
      this.formEditar.onsubmit = (e) => this.handleEditSubmit(e);
    if (this.formNovoRelatorio)
      this.formNovoRelatorio.onsubmit = (e) => this.handleRelatorioSubmit(e);

    document.getElementById("logoutBtn").onclick = () => {
      if (this.securityPollingId) clearInterval(this.securityPollingId);
      if (this.agentPollingId) clearInterval(this.agentPollingId);
      localStorage.clear();
      location.reload();
    };

    if (this.unlockSecurityBtn) {
      this.unlockSecurityBtn.onclick = () => this.desbloquearSeguranca();
    }

    this.columns.forEach((col) => {
      col.ondragover = (e) => e.preventDefault();
      col.ondrop = (e) => this.handleDrop(e);
    });

    const inputChat = document.getElementById("inputNovaMensagem");
    if (inputChat)
      inputChat.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.enviarMensagemChat();
      });

    const formChat = document.getElementById("formNovoChat");
    if (formChat) formChat.onsubmit = (e) => this.criarChat(e);
  },

  async verificarEstadoFacial() {
    try {
      const resp = await fetch(`${API_URL}/rosto/estado`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) return true;

      const dados = await resp.json();
      localStorage.setItem("usuario_tem_rosto", dados.tem_rosto ? "1" : "0");

      if (!dados.tem_rosto) {
        window.location.href = "../Face/index.html?mode=register";
        return false;
      }

      return true;
    } catch (error) {
      console.warn("Falha ao consultar status facial:", error);
      return true;
    }
  },

  atualizarNomeUsuario() {
    const nome = localStorage.getItem("usuario_nome");
    if (nome) document.getElementById("welcomeMsg").innerText = `Olá, ${nome}!`;
  },

  abrirFluxoFacial(modo = "register") {
    window.location.href = `../Face/index.html?mode=${modo}`;
  },

  carregarStatusAgenteInicial() {
    const estadoSalvo = localStorage.getItem("agente_desktop");
    if (!estadoSalvo) {
      this.renderizarStatusAgente(null);
      return;
    }

    try {
      this.renderizarStatusAgente(JSON.parse(estadoSalvo));
    } catch (error) {
      this.renderizarStatusAgente(null);
    }
  },

  iniciarMonitorAgente() {
    this.consultarStatusAgente();
    if (this.agentPollingId) clearInterval(this.agentPollingId);
    this.agentPollingId = setInterval(() => {
      this.consultarStatusAgente();
    }, 15000);
  },

  async consultarStatusAgente() {
    try {
      const resp = await fetch(`${API_URL}/desktop/devices/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) {
        this.renderizarStatusAgente({ pareado: false, conectado: false, monitorando: false, estado: "desconectado" });
        return;
      }

      const estado = await resp.json();
      localStorage.setItem("agente_desktop", JSON.stringify(estado));
      this.renderizarStatusAgente(estado);
    } catch (error) {
      console.warn("Falha ao consultar status do agente desktop:", error);
      const estadoSalvo = localStorage.getItem("agente_desktop");
      if (estadoSalvo) {
        try {
          this.renderizarStatusAgente(JSON.parse(estadoSalvo));
          return;
        } catch (parseError) {
          // ignora e cai no estado offline abaixo
        }
      }
      this.renderizarStatusAgente(null);
    }
  },

  renderizarStatusAgente(estado) {
    const pareado = Boolean(estado?.pareado);
    const conectado = Boolean(estado?.conectado);
    const monitorando = Boolean(estado?.monitorando);
    const dispositivo = estado?.dispositivo || {};
    const statusTexto = monitorando
      ? "Monitorando"
      : conectado
        ? "Conectado"
        : "Desconectado";
    const statusClasse = monitorando
      ? "is-monitoring"
      : conectado
        ? "is-online"
        : "is-offline";
    const detalheTexto = !pareado
      ? "Nenhum dispositivo desktop pareado com esta conta."
      : conectado
        ? `${dispositivo.device_name || "Desktop VERIFIQ"} está online e pronto para receber comandos.`
        : `${dispositivo.device_name || "Desktop VERIFIQ"} está offline. O comando ficará pendente.`;

    if (this.agenteStatusBadge) {
      this.agenteStatusBadge.className = `agent-status-badge ${statusClasse}`;
      this.agenteStatusBadge.textContent = statusTexto;
    }

    if (this.agenteStatusDetail) {
      this.agenteStatusDetail.textContent = detalheTexto;
    }

    if (this.agenteStatusVersion) {
      this.agenteStatusVersion.textContent = `Versão: ${dispositivo.agent_version || estado?.agent_version || "-"}`;
    }

    if (this.agenteStatusHeartbeat) {
      const ultimoHeartbeat = estado?.ultimo_heartbeat_em || estado?.heartbeat_at || null;
      this.agenteStatusHeartbeat.textContent = ultimoHeartbeat
        ? `Heartbeat: ${new Date(ultimoHeartbeat).toLocaleString("pt-BR")}`
        : "Heartbeat: -";
    }

    if (this.agenteStatusMonitoring) {
      this.agenteStatusMonitoring.textContent = `Monitoramento: ${monitorando ? "Ativo" : conectado ? "Aguardando" : "Inativo"}`;
    }
  },

  iniciarMonitorSeguranca() {
    this.consultarEstadoSeguranca();
    if (this.securityPollingId) clearInterval(this.securityPollingId);
    this.securityPollingId = setInterval(() => {
      this.consultarEstadoSeguranca();
    }, 4000);
  },

  async consultarEstadoSeguranca() {
    try {
      const resp = await fetch(`${API_URL}/seguranca/estado`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) return;
      const estado = await resp.json();
      this.aplicarBloqueioSeguranca(estado);
    } catch (error) {
      console.warn("Falha ao consultar estado de seguranca:", error);
    }
  },

  aplicarBloqueioSeguranca(estado) {
    if (!this.securityOverlay) return;

    const ativo = Boolean(estado?.bloqueio_ativo);
    if (!ativo) {
      this.securityOverlay.classList.remove("is-active");
      return;
    }

    this.securityOverlay.classList.add("is-active");
    if (this.securityReason) {
      this.securityReason.innerText =
        estado?.motivo || "Alerta de seguranca ativo";
    }
    if (this.securityTime) {
      this.securityTime.innerText = estado?.ultimo_alerta_em
        ? `Ultimo alerta: ${new Date(estado.ultimo_alerta_em).toLocaleString("pt-BR")}`
        : "Ultimo alerta: agora";
    }

    const role = (localStorage.getItem("usuario_role") || "").toLowerCase();
    if (this.unlockSecurityBtn) {
      this.unlockSecurityBtn.style.display = role === "admin" ? "inline-flex" : "none";
    }
  },

  async desbloquearSeguranca() {
    const role = (localStorage.getItem("usuario_role") || "").toLowerCase();
    if (role !== "admin") {
      this.showToast("Somente admin pode desbloquear.");
      return;
    }

    try {
      const resp = await fetch(`${API_URL}/seguranca/desbloquear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ observacao: "Desbloqueio via dashboard" }),
      });

      const dados = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(dados.detail || "Nao foi possivel desbloquear.");
      }

      this.showToast("Seguranca desbloqueada.");
      this.securityOverlay?.classList.remove("is-active");
    } catch (error) {
      this.showToast(error.message || "Falha ao desbloquear seguranca.");
    }
  },

  trocarTela(tela) {
    // 1. Esconde todas as secções
    ["secaoKanban", "secaoRelatorio", "secaoChat"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });

    // 2. Tira a cor azul de todos os itens do menu
    ["menu-kanban", "menu-relatorio", "menu-chat"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("active");
    });

    // 3. Mostra apenas a secção escolhida (removendo o "none")
    const secaoAtiva = document.getElementById(
      `secao${tela.charAt(0).toUpperCase() + tela.slice(1)}`,
    );
    if (secaoAtiva) secaoAtiva.style.display = "";

    // 4. Pinta o menu escolhido de azul
    const menuAtivo = document.getElementById(`menu-${tela}`);
    if (menuAtivo) menuAtivo.classList.add("active");

    // 5. Lógica extra para carregar as ferramentas de cada ecrã
    if (tela === "relatorio") {
      if (!this.meuCalendario) this.iniciarCalendario();
      else
        setTimeout(() => {
          this.meuCalendario.updateSize();
          this.meuCalendario.refetchEvents();
        }, 100);
    } else if (tela === "chat") {
      this.carregarListaDeChats();
    }
  },

  // ==========================================
  // === FUNÇÕES DO CALENDÁRIO / RELATÓRIOS ===
  // ==========================================

  iniciarCalendario() {
    this.meuCalendario = new FullCalendar.Calendar(
      document.getElementById("calendar"),
      {
        initialView: "dayGridMonth",
        locale: "pt-br",
        height: 600,
        headerToolbar: { left: "prev,next today", center: "title", right: "" },
        events: async (info, successCallback) => {
          try {
            const resp = await fetch(`${API_URL}/tarefas`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!resp.ok) return successCallback([]);
            const todas = await resp.json();

            const eventos = todas
              .filter((t) => t.status === "Relatorio")
              .map((t) => {
                const partes = t.titulo.split(" | ");
                let data = t.titulo,
                  hora = "",
                  tituloReal = t.titulo;

                if (partes.length >= 3) {
                  data = `${partes[0]}T${partes[1]}:00`;
                  hora = partes[1];
                  tituloReal = partes[2];
                } else if (partes.length === 2) {
                  data = partes[0];
                  tituloReal = partes[1];
                }

                return {
                  id: t._id,
                  title: tituloReal,
                  start: data,
                  color: "#34a853",
                  extendedProps: { descricao: t.descricao, hora: hora },
                };
              });
            successCallback(eventos);
          } catch (e) {
            successCallback([]);
          }
        },

        dateClick: (info) => {
          const eventosHoje = this.meuCalendario
            .getEvents()
            .filter((e) => e.startStr.startsWith(info.dateStr));
          if (eventosHoje.length > 0)
            return this.showToast("⚠️ Você já tem um registro para este dia!");

          document.getElementById("dataOcultaRelatorio").value = info.dateStr;
          document.getElementById("dataEscolhidaRelatorio").innerText =
            "Data: " +
            new Date(info.dateStr + "T12:00:00").toLocaleDateString("pt-BR");

          // Pega a hora atual do computador e formata como HH:MM
          const agora = new Date();
          const horaAtual =
            agora.getHours().toString().padStart(2, "0") +
            ":" +
            agora.getMinutes().toString().padStart(2, "0");

          document.getElementById("horarioRelatorio").value = horaAtual;
          document.getElementById("tituloRelatorio").value = "";
          document.getElementById("resumoRelatorio").value = "";
          document.getElementById("atividadesRelatorio").value = "";
          document.getElementById("metaRelatorio").value = "";
          document.getElementById("dificuldadeRelatorio").value = "Médio";

          this.modalNovoRelatorio.style.display = "block";
        },

        eventClick: (info) => {
          const dataApenas = info.event.startStr.split("T")[0];
          document.getElementById("idOcultoRelatorio").value = info.event.id;
          document.getElementById("dataOcultaEdicaoRelatorio").value =
            dataApenas;

          document.getElementById("editHorarioRelatorio").value =
            info.event.extendedProps.hora || "18:00";
          document.getElementById("editTituloRelatorio").value =
            info.event.title;

          try {
            const dados = JSON.parse(info.event.extendedProps.descricao);
            document.getElementById("editResumoRelatorio").value =
              dados.resumo || "";
            document.getElementById("editAtividadesRelatorio").value =
              dados.atividades || "";
            document.getElementById("editDificuldadeRelatorio").value =
              dados.dificuldade || "Médio";
            document.getElementById("editMetaRelatorio").value =
              dados.meta || "";
          } catch (e) {
            document.getElementById("editResumoRelatorio").value =
              info.event.extendedProps.descricao;
          }

          document.getElementById("verDataRelatorio").innerText =
            "Data: " +
            new Date(dataApenas + "T12:00:00").toLocaleDateString("pt-BR");
          this.modalVerRelatorio.style.display = "block";
        },
      },
    );
    this.meuCalendario.render();
  },

  async handleRelatorioSubmit(e) {
    e.preventDefault();
    const tituloFinal = `${document.getElementById("dataOcultaRelatorio").value} | ${document.getElementById("horarioRelatorio").value} | ${document.getElementById("tituloRelatorio").value}`;

    const dados = {
      resumo: document.getElementById("resumoRelatorio").value,
      atividades: document.getElementById("atividadesRelatorio").value,
      dificuldade: document.getElementById("dificuldadeRelatorio").value,
      meta: document.getElementById("metaRelatorio").value,
    };

    const resp = await fetch(`${API_URL}/tarefas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        titulo: tituloFinal,
        descricao: JSON.stringify(dados),
        status: "Relatorio",
        usuario_id: "auth",
      }),
    });
    if (resp.ok) {
      this.modalNovoRelatorio.style.display = "none";
      this.meuCalendario.refetchEvents();
      this.showToast("Agendamento salvo com sucesso!");
    }
  },

  async editarRelatorio() {
    const tituloFinal = `${document.getElementById("dataOcultaEdicaoRelatorio").value} | ${document.getElementById("editHorarioRelatorio").value} | ${document.getElementById("editTituloRelatorio").value}`;
    const dados = {
      resumo: document.getElementById("editResumoRelatorio").value,
      atividades: document.getElementById("editAtividadesRelatorio").value,
      dificuldade: document.getElementById("editDificuldadeRelatorio").value,
      meta: document.getElementById("editMetaRelatorio").value,
    };

    const resp = await fetch(
      `${API_URL}/tarefas/editar-texto/${document.getElementById("idOcultoRelatorio").value}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titulo: tituloFinal,
          descricao: JSON.stringify(dados),
        }),
      },
    );
    if (resp.ok) {
      this.modalVerRelatorio.style.display = "none";
      this.meuCalendario.refetchEvents();
      this.showToast("Atualizado!");
    }
  },

  async excluirRelatorio() {
    this.pedirConfirmacao(
      "Deseja realmente excluir este item do calendário?",
      async () => {
        const resp = await fetch(
          `${API_URL}/tarefas/${document.getElementById("idOcultoRelatorio").value}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        );
        if (resp.ok) {
          this.modalVerRelatorio.style.display = "none";
          this.meuCalendario.refetchEvents();
          this.showToast("Excluído!");
        }
      },
    );
  },

  // ==========================================
  // === FUNÇÕES DO KANBAN COM PRAZOS E DATAS ===
  // ==========================================

  async loadTasks() {
    try {
      const resp = await fetch(`${API_URL}/tarefas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const todas = await resp.json();
        this.renderTasks(todas.filter((t) => t.status !== "Relatorio"));
      }
    } catch (e) {
      console.error(e);
    }
  },

  renderTasks(lista) {
    ["list-todo", "list-doing", "list-done"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });

    lista.forEach((t) => {
      let dados;
      try {
        dados = JSON.parse(t.descricao);
      } catch {
        dados = {
          texto: t.descricao,
          prazo: "",
          data_abertura: "",
          data_inicio: "",
          data_conclusao: "",
        };
      }

      // Lógica de Prazo Vencido
      let prazoHtml = "";
      if (dados.prazo) {
        const hoje = new Date().setHours(0, 0, 0, 0);
        const dataPrazo = new Date(dados.prazo + "T00:00:00").getTime();
        const atrasado = dataPrazo < hoje && t.status !== "Concluído";
        const dataFormatada = new Date(
          dados.prazo + "T12:00:00",
        ).toLocaleDateString("pt-BR");

        prazoHtml = `<span style="font-size:11px; font-weight:bold; ${atrasado ? "color:#dc3545;" : "color:#666;"}">🗓️ Prazo: ${dataFormatada} ${atrasado ? "⚠️ Atrasado" : ""}</span><br>`;
      }

      // Datas de rastreio
      let rastreioHtml = "";
      if (t.status === "A Fazer" && dados.data_abertura)
        rastreioHtml = `Aberto em: ${dados.data_abertura}`;
      if (t.status === "Fazendo" && dados.data_inicio)
        rastreioHtml = `Iniciado em: ${dados.data_inicio}`;
      if (t.status === "Concluído" && dados.data_conclusao)
        rastreioHtml = `Concluído em: ${dados.data_conclusao}`;

      const card = document.createElement("div");
      card.className = "task-card";
      card.draggable = true;
      card.id = t._id;
      card.dataset.json = JSON.stringify(dados);

      card.onclick = () => this.abrirEdicao(t._id, t.titulo, t.descricao);
      card.ondragstart = (e) => {
        e.dataTransfer.setData("text", e.target.id);
        e.target.style.opacity = "0.5";
      };
      card.ondragend = (e) => (e.target.style.opacity = "1");

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <h4 style="margin: 0; font-size: 14px; color: #333;">${t.titulo}</h4>
            <button onclick="event.stopPropagation(); KanbanApp.deleteTask('${t._id}')" style="background:none; border:none; color:#dc3545; cursor:pointer;" title="Excluir">🗑️</button>
        </div>
        <div>
            ${prazoHtml}
            <span style="font-size:10px; color:#aaa;">${rastreioHtml}</span>
        </div>
      `;

      const containerStatus = {
        "A Fazer": "list-todo",
        Fazendo: "list-doing",
        Concluído: "list-done",
      }[t.status];
      const container = document.getElementById(containerStatus);
      if (container) container.appendChild(card);
    });
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const dados = {
      texto: document.getElementById("descTarefa").value,
      prazo: document.getElementById("prazoTarefa").value,
      data_abertura: new Date().toLocaleDateString("pt-BR"),
      data_inicio: null,
      data_conclusao: null,
    };

    const resp = await fetch(`${API_URL}/tarefas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        titulo: document.getElementById("tituloTarefa").value,
        descricao: JSON.stringify(dados),
        status: "A Fazer",
        usuario_id: "auth",
      }),
    });
    if (resp.ok) {
      this.toggleModal(false);
      this.form.reset();
      this.loadTasks();
    }
  },

  abrirEdicao(id, titulo, descricaoJSON) {
    let dados;
    try {
      dados = JSON.parse(descricaoJSON);
    } catch {
      dados = { texto: descricaoJSON, prazo: "" };
    }

    document.getElementById("editId").value = id;
    document.getElementById("editTitulo").value = titulo;
    document.getElementById("editDesc").value = dados.texto || "";
    document.getElementById("editPrazoTarefa").value = dados.prazo || "";

    document.getElementById("editDataAbertura").value =
      dados.data_abertura || "";
    document.getElementById("editDataInicio").value = dados.data_inicio || "";
    document.getElementById("editDataConclusao").value =
      dados.data_conclusao || "";
    this.toggleModalDetalhes(true);
  },

  async handleEditSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("editId").value;
    const dados = {
      texto: document.getElementById("editDesc").value,
      prazo: document.getElementById("editPrazoTarefa").value,
      data_abertura: document.getElementById("editDataAbertura").value,
      data_inicio: document.getElementById("editDataInicio").value,
      data_conclusao: document.getElementById("editDataConclusao").value,
    };

    const resp = await fetch(`${API_URL}/tarefas/editar-texto/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        titulo: document.getElementById("editTitulo").value,
        descricao: JSON.stringify(dados),
      }),
    });
    if (resp.ok) {
      this.toggleModalDetalhes(false);
      this.loadTasks();
    }
  },

  async handleDrop(e) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text");
    const column = e.target.closest(".column");
    if (!column || !id) return;

    const novoStatus = {
      "to-do": "A Fazer",
      doing: "Fazendo",
      done: "Concluído",
    }[column.id];

    const cardElement = document.getElementById(id);
    let dados = JSON.parse(cardElement.dataset.json || "{}");
    const hojeBR = new Date().toLocaleDateString("pt-BR");

    if (novoStatus === "Fazendo" && !dados.data_inicio)
      dados.data_inicio = hojeBR;
    if (novoStatus === "Concluído" && !dados.data_conclusao)
      dados.data_conclusao = hojeBR;

    await fetch(`${API_URL}/tarefas/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: novoStatus }),
    });

    const titulo = cardElement.querySelector("h4").innerText;
    await fetch(`${API_URL}/tarefas/editar-texto/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        titulo: titulo,
        descricao: JSON.stringify(dados),
      }),
    });

    this.loadTasks();
  },

  async deleteTask(id) {
    this.pedirConfirmacao(
      "Tem certeza que deseja excluir esta tarefa?",
      async () => {
        const resp = await fetch(`${API_URL}/tarefas/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          this.loadTasks();
          this.showToast("Tarefa excluída!");
        }
      },
    );
  },

  // ==========================================
  // === FUNÇÕES DO CHAT CORPORATIVO ===
  // ==========================================

  async abrirModalNovoChat() {
    document.getElementById("nomeNovoChat").value = "";
    const listaDiv = document.getElementById("listaFuncionariosChat");
    listaDiv.innerHTML =
      '<p style="font-size: 12px; color: #888;">Carregando funcionários...</p>';
    document.getElementById("modalNovoChat").style.display = "block";

    try {
      const resp = await fetch(`${API_URL}/empresa/funcionarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.ok) {
        const funcionarios = await resp.json();
        if (funcionarios.length === 0) {
          listaDiv.innerHTML =
            "<p style='font-size: 13px; color: #888;'>Nenhum funcionário encontrado.</p>";
          return;
        }
        listaDiv.innerHTML = "";
        funcionarios.forEach((f) => {
          const label = document.createElement("label");
          label.style.cssText =
            "display: block; margin-bottom: 8px; cursor: pointer; font-size: 14px;";
          label.innerHTML = `<input type="checkbox" name="func_chat" value="${f.id_usuario}" style="margin-right: 8px;"> ${f.nome} (${f.email})`;
          listaDiv.appendChild(label);
        });
      } else {
        listaDiv.innerHTML =
          "<p style='color: #dc3545; font-size: 13px; font-weight: bold;'>⚠️ Apenas usuários 'admin' podem criar salas de chat.</p>";
      }
    } catch (err) {
      listaDiv.innerHTML = "<p style='color: red;'>Erro de conexão.</p>";
    }
  },

  async criarChat(e) {
    e.preventDefault();
    const nomeChat = document.getElementById("nomeNovoChat").value;
    const checkboxes = document.querySelectorAll(
      'input[name="func_chat"]:checked',
    );
    const idsSelecionados = Array.from(checkboxes).map((cb) => cb.value);

    try {
      const resp = await fetch(`${API_URL}/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome_chat: nomeChat,
          funcionarios_ids: idsSelecionados,
        }),
      });

      if (resp.ok) {
        window.fecharModalNovoChat();
        this.showToast("Chat criado com sucesso!");
        this.carregarListaDeChats();
      } else {
        const erro = await resp.json();
        this.showToast(erro.detail || "Erro ao criar chat.");
      }
    } catch (err) {
      this.showToast("Erro de conexão.");
    }
  },

  async carregarListaDeChats() {
    try {
      const resp = await fetch(`${API_URL}/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listaDiv = document.getElementById("listaDeChats");

      if (resp.ok) {
        const chats = await resp.json();

        if (chats.length === 0) {
          listaDiv.innerHTML =
            '<p style="color: #888; font-size: 14px;">Você não participa de nenhum chat ainda.</p>';
          return;
        }

        listaDiv.innerHTML = "";

        chats.forEach((chat) => {
          const divContainer = document.createElement("div");
          divContainer.style.cssText =
            "display: flex; gap: 5px; margin-bottom: 8px;";

          const btnChat = document.createElement("button");
          btnChat.innerText = chat.nome_chat;
          btnChat.style.cssText =
            "flex: 1; padding: 12px; background: #f0f0f0; border: none; border-radius: 6px; text-align: left; cursor: pointer; transition: 0.2s;";
          btnChat.onmouseover = () => (btnChat.style.background = "#e0e0e0");
          btnChat.onmouseout = () => (btnChat.style.background = "#f0f0f0");
          btnChat.onclick = () =>
            this.abrirSalaDeChat(chat.id_chat, chat.nome_chat);

          const btnExcluir = document.createElement("button");
          btnExcluir.innerText = "🗑️";
          btnExcluir.title = "Excluir Chat (Apenas Admin)";
          btnExcluir.style.cssText =
            "padding: 10px; background: #ffebee; border: none; border-radius: 6px; cursor: pointer; color: red;";
          btnExcluir.onclick = () => this.excluirChat(chat.id_chat);

          divContainer.appendChild(btnChat);
          divContainer.appendChild(btnExcluir);
          listaDiv.appendChild(divContainer);
        });
      }
    } catch (err) {
      console.error(err);
    }
  },

  async excluirChat(chatId) {
    this.pedirConfirmacao(
      "Excluir este chat e todas as mensagens? (Apenas Admins)",
      async () => {
        try {
          const resp = await fetch(`${API_URL}/chats/${chatId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });

          if (resp.ok) {
            this.showToast("Chat excluído com sucesso!");
            this.carregarListaDeChats();

            if (document.getElementById("chatIdAtivo").value === chatId) {
              document.getElementById("caixaDeMensagens").innerHTML = "";
              document.getElementById("cabecalhoChatAtual").innerText =
                "Selecione um chat para iniciar";
              document.getElementById("inputNovaMensagem").disabled = true;
              document.getElementById("btnEnviarMensagem").disabled = true;
              if (this.socketChatAtivo) this.socketChatAtivo.close();
            }
          } else {
            const erro = await resp.json();
            this.showToast(erro.detail || "Erro ao excluir chat.");
          }
        } catch (err) {
          this.showToast("Erro de conexão.");
        }
      },
    );
  },

  async abrirSalaDeChat(chatId, nomeChat) {
    document.getElementById("cabecalhoChatAtual").innerText =
      `Chat: ${nomeChat} (conectando...)`;
    document.getElementById("chatIdAtivo").value = chatId;

    document.getElementById("inputNovaMensagem").disabled = true;
    document.getElementById("btnEnviarMensagem").disabled = true;

    const caixa = document.getElementById("caixaDeMensagens");
    caixa.innerHTML =
      '<p style="text-align:center; color:#aaa; font-size:12px;">A carregar histórico...</p>';

    try {
      const resp = await fetch(`${API_URL}/chat/mensagens?chat_id=${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const historico = await resp.json();
        caixa.innerHTML = "";
        historico.forEach((msg) =>
          this.renderizarMensagemNaTela(msg.nome_usuario, msg.mensagem),
        );
        caixa.scrollTop = caixa.scrollHeight;
      }
    } catch (err) {
      caixa.innerHTML =
        '<p style="color:red; text-align:center;">Erro ao carregar o histórico.</p>';
    }

    this.conectarWebSocketChat(chatId);
  },

  conectarWebSocketChat(chatId) {
    if (this.socketChatAtivo) {
      this.socketChatAtivo.close();
    }

    const tokenSeguro = encodeURIComponent(token);

    this.socketChatAtivo = new WebSocket(
      `${WS_URL}/ws/chat/${chatId}?token=${tokenSeguro}`,
    );

    const habilitarChat = () => {
      document.getElementById("inputNovaMensagem").disabled = false;
      document.getElementById("btnEnviarMensagem").disabled = false;
      document.getElementById("inputNovaMensagem").focus();
      const nomeChat = document
        .getElementById("cabecalhoChatAtual")
        .innerText.replace(" (conectando...)", "");
      document.getElementById("cabecalhoChatAtual").innerText = nomeChat;
    };

    const desabilitarChat = () => {
      document.getElementById("inputNovaMensagem").disabled = true;
      document.getElementById("btnEnviarMensagem").disabled = true;
      const cabecalho = document.getElementById("cabecalhoChatAtual");
      if (cabecalho && !cabecalho.innerText.includes("(conectando...)")) {
        cabecalho.innerText = `${cabecalho.innerText} (conectando...)`;
      }
    };

    this.socketChatAtivo.onmessage = (event) => {
      const dados = event.data.split(": ");
      if (dados.length >= 2) {
        const nome = dados.shift();
        const texto = dados.join(": ");
        this.renderizarMensagemNaTela(nome, texto);
      } else {
        this.renderizarMensagemNaTela("Sistema", event.data);
      }
    };

    this.socketChatAtivo.onopen = () => {
      if (document.getElementById("chatIdAtivo").value === chatId) {
        habilitarChat();
      }
    };

    this.socketChatAtivo.onerror = () => {
      desabilitarChat();
    };

    this.socketChatAtivo.onclose = () => {
      desabilitarChat();
      setTimeout(() => {
        if (document.getElementById("chatIdAtivo").value === chatId) {
          this.conectarWebSocketChat(chatId);
        }
      }, 3000);
    };
  },

  renderizarMensagemNaTela(autor, texto) {
    const caixa = document.getElementById("caixaDeMensagens");
    const meuNome = localStorage.getItem("usuario_nome");

    const divMsg = document.createElement("div");

    if (autor === "Sistema") {
      divMsg.style.cssText =
        "text-align: center; color: #888; font-size: 12px; margin: 5px 0;";
      divMsg.innerText = texto;
    } else if (autor === meuNome) {
      divMsg.style.cssText =
        "align-self: flex-end; background: #d1e7dd; padding: 10px 15px; border-radius: 15px 15px 0 15px; max-width: 70%; word-break: break-word;";
      divMsg.innerHTML = `<span style="font-size:11px; color:#555; display:block; margin-bottom:3px;">Você</span>${texto}`;
    } else {
      divMsg.style.cssText =
        "align-self: flex-start; background: white; border: 1px solid #ddd; padding: 10px 15px; border-radius: 15px 15px 15px 0; max-width: 70%; word-break: break-word;";
      divMsg.innerHTML = `<span style="font-size:11px; color:#1a73e8; display:block; margin-bottom:3px;">${autor}</span>${texto}`;
    }

    caixa.appendChild(divMsg);
    caixa.scrollTop = caixa.scrollHeight;
  },

  enviarMensagemChat() {
    const input = document.getElementById("inputNovaMensagem");
    const texto = input.value.trim();

    if (!texto || !this.socketChatAtivo) return;

    if (this.socketChatAtivo.readyState === WebSocket.OPEN) {
      this.socketChatAtivo.send(texto);
      input.value = "";
      input.focus();
    } else {
      this.showToast(
        "⚠️ A reconectar ao chat... Aguarde um segundo e tente novamente.",
      );
    }
  },

  // ==========================================
  // === UTILITÁRIOS DA INTERFACE / CAMERA ===
  // ==========================================

  pedirConfirmacao(msg, acao) {
    document.getElementById("textoConfirmacao").innerText = msg;
    this.acaoConfirmacao = acao;
    document.getElementById("modalConfirmar").style.display = "block";
  },

  executarConfirmacao() {
    if (this.acaoConfirmacao) this.acaoConfirmacao();
    document.getElementById("modalConfirmar").style.display = "none";
  },

  showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.style.cssText = `position:fixed; bottom:20px; right:20px; background:#1a73e8; color:white; padding:15px 25px; border-radius:12px; font-weight:bold; z-index:10000;`;
    toast.innerHTML = `<span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 500);
    }, 5000);
  },

  toggleModal(s) {
    this.modal.style.display = s ? "block" : "none";
  },
  toggleModalDetalhes(s) {
    this.modalDetalhes.style.display = s ? "block" : "none";
  },

  // Funcionalidades de Hardware/Câmera Mantidas
  ligarCameraOpenCV() {
    this.showToast("Iniciando varredura da câmera...");
  },

  conectarSocketSistema() {
    const nomeFake = "Monitor_" + Math.floor(Math.random() * 1000);
    const socket = new WebSocket(`${WS_URL}/ws/chat/${nomeFake}`);
    socket.onmessage = (event) => {
      if (event.data.includes("SISTEMA_CAMERA: INICIAR_MONITORAMENTO"))
        this.ativarAlertaVisualCamera();
    };
    socket.onclose = () => setTimeout(() => this.conectarSocketSistema(), 5000);
  },

  ativarAlertaVisualCamera() {
    this.showToast("📷 MONITORAMENTO ATIVADO: Sistema de hardware detectado!");
    if (this.labelCamera) {
      this.labelCamera.innerText = "MONITORAMENTO ATIVO";
      this.labelCamera.style.color = "#28a745";
    }
  },
};

window.abrirModal = () => KanbanApp.toggleModal(true);
window.fecharModal = () => KanbanApp.toggleModal(false);
window.fecharModalDetalhes = () => KanbanApp.toggleModalDetalhes(false);
window.fecharModalNovoRelatorio = () =>
  (document.getElementById("modalNovoRelatorio").style.display = "none");
window.fecharModalVerRelatorio = () =>
  (document.getElementById("modalVerRelatorio").style.display = "none");
window.fecharModalNovoChat = () =>
  (document.getElementById("modalNovoChat").style.display = "none");
window.KanbanApp = KanbanApp;
document.addEventListener("DOMContentLoaded", () => KanbanApp.init());
