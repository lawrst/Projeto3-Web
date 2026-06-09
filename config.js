window.APP_CONFIG = {
  API_URL: "https://projeto3-api.onrender.com",
  DESKTOP_DOWNLOAD_URL: "/downloads/VERIFIQ.exe",
  DESKTOP_DOWNLOAD_FILENAME: "VERIFIQ.exe",
};

window.APP_CONFIG.WS_URL = window.APP_CONFIG.API_URL.replace(/^http/, "ws");

function applyDesktopDownloadLinks() {
  const url =
    window.APP_CONFIG?.DESKTOP_DOWNLOAD_URL || "/downloads/VERIFIQ.exe";
  const filename =
    window.APP_CONFIG?.DESKTOP_DOWNLOAD_FILENAME || "VERIFIQ.exe";

  document.querySelectorAll("[data-desktop-download]").forEach((link) => {
    link.href = url;
    link.setAttribute("download", filename);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyDesktopDownloadLinks);
} else {
  applyDesktopDownloadLinks();
}
