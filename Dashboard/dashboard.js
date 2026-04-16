const API_URL = "http://127.0.0.1:8000";
const token = localStorage.getItem("token");

// Bloqueio de acesso: Se não houver token, volta para o Login
if (!token) {
  window.location.href = "../Login/index.html";
}

const KanbanApp = {
  init() {
    this.cacheSelectors();
    this.bindEvents();
    this.loadTasks();
    this.conectarSocketSistema();
  },

  cacheSelectors() {
    this.form = document.getElementById("formTarefa");
    this.formEditar = document.getElementById("formEditar");
    this.modal = document.getElementById("modalTarefa");
    this.modalDetalhes = document.getElementById("modalDetalhes");
    this.columns = document.querySelectorAll(".column");
    this.labelCamera = document.getElementById("labelCamera");
    this.cameraVisor = document.getElementById("cameraStatus");
  },

  bindEvents() {
    if (this.form) this.form.onsubmit = (e) => this.handleFormSubmit(e);
    if (this.formEditar)
      this.formEditar.onsubmit = (e) => this.handleEditSubmit(e);

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
    };
  },

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

  // GET /tarefas
  async loadTasks() {
    try {
      const resp = await fetch(`${API_URL}/tarefas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const tarefas = await resp.json();
        this.renderTasks(tarefas);
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

  // PUT /tarefas/editar-texto/{id}
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

  // PUT /tarefas/{id}
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

  // POST /tarefas
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

  // DELETE /tarefas/{id}
  async deleteTask(id) {
    if (confirm("Excluir esta tarefa?")) {
      await fetch(`${API_URL}/tarefas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      this.loadTasks();
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

  toggleModal(s) {
    this.modal.style.display = s ? "block" : "none";
  },
  toggleModalDetalhes(s) {
    this.modalDetalhes.style.display = s ? "block" : "none";
  },
};

window.abrirModal = () => KanbanApp.toggleModal(true);
window.fecharModal = () => KanbanApp.toggleModal(false);
window.fecharModalDetalhes = () => KanbanApp.toggleModalDetalhes(false);
window.KanbanApp = KanbanApp;

document.addEventListener("DOMContentLoaded", () => KanbanApp.init());
