const API_URL = window.APP_CONFIG?.API_URL || "http://127.0.0.1:8000";

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
          "#ff4d4d",
        );
      }
    } catch (error) {
      console.error("Erro na conexão:", error);
      this.showMessage("Não foi possível conectar ao servidor.", "#ff4d4d");
    }
  },

  handleSuccess(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario_nome", data.usuario);
    localStorage.setItem("usuario_id", data.usuario_id || "");
    localStorage.setItem("usuario_role", data.role || "funcionario");
    localStorage.setItem("empresa_id", data.empresa_id || "");
    localStorage.setItem("usuario_tem_rosto", data.tem_rosto ? "1" : "0");
    if (data.agente_desktop) {
      localStorage.setItem("agente_desktop", JSON.stringify(data.agente_desktop));
    } else {
      localStorage.removeItem("agente_desktop");
    }

    alert("Login realizado com sucesso!");
    window.location.href = data.tem_rosto
      ? "../Dashboard/dashboard.html"
      : "../Face/index.html?mode=register";
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
