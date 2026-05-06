const API_URL = "http://127.0.0.1:8000";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "../Login/index.html";
}

const KanbanApp = {
  meuCalendario: null,

  init() {
    this.cacheSelectors();
    this.bindEvents();
    this.loadTasks();
    // this.conectarSocketSistema();

    const nomeUsuario = localStorage.getItem("usuario_nome");
    if (nomeUsuario) {
      document.getElementById("welcomeMsg").innerText = `Olá, ${nomeUsuario}!`;
    }
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
  },

  bindEvents() {
    if (this.form) this.form.onsubmit = (e) => this.handleFormSubmit(e);
    if (this.formEditar)
      this.formEditar.onsubmit = (e) => this.handleEditSubmit(e);
    if (this.formNovoRelatorio)
      this.formNovoRelatorio.onsubmit = (e) => this.handleRelatorioSubmit(e);

    document.getElementById("logoutBtn").onclick = () => {
      localStorage.clear();
      location.reload();
    };

    this.columns.forEach((col) => {
      col.ondragover = (e) => e.preventDefault();
      col.ondrop = (e) => this.handleDrop(e);
    });

    window.onclick = (e) => {
      if (e.target === this.modal) this.toggleModal(false);
      if (e.target === this.modalDetalhes) this.toggleModalDetalhes(false);
      if (e.target === this.modalNovoRelatorio)
        this.modalNovoRelatorio.style.display = "none";
      if (e.target === this.modalVerRelatorio)
        this.modalVerRelatorio.style.display = "none";
    };
  },

  // === LÓGICA DE TROCA DE TELA ===
  trocarTela(tela) {
    document.getElementById("menu-kanban").classList.remove("active");
    document.getElementById("menu-relatorio").classList.remove("active");
    document.getElementById("secaoKanban").style.display = "none";
    document.getElementById("secaoRelatorio").style.display = "none";

    if (tela === "kanban") {
      document.getElementById("menu-kanban").classList.add("active");
      document.getElementById("secaoKanban").style.display = "grid";
      this.loadTasks(); // Recarrega Kanban
    } else if (tela === "relatorio") {
      document.getElementById("menu-relatorio").classList.add("active");
      document.getElementById("secaoRelatorio").style.display = "block";

      // Inicia o calendário só quando a aba for clicada
      if (!this.meuCalendario) {
        this.iniciarCalendario();
      } else {
        // Se já existe, força ele a arrumar o tamanho e buscar dados
        setTimeout(() => {
          this.meuCalendario.updateSize();
          this.meuCalendario.refetchEvents();
        }, 100);
      }
    }
  },

  // === LÓGICA DO CALENDÁRIO DE RELATÓRIOS ===
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

      // Busca dados na API e filtra só os relatórios
      events: async (info, successCallback, failureCallback) => {
        try {
          const resp = await fetch(`${API_URL}/tarefas`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const todasAsTarefas = await resp.json();

          // Filtra tarefas salvas com status "Relatorio"
          const relatorios = todasAsTarefas.filter(
            (t) => t.status === "Relatorio",
          );

          const eventosFormatados = relatorios.map((t) => {
            const partes = t.titulo.split(" | "); // Separa a data do título
            return {
              id: t._id,
              title: partes.length > 1 ? partes[1] : t.titulo,
              start: partes[0], // A data oculta
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
        document.getElementById("dataOcultaRelatorio").value = info.dateStr;

        const dataFormatada = new Date(
          info.dateStr + "T12:00:00",
        ).toLocaleDateString("pt-BR");
        document.getElementById("dataEscolhidaRelatorio").innerText =
          "Data: " + dataFormatada;

        document.getElementById("tituloRelatorio").value = "";
        document.getElementById("descRelatorio").value = "";

        this.modalNovoRelatorio.style.display = "block";
      },

      // Clica num evento -> Abre Modal Ver/Excluir
      // Clica num evento -> Abre Modal para Editar/Excluir
      eventClick: (info) => {
        document.getElementById("idOcultoRelatorio").value = info.event.id;

        // SALVA A DATA ESCONDIDA: Fundamental para não perdermos a data ao editar o título
        document.getElementById("dataOcultaEdicaoRelatorio").value =
          info.event.startStr;

        // Preenche as caixinhas de texto com o que já estava escrito
        document.getElementById("editTituloRelatorio").value = info.event.title;
        document.getElementById("editDescRelatorio").value =
          info.event.extendedProps.descricao || "";

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

  // POST: Salvar Relatório
  async handleRelatorioSubmit(e) {
    e.preventDefault();
    const tituloNormal = document.getElementById("tituloRelatorio").value;
    const desc = document.getElementById("descRelatorio").value;
    const dataOculta = document.getElementById("dataOcultaRelatorio").value;

    const tituloComData = `${dataOculta} | ${tituloNormal}`;

    const payload = {
      titulo: tituloComData,
      descricao: desc,
      status: "Relatorio", // Isola do Kanban
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
      if (this.meuCalendario) this.meuCalendario.refetchEvents();
      this.showToast("Relatório salvo no calendário!");
    }
  },

  // DELETE: Excluir Relatório
  async excluirRelatorio() {
    const id = document.getElementById("idOcultoRelatorio").value;
    if (confirm("Deseja excluir este relatório?")) {
      const resp = await fetch(`${API_URL}/tarefas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        this.modalVerRelatorio.style.display = "none";
        if (this.meuCalendario) this.meuCalendario.refetchEvents();
        this.showToast("Relatório excluído!");
      }
    }
  },

  // PUT: Editar Relatório
  async editarRelatorio() {
    const id = document.getElementById("idOcultoRelatorio").value;
    const tituloEditado = document
      .getElementById("editTituloRelatorio")
      .value.trim();
    const descEditada = document
      .getElementById("editDescRelatorio")
      .value.trim();

    // Pega a data escondida que salvamos no clique
    const dataOculta = document.getElementById(
      "dataOcultaEdicaoRelatorio",
    ).value;

    if (!tituloEditado) return this.showToast("O título não pode ficar vazio!");

    // TRUQUE: Remonta o título junto com a data antes de mandar pra API
    const tituloComData = `${dataOculta} | ${tituloEditado}`;

    const payload = {
      titulo: tituloComData,
      descricao: descEditada,
    };

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

  // === LÓGICA DO KANBAN ORIGINAL ===

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
    if (confirm("Excluir esta tarefa?")) {
      await fetch(`${API_URL}/tarefas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      this.loadTasks();
    }
  },

  // === SOCKET E EXTRAS ===

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
    this.showToast("📷 MONITORAMENTO ATIVADO: Sistema detectado!");
    if (this.labelCamera) {
      this.labelCamera.innerText = "MONITORAMENTO ATIVO";
      this.labelCamera.style.color = "#28a745";
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
    }, 3000);
  },

  toggleModal(s) {
    this.modal.style.display = s ? "block" : "none";
  },
  toggleModalDetalhes(s) {
    this.modalDetalhes.style.display = s ? "block" : "none";
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

document.addEventListener("DOMContentLoaded", () => KanbanApp.init());
