const API_URL = "http://127.0.0.1:8000";

const LoginApp = {
  init() {
    this.cacheSelectors();
    this.bindEvents();
  },

  cacheSelectors() {
    this.form = document.getElementById("loginForm");
    this.messageDiv = document.getElementById("message");
  },

  bindEvents() {
    if (this.form) {
      this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    }
  },

  async handleSubmit(e) {
    e.preventDefault();

    const payload = {
      email: document.getElementById("email").value,
      senha: document.getElementById("password").value,
    };

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resultado = await response.json();

      if (response.ok) {
        this.handleSuccess(resultado);
      } else {
        this.showMessage(
          resultado.detail || "E-mail ou senha incorretos.",
          "red",
        );
      }
    } catch (error) {
      console.error("Erro na conexão:", error);
      this.showMessage("Não foi possível conectar ao servidor.", "red");
    }
  },

  handleSuccess(data) {
    alert("Login realizado com sucesso!");

    localStorage.setItem("usuario_id", data.usuario.id);
    localStorage.setItem("usuario_nome", data.usuario.nome);

    window.location.href = "../Dashboard/dashboard.html";
  },

  showMessage(text, color) {
    if (this.messageDiv) {
      this.messageDiv.innerText = text;
      this.messageDiv.style.display = "block";
      this.messageDiv.style.color = color;
    }
  },
};

document.addEventListener("DOMContentLoaded", () => LoginApp.init());
