/****************************************************************
 MENU.JS
****************************************************************/

function mostrarAvisoSistema(mensagem){
    let area = document.getElementById("avisosSistema");
    if(!area){
        area = document.createElement("div");
        area.id = "avisosSistema";
        area.className = "avisosSistema";
        area.setAttribute("aria-live","polite");
        document.body.appendChild(area);
    }

    const aviso = document.createElement("div");
    aviso.className = "avisoSistema";
    aviso.innerHTML = `<i class="fa-solid fa-circle-info"></i><span></span><button type="button" aria-label="Fechar aviso">&times;</button>`;
    aviso.querySelector("span").textContent = String(mensagem || "Operação não concluída.");
    const remover = () => {
        aviso.classList.add("saindo");
        setTimeout(() => aviso.remove(),180);
    };
    aviso.querySelector("button").onclick = remover;
    area.appendChild(aviso);
    setTimeout(remover,5000);
}

// Evita caixas nativas que bloqueiam toda a interface durante validações e erros.
window.alert = mostrarAvisoSistema;
window.addEventListener("unhandledrejection", evento => {
    console.error("Operação assíncrona não tratada:", evento.reason);
    mostrarAvisoSistema(evento.reason?.message || "Não foi possível concluir a operação.");
    evento.preventDefault();
});

let usuarioLogado = null;

const MENU = [

        {
            id: "menuDashboard",
            titulo: "Dashboard",
            icone: "fa-chart-line",
            pagina: "dashboard",
            perfis: ["ADMINISTRADOR","ARMEIRO", "COMANDANTE", "CONSULTA"]
        },

        {
            id: "menuUsuarios",
            titulo: "Usuários",
            icone: "fa-users",
            pagina: "usuarios",
            perfis: ["ADMINISTRADOR"]
        },

        {
            id: "menuEquipamentos",
            titulo: "Equipamentos",
            icone: "fa-toolbox",
            pagina: "equipamentos",
            perfis: ["ADMINISTRADOR","ARMEIRO"]
        },

        {
            id: "menuNovaCautela",
            titulo: "Nova Cautela",
            icone: "fa-clipboard-check",
            pagina: "cautelaNova",
            perfis: ["ADMINISTRADOR","ARMEIRO"]
        },

        {
            id: "menuAbertas",
            titulo: "Cautelas em Aberto",
            icone: "fa-hourglass-half",
            pagina: "cautelasAbertas",
            perfis: ["ADMINISTRADOR","ARMEIRO"]
        },

        {
            id: "menuCautelasExternas",
            titulo: "Cautelas Externas",
            icone: "fa-building-shield",
            pagina: "cautelasExternas",
            perfis: ["ADMINISTRADOR","ARMEIRO"]
        },

        {
            id: "menuPermanentes",
            titulo: "Cautelas Permanentes",
            icone: "fa-link",
            pagina: "cautelasPermanentes",
            perfis: ["ADMINISTRADOR","ARMEIRO"]
        },

        {
            id: "menuHistorico",
            titulo: "Histórico",
            icone: "fa-clock-rotate-left",
            pagina: "historico",
            perfis: ["ADMINISTRADOR","ARMEIRO", "COMANDANTE", "CONSULTA"]
        },

        {
            id: "menuRelatorios",
            titulo: "Relatórios",
            icone: "fa-file-lines",
            pagina: "relatorios",
            perfis: ["ADMINISTRADOR", "COMANDANTE"]
        },

        {
            id: "menuBackup",
            titulo: "Backup",
            icone: "fa-cloud-arrow-up",
            pagina: "backup",
            perfis: ["ADMINISTRADOR"]
        },

        {
            id: "menuConfiguracoes",
            titulo: "Configurações",
            icone: "fa-gear",
            pagina: "configuracoes",
            perfis: ["ADMINISTRADOR"]
        }

    ];






/****************************************************************
CARREGAR SESSÃO
****************************************************************/

async function carregarSessao(){

    try{

        usuarioLogado =

        await window.api.usuario.sessao();

        if(!usuarioLogado){

            window.location.href=

            "login.html";

            return;

        }

        preencherUsuario();

        montarMenu();

        destacarMenu("dashboard");
    }

    catch(erro){

        console.error(erro);

    }

    

}

/****************************************************************
USUÁRIO
****************************************************************/

function preencherUsuario(){
    const nomeMenu=

    document.getElementById(

        "nomeUsuario"

    );

    const perfilMenu=

    document.getElementById(

        "perfilUsuario"

    );

    if(nomeMenu)

        nomeMenu.innerText=

        usuarioLogado.nome;

    if(perfilMenu)

        perfilMenu.innerText=

        usuarioLogado.perfil;

}

function montarMenu(){
    console.log(MENU);

    const sidebar = document.getElementById("sidebar");

    if(!sidebar){

        return;

    }

    let html = `

        <div class="logoSistema">

            <img src="../assets/demo-logo.svg" id="logoSistema" data-logo-sistema>

            <h1 data-sigla-sistema>CAUTELA DEMO</h1>

            <span data-unidade-sistema>Sistema de Cautela</span>

        </div>

        <div class="usuarioMenu">

        

            <h3 id="nomeUsuario">

                ${usuarioLogado.nome}

            </h3>

            <span id="perfilUsuario">

                ${usuarioLogado.perfil}

            </span>

        </div>

        <nav>

    `;

    MENU.forEach(item=>{

        if(!item.perfis.includes(usuarioLogado.perfil)){

            return;

        }

        html += `

            <a
                id="${item.id}"
                href="#${item.pagina}"
                data-pagina="${item.pagina}">

                <i class="fa-solid ${item.icone}"></i>

                ${item.titulo}

            </a>

        `;

    });

    html += `

        </nav>

        <div class="rodapeMenu">

            <button
                id="btnLogout"
                class="botaoLogout">

                <i class="fa-solid fa-right-from-bracket"></i>

                Sair

            </button>

            <small>

                CAUTELA DEMO 1.0

            </small>

        </div>

    `;

    sidebar.innerHTML = html;

    if(typeof window.aplicarIdentidadeVisual === "function") window.aplicarIdentidadeVisual(window.identidadeSistema);

    registrarEventosMenu();

    const btnLogout = document.getElementById("btnLogout");

    if(btnLogout){

        btnLogout.onclick = logout;

    }

    

}
/****************************************************************
REGISTRAR EVENTOS DO MENU
****************************************************************/

function registrarEventosMenu(){
    const navegacao = document.querySelector("#sidebar nav");

    if(!navegacao) return;

    navegacao.onclick = async(event)=>{
        const item = event.target.closest("a[data-pagina]");

        if(!item) return;

        event.preventDefault();

        try{
            await abrirTela(item.dataset.pagina);

            if(window.innerWidth <= 850){
                document.getElementById("sidebar").classList.add("recolhida");
            }
        }catch(erro){
            console.error("Erro ao abrir menu:", erro);
            alert("Não foi possível abrir esta tela.");
        }
    };

}


/****************************************************************
DESTACA MENU
****************************************************************/
function destacarMenu(nome){

    document

        .querySelectorAll(

            ".sidebar nav a"

        )

        .forEach(

            item=>{

                item.classList.remove(

                    "ativo"

                );

            }

        );

    const mapa={

        dashboard:"menuDashboard",

        usuarios:"menuUsuarios",

        equipamentos:"menuEquipamentos",

        cautelaNova:"menuNovaCautela",

        cautelasAbertas:"menuAbertas",

        cautelasExternas:"menuCautelasExternas",

        cautelasPermanentes:"menuPermanentes",

        historico:"menuHistorico",

        relatorios:"menuRelatorios",

        backup:"menuBackup",

        configuracoes:"menuConfiguracoes"

    };

    const menu=

    document.getElementById(

        mapa[nome]

    );

    if(menu){

        menu.classList.add(

            "ativo"

        );

    }

}


/****************************************************************
MENU RESPONSIVO
****************************************************************/

const botaoMenu=

document.getElementById(

    "btnMenu"

);

const sidebar=

document.querySelector(

    ".sidebar"

);

if(botaoMenu){

    botaoMenu.onclick=()=>{

        if(!sidebar) return;

        sidebar.classList.toggle(

            "recolhida"

        );

        const fechado = sidebar.classList.contains("recolhida");
        botaoMenu.setAttribute("aria-expanded", String(!fechado));

    };

}

/****************************************************************
LOGOUT
****************************************************************/

async function logout(){

    if(

        !confirm(

            "Deseja sair do sistema?"

        )

    ){

        return;

    }

    await window.api.usuario.logout();

    localStorage.clear();

    window.location.href=

    "login.html";

}
