try {
  const usuarioSalvo = localStorage.getItem("usuario");
  const usuario = usuarioSalvo
    ? JSON.parse(usuarioSalvo)
    : { nome: "Lawrence", id: "1" };
  const msgElement = document.getElementById("welcomeMsg");
  if (msgElement) msgElement.innerText = `Olá, ${usuario.nome}`;
} catch (e) {
  console.error("Erro ao carregar usuário:", e);
}

const tarefasMock = [
  { _id: "1", titulo: "Configurar OpenCV", status: "A Fazer" },
  { _id: "2", titulo: "Setup do Banco de Dados", status: "Fazendo" },
  { _id: "3", titulo: "Criar Tela de Login", status: "Concluído" },
];

function renderizarTarefas(lista) {
  const todo = document.getElementById("list-todo");
  const doing = document.getElementById("list-doing");
  const done = document.getElementById("list-done");

  if (!todo || !doing || !done) return;

  todo.innerHTML = "";
  doing.innerHTML = "";
  done.innerHTML = "";

  lista.forEach((t) => {
    const card = `<div class="task-card"><h4>${t.titulo}</h4><small>ID: ${t._id}</small></div>`;
    if (t.status === "A Fazer") todo.innerHTML += card;
    else if (t.status === "Fazendo") doing.innerHTML += card;
    else if (t.status === "Concluído") done.innerHTML += card;
  });
}

window.abrirModal = function () {
  const m = document.getElementById("modalTarefa");
  if (m) m.style.display = "block";
};

window.fecharModal = function () {
  const m = document.getElementById("modalTarefa");
  if (m) m.style.display = "none";
};

window.onclick = function (event) {
  const m = document.getElementById("modalTarefa");
  if (event.target == m) {
    fecharModal();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  renderizarTarefas(tarefasMock);

  const statusCamera = document.getElementById("cameraStatus");
  const previewBox = document.getElementById("videoPlaceholder");

  if (statusCamera && previewBox) {
    statusCamera.innerText = "OFF";
    statusCamera.style.color = "#28a745";
    previewBox.innerHTML = "<p style='color: #28a745; font-weight: bold;'></p>";
  }

  const form = document.getElementById("formTarefa");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      alert("Tarefa capturada com sucesso!");
      fecharModal();
      this.reset();
    });
  }

  const btnSair = document.getElementById("logoutBtn");
  if (btnSair) {
    btnSair.addEventListener("click", () => {
      localStorage.removeItem("usuario");
      window.location.href = "../Login/index.html";
    });
  }
});
