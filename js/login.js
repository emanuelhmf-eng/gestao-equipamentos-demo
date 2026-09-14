let loginEmAndamento = false;

function exibirErroLogin(mensagem, campo){
    document.getElementById("erroLogin").textContent = mensagem;
    if(campo) campo.focus();
}

async function login(){
    if(loginEmAndamento) return;

    const campoMatricula = document.getElementById("matricula");
    const campoSenha = document.getElementById("senha");
    const botao = document.getElementById("btnEntrar");
    const matricula = campoMatricula.value.trim();
    const senha = campoSenha.value;

    document.getElementById("erroLogin").textContent = "";

    if(!matricula){
        exibirErroLogin("Informe a matrícula.", campoMatricula);
        return;
    }

    if(!senha){
        exibirErroLogin("Informe a senha.", campoSenha);
        return;
    }

    loginEmAndamento = true;
    campoMatricula.disabled = true;
    campoSenha.disabled = true;
    botao.disabled = true;
    botao.textContent = "Entrando...";

    try{
        const resposta = await window.api.usuario.login(matricula, senha);

        if(!resposta.sucesso){
            campoSenha.value = "";
            exibirErroLogin(resposta.mensagem || "Matrícula ou senha inválida.", campoSenha);
            return;
        }

        window.location.href = "index.html";
    }catch(erro){
        console.error(erro);
        campoSenha.value = "";
        exibirErroLogin("Erro ao realizar o login.", campoSenha);
    }finally{
        loginEmAndamento = false;
        campoMatricula.disabled = false;
        campoSenha.disabled = false;
        botao.disabled = false;
        botao.textContent = "Entrar";

        if(document.getElementById("erroLogin").textContent){
            campoSenha.focus();
        }
    }
}

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("formLogin").addEventListener("submit", evento => {
        evento.preventDefault();
        login();
    });
    document.getElementById("matricula").focus();
});
