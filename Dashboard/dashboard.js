const API_URL = "http://127.0.0.1:8000";
const token = localStorage.getItem("token");

// Bloqueio de acesso: Se não houver token, volta para o Login
if (!token) {
  window.location.href = "../Login/index.html";
}

const KanbanApp = {
  meuCalendario: null,
  socketChatAtivo: null,

  init() {
    this.cacheSelectors();
    this.bindEvents();
    this.loadTasks();
    this.atualizarNomeUsuario();
    // this.conectarSocketSistema(); // Mantido comentado devido ao erro 403 da nova API, mas a lógica está salva abaixo!
  },

  cacheSelectors() {
    this.form = document.getElementById("formTarefa");
    this.formEditar = document.getElementById("formEditar");
    this.formNovoRelatorio = document.getElementById("formNovoRelatorio");

    const formChat = document.getElementById("formNovoChat");
    if (formChat) formChat.onsubmit = (e) => this.criarChat(e);

    this.modal = document.getElementById("modalTarefa");
    this.modalDetalhes = document.getElementById("modalDetalhes");
    this.modalNovoRelatorio = document.getElementById("modalNovoRelatorio");
    this.modalVerRelatorio = document.getElementById("modalVerRelatorio");

    this.columns = document.querySelectorAll(".column");
    this.labelCamera = document.getElementById("labelCamera");
    this.cameraVisor = document.getElementById("cameraStatus");
  },

  bindEvents() {
    // Eventos do Kanban e Relatórios
    if (this.form) this.form.onsubmit = (e) => this.handleFormSubmit(e);
    if (this.formEditar)
      this.formEditar.onsubmit = (e) => this.handleEditSubmit(e);
    if (this.formNovoRelatorio)
      this.formNovoRelatorio.onsubmit = (e) => this.handleRelatorioSubmit(e);

    document.getElementById("logoutBtn").onclick = () => {
      localStorage.clear();
      location.reload();
    };

    // Drag and Drop do Kanban
    this.columns.forEach((col) => {
      col.ondragover = (e) => e.preventDefault();
      col.ondrop = (e) => this.handleDrop(e);
    });

    // Fechar modais clicando fora deles
    window.onclick = (e) => {
      if (e.target === this.modal) this.toggleModal(false);
      if (e.target === this.modalDetalhes) this.toggleModalDetalhes(false);
      if (e.target === this.modalNovoRelatorio)
        this.modalNovoRelatorio.style.display = "none";
      if (e.target === this.modalVerRelatorio)
        this.modalVerRelatorio.style.display = "none";
    };

    // Enviar mensagem no chat ao apertar "Enter"
    const inputChat = document.getElementById("inputNovaMensagem");
    if (inputChat) {
      inputChat.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.enviarMensagemChat();
      });
    }
  },

  atualizarNomeUsuario() {
    const nomeUsuario = localStorage.getItem("usuario_nome");
    if (nomeUsuario) {
      document.getElementById("welcomeMsg").innerText = `Olá, ${nomeUsuario}!`;
    }
  },

  trocarTela(tela) {
    // 1. Esconde todos os menus e telas
    document.getElementById("menu-kanban").classList.remove("active");
    document.getElementById("menu-relatorio").classList.remove("active");
    document.getElementById("menu-chat").classList.remove("active");

    document.getElementById("secaoKanban").style.display = "none";
    document.getElementById("secaoRelatorio").style.display = "none";
    document.getElementById("secaoChat").style.display = "none";

    // 2. Mostra a tela correta
    if (tela === "kanban") {
      document.getElementById("menu-kanban").classList.add("active");
      document.getElementById("secaoKanban").style.display = "grid";
      this.loadTasks();
    } else if (tela === "relatorio") {
      document.getElementById("menu-relatorio").classList.add("active");
      document.getElementById("secaoRelatorio").style.display = "block";

      if (!this.meuCalendario) {
        this.iniciarCalendario();
      } else {
        setTimeout(() => {
          this.meuCalendario.updateSize();
          this.meuCalendario.refetchEvents();
        }, 100);
      }
    } else if (tela === "chat") {
      document.getElementById("menu-chat").classList.add("active");
      document.getElementById("secaoChat").style.display = "block";
      this.carregarListaDeChats();
    }
  },

  // ==========================================
  // === FUNÇÕES DO CALENDÁRIO / RELATÓRIOS ===
  // ==========================================

  iniciarCalendario() {
    const calendarEl = document.getElementById("calendar");

    this.meuCalendario = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      locale: "pt-br",
      height: 600,
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "",
      },

      events: async (info, successCallback, failureCallback) => {
        try {
          const resp = await fetch(`${API_URL}/tarefas`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const todasAsTarefas = await resp.json();

          const relatorios = todasAsTarefas.filter(
            (t) => t.status === "Relatorio",
          );

          const eventosFormatados = relatorios.map((t) => {
            const partes = t.titulo.split(" | ");
            return {
              id: t._id,
              title: partes.length > 1 ? partes[1] : t.titulo,
              start: partes[0],
              color: "#34a853",
              extendedProps: { descricao: t.descricao },
            };
          });
          successCallback(eventosFormatados);
        } catch (error) {
          failureCallback(error);
        }
      },

      // Clica num dia vazio -> Abre Modal Criar
      dateClick: (info) => {
        // VERIFICAÇÃO: Se já existe um evento nesse dia
        const eventosNoDia = this.meuCalendario
          .getEvents()
          .filter((e) => e.startStr === info.dateStr);
        if (eventosNoDia.length > 0) {
          this.showToast("⚠️ Você já enviou um relatório hoje!");
          return;
        }

        document.getElementById("dataOcultaRelatorio").value = info.dateStr;
        const dataFormatada = new Date(
          info.dateStr + "T12:00:00",
        ).toLocaleDateString("pt-BR");
        document.getElementById("dataEscolhidaRelatorio").innerText =
          "Data: " + dataFormatada;

        // Limpa os campos
        document.getElementById("tituloRelatorio").value = "";
        document.getElementById("resumoRelatorio").value = "";
        document.getElementById("atividadesRelatorio").value = "";
        document.getElementById("metaRelatorio").value = "";
        document.getElementById("dificuldadeRelatorio").value = "Médio";

        this.modalNovoRelatorio.style.display = "block";
      },

      eventClick: (info) => {
        document.getElementById("idOcultoRelatorio").value = info.event.id;
        document.getElementById("dataOcultaEdicaoRelatorio").value =
          info.event.startStr;
        document.getElementById("editTituloRelatorio").value = info.event.title;

        // Tenta ler os dados estruturados da descrição
        try {
          const dados = JSON.parse(info.event.extendedProps.descricao);
          document.getElementById("editResumoRelatorio").value =
            dados.resumo || "";
          document.getElementById("editAtividadesRelatorio").value =
            dados.atividades || "";
          document.getElementById("editDificuldadeRelatorio").value =
            dados.dificuldade || "Médio";
          document.getElementById("editMetaRelatorio").value = dados.meta || "";
        } catch (e) {
          // Se for um relatório antigo sem JSON, joga tudo no resumo
          document.getElementById("editResumoRelatorio").value =
            info.event.extendedProps.descricao;
        }

        const dataFormatada = new Date(
          info.event.startStr + "T12:00:00",
        ).toLocaleDateString("pt-BR");
        document.getElementById("verDataRelatorio").innerText =
          "Data: " + dataFormatada;
        this.modalVerRelatorio.style.display = "block";
      },
    });

    this.meuCalendario.render();
    setTimeout(() => this.meuCalendario.updateSize(), 200);
  },

  async handleRelatorioSubmit(e) {
    e.preventDefault();
    const titulo = document.getElementById("tituloRelatorio").value;
    const dataOculta = document.getElementById("dataOcultaRelatorio").value;

    // Criamos um objeto com todos os novos campos
    const dadosRelatorio = {
      resumo: document.getElementById("resumoRelatorio").value,
      atividades: document.getElementById("atividadesRelatorio").value,
      dificuldade: document.getElementById("dificuldadeRelatorio").value,
      meta: document.getElementById("metaRelatorio").value,
    };

    const payload = {
      titulo: `${dataOculta} | ${titulo}`,
      descricao: JSON.stringify(dadosRelatorio), // Salvamos como JSON na descrição
      status: "Relatorio",
      usuario_id: "auth",
    };

    const resp = await fetch(`${API_URL}/tarefas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (resp.ok) {
      this.modalNovoRelatorio.style.display = "none";
      this.meuCalendario.refetchEvents();
      this.showToast("Relatório diário salvo!");
    }
  },

  async editarRelatorio() {
    const id = document.getElementById("idOcultoRelatorio").value;
    const dataOculta = document.getElementById(
      "dataOcultaEdicaoRelatorio",
    ).value;

    const dadosRelatorio = {
      resumo: document.getElementById("editResumoRelatorio").value,
      atividades: document.getElementById("editAtividadesRelatorio").value,
      dificuldade: document.getElementById("editDificuldadeRelatorio").value,
      meta: document.getElementById("editMetaRelatorio").value,
    };

    const payload = {
      titulo: `${dataOculta} | ${document.getElementById("editTituloRelatorio").value}`,
      descricao: JSON.stringify(dadosRelatorio),
    };

    const resp = await fetch(`${API_URL}/tarefas/editar-texto/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (resp.ok) {
      this.modalVerRelatorio.style.display = "none";
      this.meuCalendario.refetchEvents();
      this.showToast("Relatório atualizado!");
    }

    try {
      const resp = await fetch(`${API_URL}/tarefas/editar-texto/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        this.modalVerRelatorio.style.display = "none";
        if (this.meuCalendario) this.meuCalendario.refetchEvents();
        this.showToast("Relatório editado com sucesso!");
      } else {
        this.showToast("Erro ao editar o relatório.");
      }
    } catch (err) {
      this.showToast("Erro de conexão.");
    }
  },

  async excluirRelatorio() {
    const id = document.getElementById("idOcultoRelatorio").value;

    this.pedirConfirmacao(
      "Deseja realmente excluir este relatório do calendário?",
      async () => {
        const resp = await fetch(`${API_URL}/tarefas/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (resp.ok) {
          this.modalVerRelatorio.style.display = "none";
          if (this.meuCalendario) this.meuCalendario.refetchEvents();
          this.showToast("Relatório excluído com sucesso!");
        }
      },
    );
  },

  // ==========================================
  // === FUNÇÕES DO CHAT CORPORATIVO ===
  // ==========================================

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
          const btn = document.createElement("button");
          btn.innerText = chat.nome_chat;
          btn.style.cssText =
            "width: 100%; padding: 12px; margin-bottom: 8px; background: #f0f0f0; border: none; border-radius: 6px; text-align: left; cursor: pointer; transition: 0.2s;";

          btn.onmouseover = () => (btn.style.background = "#e0e0e0");
          btn.onmouseout = () => (btn.style.background = "#f0f0f0");

          btn.onclick = () =>
            this.abrirSalaDeChat(chat.id_chat, chat.nome_chat);

          listaDiv.appendChild(btn);
        });
      } else {
        listaDiv.innerHTML =
          '<p style="color: red; font-size: 14px;">Erro ao carregar chats.</p>';
      }
    } catch (err) {
      console.error(err);
    }
  },

  async abrirModalNovoChat() {
    document.getElementById("nomeNovoChat").value = "";
    const listaDiv = document.getElementById("listaFuncionariosChat");
    listaDiv.innerHTML =
      '<p style="font-size: 12px; color: #888;">Carregando funcionários...</p>';
    document.getElementById("modalNovoChat").style.display = "block";

    try {
      // Puxa a lista de funcionários da API
      const resp = await fetch(`${API_URL}/empresa/funcionarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.ok) {
        const funcionarios = await resp.json();
        if (funcionarios.length === 0) {
          listaDiv.innerHTML =
            "<p style='font-size: 13px; color: #888;'>Nenhum funcionário encontrado na sua empresa.</p>";
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
          "<p style='color: #dc3545; font-size: 13px; font-weight: bold;'>⚠️ Apenas usuários 'admin' podem buscar funcionários e criar salas de chat.</p>";
      }
    } catch (err) {
      listaDiv.innerHTML = "<p style='color: red;'>Erro de conexão.</p>";
    }
  },

  async criarChat(e) {
    e.preventDefault();
    const nomeChat = document.getElementById("nomeNovoChat").value;

    // Pega todos os checkboxes que foram marcados
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
          funcionarios_ids: idsSelecionados, // Manda os ids pra API
        }),
      });

      if (resp.ok) {
        fecharModalNovoChat();
        this.showToast("Chat criado com sucesso!");
        this.carregarListaDeChats(); // Atualiza a barra lateral na hora
      } else {
        const erro = await resp.json();
        this.showToast(erro.detail || "Erro ao criar chat.");
      }
    } catch (err) {
      this.showToast("Erro de conexão.");
    }
  },

  async abrirSalaDeChat(chatId, nomeChat) {
    document.getElementById("cabecalhoChatAtual").innerText =
      `Chat: ${nomeChat}`;
    document.getElementById("chatIdAtivo").value = chatId;

    document.getElementById("inputNovaMensagem").disabled = false;
    document.getElementById("btnEnviarMensagem").disabled = false;
    document.getElementById("inputNovaMensagem").focus();

    const caixa = document.getElementById("caixaDeMensagens");
    caixa.innerHTML =
      '<p style="text-align:center; color:#aaa; font-size:12px;">Carregando histórico...</p>';

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
        '<p style="color:red; text-align:center;">Erro ao puxar histórico.</p>';
    }

    if (this.socketChatAtivo) {
      this.socketChatAtivo.close();
    }

    this.socketChatAtivo = new WebSocket(
      `ws://127.0.0.1:8000/ws/chat/${chatId}?token=${token}`,
    );

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
        "align-self: flex-end; background: #d1e7dd; padding: 10px 15px; border-radius: 15px 15px 0 15px; max-width: 70%;";
      divMsg.innerHTML = `<span style="font-size:11px; color:#555; display:block; margin-bottom:3px;">Você</span>${texto}`;
    } else {
      divMsg.style.cssText =
        "align-self: flex-start; background: white; border: 1px solid #ddd; padding: 10px 15px; border-radius: 15px 15px 15px 0; max-width: 70%;";
      divMsg.innerHTML = `<span style="font-size:11px; color:#1a73e8; display:block; margin-bottom:3px;">${autor}</span>${texto}`;
    }

    caixa.appendChild(divMsg);
    caixa.scrollTop = caixa.scrollHeight;
  },

  enviarMensagemChat() {
    const input = document.getElementById("inputNovaMensagem");
    const texto = input.value.trim();

    if (!texto || !this.socketChatAtivo) return;

    this.socketChatAtivo.send(texto);
    input.value = "";
  },

  // ==========================================
  // === FUNÇÕES DO KANBAN ORIGINAL ===
  // ==========================================

  async loadTasks() {
    try {
      const resp = await fetch(`${API_URL}/tarefas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const todas = await resp.json();
        // IMPORTANTE: O Kanban só mostra o que não é relatório
        const tarefasKanban = todas.filter((t) => t.status !== "Relatorio");
        this.renderTasks(tarefasKanban);
      }
    } catch (error) {
      console.error("Erro ao carregar:", error);
    }
  },

  renderTasks(lista) {
    const containers = {
      "A Fazer": "list-todo",
      Fazendo: "list-doing",
      Concluído: "list-done",
    };
    Object.values(containers).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });

    lista.forEach((t) => {
      const card = document.createElement("div");
      card.className = "task-card";
      card.draggable = true;
      card.id = t._id;

      card.onclick = () => this.abrirEdicao(t._id, t.titulo, t.descricao);

      card.ondragstart = (e) => {
        e.dataTransfer.setData("text", e.target.id);
        e.target.style.opacity = "0.5";
      };
      card.ondragend = (e) => (e.target.style.opacity = "1");

      card.innerHTML = `
                <h4>${t.titulo}</h4>
                <button onclick="event.stopPropagation(); KanbanApp.deleteTask('${t._id}')">🗑️</button>
            `;

      const container = document.getElementById(containers[t.status]);
      if (container) container.appendChild(card);
    });
  },

  abrirEdicao(id, titulo, descricao) {
    document.getElementById("editId").value = id;
    document.getElementById("editTitulo").value = titulo;
    document.getElementById("editDesc").value = descricao || "";
    this.toggleModalDetalhes(true);
  },

  async handleEditSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("editId").value;
    const payload = {
      titulo: document.getElementById("editTitulo").value,
      descricao: document.getElementById("editDesc").value,
    };

    const resp = await fetch(`${API_URL}/tarefas/editar-texto/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
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

    const statusMap = {
      "to-do": "A Fazer",
      doing: "Fazendo",
      done: "Concluído",
    };
    const novoStatus = statusMap[column.id];

    await fetch(`${API_URL}/tarefas/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: novoStatus }),
    });
    this.loadTasks();
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const payload = {
      titulo: document.getElementById("tituloTarefa").value,
      descricao: document.getElementById("descTarefa").value,
      status: "A Fazer",
      usuario_id: "auth",
    };
    const resp = await fetch(`${API_URL}/tarefas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (resp.ok) {
      this.toggleModal(false);
      this.form.reset();
      this.loadTasks();
    }
  },

  async deleteTask(id) {
    this.pedirConfirmacao(
      "Tem certeza que deseja excluir esta tarefa do Kanban?",
      async () => {
        await fetch(`${API_URL}/tarefas/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        this.loadTasks();
        this.showToast("Tarefa excluída com sucesso!");
      },
    );
  },

  // ==========================================
  // === UTILITÁRIOS ORIGINAIS (MANTIDOS) ===
  // ==========================================

  conectarSocketSistema() {
    const nomeFake = "Monitor_" + Math.floor(Math.random() * 1000);
    const socket = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${nomeFake}`);

    socket.onmessage = (event) => {
      if (event.data.includes("SISTEMA_CAMERA: INICIAR_MONITORAMENTO")) {
        this.ativarAlertaVisualCamera();
      }
    };

    socket.onclose = () => setTimeout(() => this.conectarSocketSistema(), 5000);
  },

  ativarAlertaVisualCamera() {
    this.showToast("📷 MONITORAMENTO ATIVADO: Sistema de hardware detectado!");

    if (this.labelCamera) {
      this.labelCamera.innerText = "MONITORAMENTO ATIVO";
      this.labelCamera.style.color = "#28a745";
    }
    if (this.cameraVisor) {
      this.cameraVisor.style.borderColor = "#28a745";
      this.cameraVisor.style.boxShadow = "0 0 15px rgba(40, 167, 69, 0.4)";
    }
  },

  showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; background: #1a73e8; 
            color: white; padding: 15px 25px; border-radius: 12px; 
            box-shadow: 0 10px 20px rgba(0,0,0,0.2); z-index: 10000;
            font-weight: bold; animation: slideIn 0.5s ease-out;
        `;
    toast.innerHTML = `<span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 500);
    }, 5000);
  },

  acaoConfirmacao: null,

  pedirConfirmacao(mensagem, acao) {
    document.getElementById("textoConfirmacao").innerText = mensagem;
    this.acaoConfirmacao = acao;
    document.getElementById("modalConfirmar").style.display = "block";
  },

  executarConfirmacao() {
    if (this.acaoConfirmacao) {
      this.acaoConfirmacao();
    }
    document.getElementById("modalConfirmar").style.display = "none";
  },

  toggleModal(s) {
    this.modal.style.display = s ? "block" : "none";
  },

  toggleModalDetalhes(s) {
    this.modalDetalhes.style.display = s ? "block" : "none";
  },

  ligarCameraOpenCV() {
    this.showToast("Iniciando varredura da câmera...");
  },
};

// Funções globais para os botões do HTML
window.abrirModal = () => KanbanApp.toggleModal(true);
window.fecharModal = () => KanbanApp.toggleModal(false);
window.fecharModalDetalhes = () => KanbanApp.toggleModalDetalhes(false);
window.fecharModalNovoRelatorio = () =>
  (document.getElementById("modalNovoRelatorio").style.display = "none");
window.fecharModalVerRelatorio = () =>
  (document.getElementById("modalVerRelatorio").style.display = "none");
window.KanbanApp = KanbanApp;

// Inicializa a aplicação
document.addEventListener("DOMContentLoaded", () => KanbanApp.init());
window.fecharModalNovoChat = () =>
  (document.getElementById("modalNovoChat").style.display = "none");
