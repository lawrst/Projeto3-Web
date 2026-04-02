const form = document.getElementById("cadastroForm");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const dados = {
    nome: document.getElementById("nome").value,
    email: document.getElementById("email").value,
    senha: document.getElementById("senha").value,
  };

  try {
    const response = await fetch("http://localhost:8000/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    const resultado = await response.json();

    if (response.ok) {
      alert("Cadastro realizado com sucesso!");
      window.location.href = "index.html"; // Volta para o login
    } else {
      alert("Erro: " + resultado.detail);
    }
  } catch (error) {
    console.error("Erro na conexão:", error);
    alert("Não foi possível conectar ao servidor.");
  }
});
