window.APP_CONFIG = {
  API_URL: "https://projeto3-api.onrender.com",
  DESKTOP_DOWNLOAD_FILENAME: "VERIFIQ.exe",
};

window.APP_CONFIG.WS_URL = window.APP_CONFIG.API_URL.replace(/^http/, "ws");

window.downloadDesktopAgent = async function downloadDesktopAgent() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Faça login para baixar o agente desktop.");
    window.location.href = "../Login/index.html";
    return;
  }

  const apiUrl = window.APP_CONFIG?.API_URL || "http://127.0.0.1:8000";
  const filename =
    window.APP_CONFIG?.DESKTOP_DOWNLOAD_FILENAME || "VERIFIQ.exe";

  try {
    const response = await fetch(`${apiUrl}/desktop/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.detail || "Download do agente desktop indisponível no momento.",
      );
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Erro ao baixar agente desktop:", error);
    alert(error.message || "Não foi possível baixar o agente desktop.");
  }
};
