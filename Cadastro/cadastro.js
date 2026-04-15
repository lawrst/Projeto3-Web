document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("cadastroForm");
  const messageDiv = document.getElementById("message");

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const dados = {
        nome: document.getElementById("nome").value,
        email: document.getElementById("email").value,
        senha: document.getElementById("senha").value,
      };

      try {
        const response = await fetch("http://127.0.0.1:8000/cadastro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        });

        const resultado = await response.json();

        if (response.ok) {
          alert("Cadastro realizado com sucesso!");
          window.location.href = "../Login/index.html";
        } else {
          if (messageDiv) {
            messageDiv.innerText =
              "Erro: " + (resultado.detail || "Verifique os dados.");
            messageDiv.style.color = "#ff4d4d";
          }
        }
      } catch (error) {
        console.error("Erro na conexão:", error);
        alert("Não foi possível conectar ao servidor da API.");
      }
    });
  }
});
