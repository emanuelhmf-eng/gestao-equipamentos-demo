let paginaAtual = "";
let carregandoPagina = false;

window.solicitarSenhaAdministrador = function(mensagem){
    return new Promise(resolve=>{
        const modal=document.getElementById("modalSenhaAdministrador");
        const formulario=document.getElementById("formSenhaAdministrador");
        const campo=document.getElementById("senhaAdministradorOperacao");
        const erro=document.getElementById("erroSenhaAdministrador");
        const texto=document.getElementById("mensagemSenhaAdministrador");
        const alternar=document.getElementById("alternarSenhaAdministrador");
        let encerrado=false;
        const concluir=valor=>{
            if(encerrado)return;
            encerrado=true;
            modal.classList.add("oculto");
            campo.value="";
            campo.type="password";
            erro.textContent="";
            document.removeEventListener("keydown",aoTeclado);
            resolve(valor);
        };
        const aoTeclado=evento=>{if(evento.key==="Escape")concluir(null);};
        texto.textContent=mensagem||"Digite a senha da conta de administrador conectada para continuar.";
        campo.value="";
        campo.disabled=false;
        campo.readOnly=false;
        campo.type="password";
        erro.textContent="";
        alternar.innerHTML='<i class="fa-solid fa-eye"></i>';
        alternar.setAttribute("aria-label","Mostrar senha");
        alternar.title="Mostrar senha";
        alternar.onclick=()=>{
            const mostrar=campo.type==="password";
            campo.type=mostrar?"text":"password";
            alternar.innerHTML=`<i class="fa-solid ${mostrar?"fa-eye-slash":"fa-eye"}"></i>`;
            alternar.setAttribute("aria-label",mostrar?"Ocultar senha":"Mostrar senha");
            alternar.title=mostrar?"Ocultar senha":"Mostrar senha";
            campo.focus();
        };
        formulario.onsubmit=evento=>{
            evento.preventDefault();
            const senha=campo.value;
            if(!senha){erro.textContent="Informe a senha do administrador.";campo.focus();return;}
            concluir(senha);
        };
        document.getElementById("fecharSenhaAdministrador").onclick=()=>concluir(null);
        document.getElementById("cancelarSenhaAdministrador").onclick=()=>concluir(null);
        modal.onclick=evento=>{if(evento.target===modal)concluir(null);};
        document.addEventListener("keydown",aoTeclado);
        modal.classList.remove("oculto");
        requestAnimationFrame(()=>{campo.focus({preventScroll:true});campo.select();});
    });
};

async function abrirTela(nome){
    if(carregandoPagina || paginaAtual === nome) return;

    carregandoPagina = true;
    try {
        const paginaHtml = nome === "cautelasPermanentes" ? "cautelaNova" : nome;
        const html = await PageLoader.carregar(paginaHtml);
        const conteudo = document.getElementById("conteudo");
        if(!conteudo) throw new Error("Área de conteúdo não encontrada.");

        conteudo.innerHTML = html;
        if(nome === "cautelasPermanentes"){
            const pagina = conteudo.querySelector(".paginaNovaCautela");
            pagina.dataset.tipoCautela = "PERMANENTE";
            pagina.querySelector(".titulo-pagina h1").textContent = "Nova cautela permanente";
            pagina.querySelector(".titulo-pagina p").textContent = "Vincule permanentemente equipamentos ao policial selecionado.";
            pagina.querySelector(".etapaCautela").innerHTML = '<i class="fa-solid fa-link"></i> Vínculo permanente';
            pagina.querySelector(".rodapeNovaCautela > span").innerHTML = '<i class="fa-solid fa-lock"></i> A senha será solicitada para confirmar o vínculo permanente.';
            pagina.querySelector("#btnFinalizarCautela").innerHTML = '<i class="fa-solid fa-link"></i> Emitir cautela permanente';
            pagina.querySelector("#btnReceberCautelaNova").hidden = true;
            conteudo.querySelector("#modalConfirmarCautela .cabecalhoModal h2").textContent = "Confirmar cautela permanente";
        }
        await carregarScript(nome);
        paginaAtual = nome;
        if(typeof destacarMenu === "function") destacarMenu(nome);
    } catch (erro) {
        console.error(erro);
        const conteudo = document.getElementById("conteudo");
        if(conteudo) conteudo.innerHTML = `<section class="pagina"><h1>Não foi possível abrir a tela</h1><p>${erro.message}</p></section>`;
    } finally {
        carregandoPagina = false;
    }
}

async function carregarScript(nome){
    document.querySelectorAll(".scriptPagina").forEach(s=>s.remove());

    const arquivosDashboard = [
        "../js/dashboard/cards.js",
        "../js/dashboard/cautelas.js",
        "../js/dashboard/atividades.js",
        "../js/modulos/dashboard.js"
    ];
    const modulos = {
        cautelaNova:"cautelas",
        cautelasAbertas:"cautelasAbertas",
        cautelasExternas:"cautelasExternas",
        cautelasPermanentes:"cautelas",
        configuracoes:"configuracoes",
        relatorios:"relatorios",
        backup:"backup"
    };
    const arquivos = nome === "dashboard"
        ? arquivosDashboard
        : [`../js/modulos/${modulos[nome] || nome}.js`];

    for(const arquivo of arquivos){
        await new Promise((resolve,reject)=>{
            const script = document.createElement("script");
            script.className = "scriptPagina";
            script.src = `${arquivo}?atualizacao=${Date.now()}`;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Módulo ${nome} não encontrado.`));
            document.body.appendChild(script);
        });
    }
}

async function iniciarSistema(){
    if(typeof carregarSessao === "function") await carregarSessao();
    await abrirTela("dashboard");
}

window.addEventListener("DOMContentLoaded", iniciarSistema);
