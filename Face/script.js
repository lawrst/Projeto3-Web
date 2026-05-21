const API_URL = window.APP_CONFIG?.API_URL || "http://127.0.0.1:8000";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "../Login/index.html";
}

const params = new URLSearchParams(window.location.search);
let mode = params.get("mode") === "ponto" ? "ponto" : "register";

const FaceApp = {
  stream: null,

  init() {
    this.cacheElements();
    this.syncMode();
    this.bindEvents();
    this.loadIdentity();
    this.startCamera();
  },

  cacheElements() {
    this.video = document.getElementById("video");
    this.canvas = document.getElementById("canvas");
    this.captureBtn = document.getElementById("captureBtn");
    this.switchBtn = document.getElementById("switchBtn");
    this.message = document.getElementById("message");
    this.title = document.getElementById("title");
    this.description = document.getElementById("description");
    this.modeLabel = document.getElementById("modeLabel");
    this.modeBadge = document.getElementById("modeBadge");
  },

  syncMode() {
    this.applyMode(mode);
  },

  bindEvents() {
    this.captureBtn?.addEventListener("click", () => this.captureAndSend());
    this.switchBtn?.addEventListener("click", () => {
      if (mode === "register" && localStorage.getItem("usuario_tem_rosto") === "1") {
        window.location.href = "../Dashboard/dashboard.html";
        return;
      }
      mode = mode === "register" ? "ponto" : "register";
      this.applyMode(mode);
    });

    window.addEventListener("beforeunload", () => this.stopCamera());
  },

  applyMode(nextMode) {
    mode = nextMode;
    const isRegister = mode === "register";

    this.title.textContent = isRegister ? "Cadastre sua facial" : "Bata seu ponto";
    this.description.textContent = isRegister
      ? "Registre seu rosto para liberar o acesso ao ponto facial e ao dashboard."
      : "Capture seu rosto para validar a entrada com reconhecimento facial.";
    this.modeLabel.textContent = isRegister ? "Onboarding facial" : "Ponto facial";
    this.modeBadge.textContent = isRegister ? "Cadastro" : "Ponto";
    this.captureBtn.textContent = isRegister ? "Capturar e cadastrar" : "Capturar e bater ponto";
    this.switchBtn.textContent = isRegister ? "Trocar para ponto" : "Trocar para cadastro";

    if (isRegister) {
      const temRosto = localStorage.getItem("usuario_tem_rosto") === "1";
      if (temRosto) {
        this.switchBtn.textContent = "Ir para o dashboard";
      }
    }
  },

  setMessage(text, type = "info") {
    if (!this.message) return;
    this.message.textContent = text;
    this.message.style.color = type === "error" ? "#fecaca" : type === "success" ? "#86efac" : "#cbd5e1";
  },

  async loadIdentity() {
    const nome = localStorage.getItem("usuario_nome") || "Usuário";
    document.getElementById("usuarioNome").textContent = nome;

    try {
      const resp = await fetch(`${API_URL}/rosto/estado`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) return;

      const dados = await resp.json();
      localStorage.setItem("usuario_tem_rosto", dados.tem_rosto ? "1" : "0");

      if (mode === "register" && dados.tem_rosto) {
        this.setMessage("Seu rosto já está cadastrado. Você pode atualizar ou voltar ao dashboard.", "success");
      }

      if (mode === "ponto" && !dados.tem_rosto) {
        this.setMessage("Você ainda não tem facial cadastrada. Vamos abrir o cadastro.", "error");
        setTimeout(() => {
          window.location.href = "./index.html?mode=register";
        }, 1400);
      }
    } catch (error) {
      console.warn("Falha ao carregar estado facial:", error);
    }
  },

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (this.video) {
        this.video.srcObject = this.stream;
      }
    } catch (error) {
      this.setMessage("Não foi possível acessar a câmera. Libere a permissão no navegador.", "error");
      console.error(error);
    }
  },

  stopCamera() {
    if (!this.stream) return;
    this.stream.getTracks().forEach((track) => track.stop());
    this.stream = null;
  },

  async captureAndSend() {
    if (!this.video || !this.canvas) return;

    if (!this.video.videoWidth || !this.video.videoHeight) {
      this.setMessage("A câmera ainda não carregou. Tente novamente em alguns segundos.", "error");
      return;
    }

    const context = this.canvas.getContext("2d");
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    context.save();
    context.scale(-1, 1);
    context.drawImage(this.video, -this.canvas.width, 0, this.canvas.width, this.canvas.height);
    context.restore();

    const imagemBase64 = this.canvas.toDataURL("image/jpeg", 0.92);
    const endpoint = mode === "register" ? "/rosto/cadastrar" : "/ponto/com-rosto";
    const payload =
      mode === "register"
        ? { imagem_base64: imagemBase64 }
        : { tipo: "entrada", imagem_base64: imagemBase64, limiar_confianca: 0.6 };

    this.captureBtn.disabled = true;
    this.setMessage("Enviando imagem para validação...", "info");

    try {
      const resp = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const resultado = await resp.json();

      if (!resp.ok) {
        throw new Error(resultado.detail || resultado.mensagem || "Falha ao processar a imagem.");
      }

      if (mode === "register") {
        localStorage.setItem("usuario_tem_rosto", "1");
        this.setMessage(resultado.mensagem || "Rosto cadastrado com sucesso.", "success");
        setTimeout(() => {
          this.stopCamera();
          window.location.href = "../Dashboard/dashboard.html";
        }, 1500);
      } else {
        this.setMessage(resultado.mensagem || "Ponto registrado com sucesso.", "success");
        setTimeout(() => {
          this.stopCamera();
          window.location.href = "../Dashboard/dashboard.html";
        }, 1500);
      }
    } catch (error) {
      this.setMessage(error.message, "error");
    } finally {
      this.captureBtn.disabled = false;
    }
  },
};

document.addEventListener("DOMContentLoaded", () => FaceApp.init());
