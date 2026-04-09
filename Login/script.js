document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const messageDiv = document.getElementById("message");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const senha = document.getElementById("password").value;

      const dadosLogin = {
        email: email,
        senha: senha,
      };

      try {
        console.log("Tentando logar na API:", dadosLogin);

        const response = await fetch("http://127.0.0.1:8000/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dadosLogin),
        });

        const resultado = await response.json();

        if (response.ok) {
          alert("Login realizado com sucesso!");

          localStorage.setItem("usuario", JSON.stringify(resultado.usuario));

          window.location.href = "../Dashboard/dashboard.html";
        } else {
          messageDiv.innerText =
            resultado.detail || "E-mail ou senha incorretos.";
          messageDiv.style.display = "block";
          messageDiv.style.color = "red";
        }
      } catch (error) {
        console.error("Erro na conexão:", error);
        messageDiv.innerText = "Não foi possível conectar ao servidor.";
        messageDiv.style.display = "block";
        messageDiv.style.color = "red";
      }
    });
  }
});
