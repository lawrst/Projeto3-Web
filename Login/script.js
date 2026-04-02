const loginForm = document.getElementById("loginForm");
const messageDiv = document.getElementById("message");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const senha = document.getElementById("password").value;

  const dadosLogin = {
    email: email,
    senha: senha,
  };

  try {
    console.log("Enviando para API:", dadosLogin);

    if (email === "teste@ufrpe.br" && senha === "123456") {
      alert("Login realizado com sucesso!");

      localStorage.setItem(
        "usuario",
        JSON.stringify({ nome: "Lawrence", id: "123" }),
      );
      window.location.href = "dashboard.html"; // Redireciona
    } else {
      throw new Error("E-mail ou senha incorretos.");
    }
  } catch (error) {
    messageDiv.innerText = error.message;
    messageDiv.style.display = "block";
  }

  if (response.status === 201) {
    alert("Cadastro realizado com sucesso!");
    window.location.href = "index.html"; // Retorna para o Login
  }
});
