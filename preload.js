const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {

    /*====================================================
    USUÁRIOS
    ====================================================*/

    usuario:{

        salvar:(dados)=>
            ipcRenderer.invoke(
                "usuario-salvar",
                dados
            ),

        listar:()=>
            ipcRenderer.invoke(
                "usuario-listar"
            ),

        buscar:(id)=>
            ipcRenderer.invoke(
                "usuario-buscar",
                id
            ),

        editar:(dados)=>
            ipcRenderer.invoke(
                "usuario-editar",
                dados
            ),

        ativar:(id)=>
            ipcRenderer.invoke(
                "usuario-ativar",
                id
            ),

        desativar:(id)=>
            ipcRenderer.invoke(
                "usuario-desativar",
                id
            ),

        pesquisar:(texto)=>
            ipcRenderer.invoke(
                "usuario-pesquisar",
                texto
            ),

        validarSenha:(id,senha)=>
            ipcRenderer.invoke(
                "usuario-validar",
                id,
                senha
            ),

        sessao:()=>
            ipcRenderer.invoke(
                "usuario-sessao"
            ),

        logout:()=>
            ipcRenderer.invoke(
                "usuario-logout"
            ),

        login:(matricula,senha)=>

        ipcRenderer.invoke(

            "usuario-login",

            matricula,

            senha

        ),

    },

    /*====================================================
    EQUIPAMENTOS
    ====================================================*/

    equipamento:{

        salvar:(dados)=>
            ipcRenderer.invoke(
                "equipamento-salvar",
                dados
            ),

        listar:()=>
            ipcRenderer.invoke(
                "equipamento-listar"
            ),

        listarRelatorio:()=>
            ipcRenderer.invoke("equipamento-listar-relatorio"),

        pesquisar:(texto)=>

            ipcRenderer.invoke(

                "equipamento-pesquisar",

                texto

            ),

        listarDisponiveis:()=>
            ipcRenderer.invoke(
                "equipamento-disponiveis"
            ),

        

        buscar:(id)=>
            ipcRenderer.invoke(
                "equipamento-buscar",
                id
            ),

        editar:(dados)=>
            ipcRenderer.invoke(
                "equipamento-editar",
                dados
            ),

        excluir:(id)=>
            ipcRenderer.invoke(
                "equipamento-excluir",
                id
            ),

        alterarStatus:(id,status)=>
            ipcRenderer.invoke(
                "equipamento-status",
                id,
                status
            ),

        historico:(id)=> ipcRenderer.invoke("equipamento-historico",id)

    },

    /*====================================================
    CAUTELAS
    ====================================================*/

    cautela:{

        nova:(dados)=>
            ipcRenderer.invoke(
                "cautela-nova",
                dados
            ),

        novaExterna:(dados)=> ipcRenderer.invoke("cautela-externa-nova",dados),

        devolver:(dados)=>
            ipcRenderer.invoke(
                "cautela-devolver",
                dados
            ),

        listarAbertas:(tipo)=>

            ipcRenderer.invoke(

            "cautela-abertas",

            tipo

            ),

        detalhes:(id)=>
            ipcRenderer.invoke("cautela-detalhes",id),

        editar:(dados)=>
            ipcRenderer.invoke("cautela-editar",dados),

        receber:(dados)=>
            ipcRenderer.invoke("cautela-receber",dados),

        listarHistorico:()=>
            ipcRenderer.invoke(
                "cautela-historico"
            ),

        limparRelatorios:(senha,dataInicial,dataFinal)=>ipcRenderer.invoke("cautela-limpar-relatorios",{senha,dataInicial,dataFinal}),

        carregarNova:()=>

        ipcRenderer.invoke(

            "cautela:carregarNova"

        ),

    },

    /*====================================================
    HISTÓRICO
    ====================================================*/

    historico:{

        listar:()=>
            ipcRenderer.invoke(
                "historico-listar"
            ),

        limpar:(senha,dataInicial,dataFinal)=>ipcRenderer.invoke("historico-limpar",{senha,dataInicial,dataFinal})

    },

        /*====================================================
    DASHBOARD
    ====================================================*/

    dashboard:{

        carregar:()=>

            ipcRenderer.invoke(

                "dashboard-carregar"

            )

    },

        /*====================================================
    RELATÓRIOS
    ====================================================*/

    relatorio:{

        gerarPDF:(dados)=>

            ipcRenderer.invoke(

                "relatorio-pdf",

                dados

            )

    },

        /*====================================================
    BACKUP
    ====================================================*/

    backup:{

        salvar:()=>

            ipcRenderer.invoke(

                "backup-salvar"

            ),

        restaurar:()=>

            ipcRenderer.invoke(

                "backup-restaurar"

            ),

        criarDiario:()=>ipcRenderer.invoke("backup-diario"),
        exportarCompleto:()=>ipcRenderer.invoke("backup-exportar-completo"),
        exportarAtualizacao:()=>ipcRenderer.invoke("backup-exportar-atualizacao"),
        exportarModelo:()=>ipcRenderer.invoke("backup-exportar-modelo"),
        obterStatus:()=>ipcRenderer.invoke("backup-status"),
        configurarBackupDiario:(ativo)=>ipcRenderer.invoke("backup-diario-configurar",ativo),
        configurarHorario:(hora)=>ipcRenderer.invoke("backup-horario-configurar",hora),
        configurarPastaDiaria:()=>ipcRenderer.invoke("backup-pasta-diaria-configurar"),
        restaurarPastaDiariaPadrao:()=>ipcRenderer.invoke("backup-pasta-diaria-padrao"),
        configurarGoogleDrive:(ativo)=>ipcRenderer.invoke("backup-google-drive-configurar",ativo)

    },

    auth:{

        verificar:(perfil,recurso)=>

            ipcRenderer.invoke(

                "auth-verificar",

                perfil,

                recurso

            )

    },

    policialExterno:{
        listar:()=>ipcRenderer.invoke("policial-externo-listar"),
        buscarMatricula:matricula=>ipcRenderer.invoke("policial-externo-buscar-matricula",matricula),
        editar:dados=>ipcRenderer.invoke("policial-externo-editar",dados)
    },

    configuracao:{
        obter:()=> ipcRenderer.invoke("configuracao-obter"),
        salvar:(dados)=> ipcRenderer.invoke("configuracao-salvar", dados),
        selecionarVideo:()=> ipcRenderer.invoke("configuracao-selecionar-video")
    },

});

window.addEventListener('DOMContentLoaded', () => {
 const banner=document.createElement('div');
 banner.textContent='DEMONSTRA??O ? Dados fict?cios ? Sem validade oficial';
 banner.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#164b38;color:white;text-align:center;padding:7px;font:13px sans-serif;pointer-events:none';
 document.body.style.paddingBottom='34px';
 document.body.appendChild(banner);
});
