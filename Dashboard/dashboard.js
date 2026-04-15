const API_URL = "http://127.0.0.1:8000";

if (!localStorage.getItem("usuario_id")) {
  window.location.href = "../Login/index.html";
}

const KanbanApp = {
  init() {
    this.cacheSelectors();
    this.bindEvents();
    this.loadTasks();
  },

  cacheSelectors() {
    this.form = document.getElementById("formTarefa");
    this.modal = document.getElementById("modalTarefa");
    this.modalDetalhes = document.getElementById("modalDetalhes");
    this.columns = document.querySelectorAll(".column");
    this.logoutBtn = document.getElementById("logoutBtn");
  },

  bindEvents() {
    if (this.form)
      this.form.addEventListener("submit", (e) => this.handleFormSubmit(e));

    if (this.logoutBtn)
      this.logoutBtn.addEventListener("click", () => this.handleLogout());

    this.columns.forEach((column) => {
      column.addEventListener("dragover", (e) => e.preventDefault());
      column.addEventListener("drop", (e) => this.handleDrop(e));
    });

    window.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.toggleModal(false);
      }
      if (e.target === this.modalDetalhes) {
        this.toggleModalDetalhes(false);
      }
    });
  },

  async loadTasks() {
    const usuarioId = localStorage.getItem("usuario_id");
    try {
      const response = await fetch(`${API_URL}/tarefas/${usuarioId}`);
      if (response.ok) {
        const tarefas = await response.json();
        this.renderTasks(tarefas);
      }
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
    }
  },

  renderTasks(lista) {
    const containers = {
      "A Fazer": document.getElementById("list-todo"),
      Fazendo: document.getElementById("list-doing"),
      Concluído: document.getElementById("list-done"),
    };

    Object.values(containers).forEach((c) => {
      if (c) c.innerHTML = "";
    });

    lista.forEach((t) => {
      const card = document.createElement("div");
      card.className = "task-card";
      card.draggable = true;
      card.id = t._id;

      card.onclick = (e) => {
        if (e.target.tagName !== "BUTTON") {
          this.showTaskDetails(t.titulo, t.descricao);
        }
      };

      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", e.target.id);
        e.target.style.opacity = "0.5";
      });

      card.addEventListener("dragend", (e) => {
        e.target.style.opacity = "1";
      });

      card.innerHTML = `
                <h4 style="margin: 0; pointer-events: none;">${t.titulo}</h4>
                <button onclick="KanbanApp.deleteTask('${t._id}')" style="float:right; border:none; background:none; cursor:pointer;">🗑️</button>
            `;

      const target = containers[t.status];
      if (target) target.appendChild(card);
    });
  },

  showTaskDetails(titulo, descricao) {
    document.getElementById("detalheTitulo").innerText = titulo;
    document.getElementById("detalheDesc").innerText =
      descricao || "Sem descrição disponível.";
    this.toggleModalDetalhes(true);
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const payload = {
      titulo: document.getElementById("tituloTarefa").value,
      descricao: document.getElementById("descTarefa").value,
      status: "A Fazer",
      usuario_id: localStorage.getItem("usuario_id"),
    };

    try {
      const response = await fetch(`${API_URL}/tarefas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        this.toggleModal(false);
        this.form.reset();
        this.loadTasks();
      }
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);
    }
  },

  async handleDrop(e) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    const column = e.target.closest(".column");

    if (!column || !taskId) return;

    const statusMap = {
      "to-do": "A Fazer",
      doing: "Fazendo",
      done: "Concluído",
    };

    const novoStatus = statusMap[column.id];
    await this.moveTask(taskId, novoStatus);
  },

  async moveTask(id, novoStatus) {
    try {
      const response = await fetch(`${API_URL}/tarefas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (response.ok) this.loadTasks();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  },

  async deleteTask(id) {
    if (!confirm("Excluir atividade?")) return;
    try {
      const response = await fetch(`${API_URL}/tarefas/${id}`, {
        method: "DELETE",
      });
      if (response.ok) this.loadTasks();
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  },

  toggleModal(show) {
    if (this.modal) this.modal.style.display = show ? "block" : "none";
  },

  toggleModalDetalhes(show) {
    if (this.modalDetalhes)
      this.modalDetalhes.style.display = show ? "block" : "none";
  },

  handleLogout() {
    localStorage.clear();
    window.location.href = "../Login/index.html";
  },
};

window.abrirModal = () => KanbanApp.toggleModal(true);
window.fecharModal = () => KanbanApp.toggleModal(false);
window.fecharModalDetalhes = () => KanbanApp.toggleModalDetalhes(false);
window.KanbanApp = KanbanApp;

document.addEventListener("DOMContentLoaded", () => KanbanApp.init());
