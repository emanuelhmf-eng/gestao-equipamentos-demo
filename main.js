const {
    app,
    BrowserWindow,
    ipcMain,
    dialog
} = require("electron");

const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

/*
==========================================
BANCO
==========================================
*/

app.setPath("userData", path.join(__dirname, ".demo-data", "electron"));
const db = require("./database");
const backupService = require("./services/backupService");

/*
==========================================
CONTROLLERS
==========================================
*/

const usuarioController =
require("./controllers/usuarioController");

const equipamentoController =
require("./controllers/equipamentoController");

const cautelaController =
require("./controllers/cautelaController");

const historicoController =
require("./controllers/historicoController");

const dashboardController =
require("./controllers/dashboardController");

const configuracaoController =
require("./controllers/configuracaoController");
const policialExternoRepository = require("./repositories/policialExternoRepository");

/*
==========================================
SERVICES
==========================================
*/

const authService =
require("./services/authService");

const pdfService =
require("./services/pdfService");

/*
==========================================
JANELA
==========================================
*/

let janelaPrincipal;

let bancoFechado = false;

function abrirDashboard(){

    janelaPrincipal.loadFile(

        "telas/index.html"

    );

}

async function criarJanela(){

    janelaPrincipal = new BrowserWindow({

        width:1600,

        height:900,

        minWidth:1400,

        minHeight:850,

        show:false,

        autoHideMenuBar:true,

        backgroundColor:"#1b1b1b",

        webPreferences:{

            preload:path.join(
                __dirname,
                "preload.js"
            ),

            contextIsolation:true,

            nodeIntegration:false

        }

    });

    janelaPrincipal.once("ready-to-show",()=>{

        janelaPrincipal.show();

    });

    let videoAbertura = "";
    try {
        const configuracao = await configuracaoController.obter();
        if(configuracao?.videoAbertura && fs.existsSync(configuracao.videoAbertura)){
            videoAbertura = pathToFileURL(configuracao.videoAbertura).href;
        }
    } catch(erro) {
        console.error("Não foi possível carregar o vídeo de abertura:", erro);
    }
    if(videoAbertura){
        janelaPrincipal.loadFile("telas/abertura.html", {query:{video:videoAbertura}});
    }else{
        janelaPrincipal.loadFile("telas/login.html");
    }

}

app.whenReady().then(async()=>{
    await db.ready;
    criarJanela().catch(erro=>console.error("Erro ao criar a janela:",erro));
});

app.on("window-all-closed", () => {

    if (process.platform !== "darwin") {

        app.quit();

    }

});

app.on("before-quit", () => {

    if (
        !bancoFechado &&
        db &&
        typeof db.close === "function"
    ) {

        bancoFechado = true;

        db.close((erro) => {

            if (erro) {

                console.error(
                    "Erro ao fechar o banco SQLite:",
                    erro.message
                );

            } else {

                console.log(
                    "Banco SQLite encerrado corretamente."
                );

            }

        });

    }

});

app.on("activate",()=>{

    if(BrowserWindow.getAllWindows().length===0)
        criarJanela();

});

/*
==========================================
USUÁRIOS
==========================================
*/

ipcMain.handle(
    "usuario-salvar",
    (_,dados)=>
        usuarioController.salvar(dados)
);

ipcMain.handle(
    "usuario-listar",
    ()=>
        usuarioController.listar()
);

ipcMain.handle(
    "usuario-buscar",
    (_,id)=>
        usuarioController.buscar(id)
);

ipcMain.handle(
    "usuario-editar",
    (_,dados)=>
        usuarioController.editar(dados)
);

ipcMain.handle(
    "usuario-ativar",
    (_,id)=>
        usuarioController.ativar(id)
);

ipcMain.handle(
    "usuario-desativar",
    (_,id)=>
        usuarioController.desativar(id)
);

ipcMain.handle(
    "usuario-pesquisar",
    (_,texto)=>
        usuarioController.pesquisar(texto)
);

ipcMain.handle(
    "usuario-validar",
    (_,id,senha)=>
        usuarioController.validarSenha(id,senha)
);

ipcMain.handle(

    "usuario-login",

    (_,matricula,senha)=>

        usuarioController.login(

            matricula,

            senha

        )

);

ipcMain.handle(
    "usuario-sessao",
    ()=>
        usuarioController.sessao()
);

ipcMain.handle(
    "usuario-logout",
    ()=> usuarioController.logout()
);
/*
==========================================
EQUIPAMENTOS
==========================================
*/

ipcMain.handle(
    "equipamento-listar",
    ()=>
        equipamentoController.listar()
);

ipcMain.handle(
    "equipamento-disponiveis",
    ()=>
        equipamentoController.listarDisponiveis()
);

ipcMain.handle(
    "equipamento-categoria",
    (_,categoria)=>
        equipamentoController.listarPorCategoria(categoria)
);

ipcMain.handle(
    "equipamento-buscar",
    (_,id)=>
        equipamentoController.buscar(id)
);

ipcMain.handle(
    "equipamento-pesquisar",
    (_,texto)=>
        equipamentoController.pesquisar(texto)
);

ipcMain.handle(
    "equipamento-salvar",
    (_,dados)=>
        equipamentoController.salvar(dados)
);

ipcMain.handle(
    "equipamento-editar",
    (_,dados)=>
        equipamentoController.editar(dados)
);

ipcMain.handle(
    "equipamento-excluir",
    (_,id)=>
        equipamentoController.excluir(id)
);

ipcMain.handle(
    "equipamento-status",
    (_,id,status)=>
        equipamentoController.alterarStatus(id,status)
);

/*
==========================================
CAUTELAS
==========================================
*/

ipcMain.handle(
    "cautela-nova",
    (_,dados)=>
        cautelaController.nova(dados)
);

ipcMain.handle(
    "cautela-devolver",
    (_,dados)=>
        cautelaController.devolver(dados)
);

ipcMain.handle(
    "cautela-abertas",
    (_,tipo)=>
        cautelaController.listarAbertas(tipo)
);

ipcMain.handle("equipamento-historico",(_,id)=> equipamentoController.historico(id));

ipcMain.handle("cautela-externa-nova",(_,dados)=> cautelaController.novaExterna(dados));
ipcMain.handle("policial-externo-listar",()=> policialExternoRepository.listar());
ipcMain.handle("policial-externo-buscar-matricula",(_,matricula)=> policialExternoRepository.buscarMatricula(matricula));
ipcMain.handle("policial-externo-editar",(_,dados)=> policialExternoRepository.editar(dados));

ipcMain.handle(
    "equipamento-listar-relatorio",
    ()=> equipamentoController.listarRelatorio()
);

ipcMain.handle(
    "cautela-detalhes",
    (_,id)=> cautelaController.detalhes(id)
);

ipcMain.handle(
    "cautela-editar",
    (_,dados)=> cautelaController.editar(dados)
);

ipcMain.handle(
    "cautela-receber",
    (_,dados)=> cautelaController.receberCautela(dados)
);

ipcMain.handle(
    "cautela-historico",
    ()=>
        cautelaController.listarHistorico()
);

ipcMain.handle(

    "cautela:carregarNova",

    async ()=>{

        return await cautelaController
            .carregarNovaCautela();

    }

);

/*
==========================================
HISTÓRICO
==========================================
*/

ipcMain.handle(

    "historico-listar",

    ()=>{

        return historicoController.listar();

    }

);

/*
==========================================
AUTH
==========================================
*/

ipcMain.handle(

    "auth-verificar",

    async(_,perfil,recurso)=>{

        return authService.podeAcessar(

            perfil,

            recurso

        );

    }

);

/*
==========================================
DASHBOARD
==========================================
*/

ipcMain.handle(

    "dashboard-carregar",

    ()=> dashboardController.carregar()

);

/*
==========================================
RELATÓRIOS
==========================================
*/


ipcMain.handle(

    "relatorio-pdf",

    async(_,dados)=>{

        return await pdfService.gerarPDF(

            dados

        );

    }

);

/*
==========================================
BACKUP
==========================================
*/

ipcMain.handle(

    "backup-salvar",

    async()=>{
        const destino = await dialog.showSaveDialog(janelaPrincipal, {
            title:"Salvar backup do banco de dados", defaultPath:`backup_${backupService.data()}.db`, filters:[{name:"Banco SQLite", extensions:["db"]}]
        });
        if(destino.canceled || !destino.filePath) return {cancelado:true};
        await backupService.backupBanco(destino.filePath);
        let googleDrive=null;try{googleDrive=await backupService.copiarGoogleDrive(destino.filePath);}catch(erro){console.error(erro);}
        return {arquivo:destino.filePath,googleDrive};
    }

);
ipcMain.handle("cautela-limpar-relatorios",(_,dados)=>cautelaController.limparRelatoriosEncerrados(dados));
ipcMain.handle("historico-limpar",(_,dados)=>cautelaController.limparHistorico(dados));

ipcMain.handle("backup-diario",()=>backupService.criarBackupDiario(true));
ipcMain.handle("backup-status",()=>{const preferencias=backupService.preferencias();return {...preferencias,...backupService.statusDestinoDiario(),proximaExecucao:preferencias.backupDiarioAtivo?backupService.proximaExecucao().toISOString():null};});
ipcMain.handle("backup-diario-configurar",(_,ativo)=>backupService.configurarBackupDiario(ativo));
ipcMain.handle("backup-horario-configurar",(_,hora)=>backupService.configurarHorario(hora));
ipcMain.handle("backup-pasta-diaria-configurar",async()=>{
    const atual=backupService.statusDestinoDiario();
    const escolha=await dialog.showOpenDialog(janelaPrincipal,{title:"Selecione a pasta dos backups diários",defaultPath:atual.pastaBackupDiarioEfetiva,properties:["openDirectory","createDirectory"]});
    if(escolha.canceled||!escolha.filePaths[0])return {cancelado:true,...backupService.preferencias(),...atual};
    return backupService.configurarPastaBackupDiario(escolha.filePaths[0]);
});
ipcMain.handle("backup-pasta-diaria-padrao",()=>backupService.restaurarPastaBackupDiarioPadrao());
ipcMain.handle("backup-google-drive-configurar",async(_,ativo)=>{
    if(!ativo)return backupService.salvarPreferencias({googleDriveAtivo:false});
    const escolha=await dialog.showOpenDialog(janelaPrincipal,{title:"Selecione a pasta sincronizada do Google Drive",properties:["openDirectory","createDirectory"]});
    if(escolha.canceled||!escolha.filePaths[0])return {cancelado:true,...backupService.preferencias()};
    return backupService.salvarPreferencias({googleDriveAtivo:true,pastaGoogleDrive:escolha.filePaths[0]});
});
ipcMain.handle("backup-exportar-completo",async()=>{
    const destino=await dialog.showSaveDialog(janelaPrincipal,{title:"Exportar Sistema Completo",defaultPath:`CAUTELA_DEMO_${backupService.data()}.zip`,filters:[{name:"Pacote ZIP",extensions:["zip"]}]});
    if(destino.canceled||!destino.filePath)return {cancelado:true};
    return backupService.exportarCompleto(destino.filePath);
});
ipcMain.handle("backup-exportar-atualizacao",async()=>{
    const destino=await dialog.showSaveDialog(janelaPrincipal,{title:"Exportar Pacote de Atualização",defaultPath:`CAUTELA_DEMO_Atualizacao_${backupService.data()}.zip`,filters:[{name:"Pacote ZIP",extensions:["zip"]}]});
    if(destino.canceled||!destino.filePath)return {cancelado:true};
    return backupService.exportarAtualizacao(destino.filePath);
});
ipcMain.handle("backup-exportar-modelo",async()=>{
    const destino=await dialog.showSaveDialog(janelaPrincipal,{title:"Exportar Modelo da Unidade",defaultPath:`Modelo_Unidade_${backupService.data()}.zip`,filters:[{name:"Pacote ZIP",extensions:["zip"]}]});
    if(destino.canceled||!destino.filePath)return {cancelado:true};
    return backupService.exportarModelo(destino.filePath);
});

ipcMain.handle(

    "backup-restaurar",

    async()=>{
        const origem = await dialog.showOpenDialog(janelaPrincipal, {title:"Selecionar backup", properties:["openFile"], filters:[{name:"Banco SQLite", extensions:["db"]}]});
        if(origem.canceled || !origem.filePaths[0]) return {cancelado:true};
        const arquivoOrigem=origem.filePaths[0],destinoBanco=backupService.caminhoBanco();
        if(path.resolve(arquivoOrigem)===path.resolve(destinoBanco))throw new Error("Selecione um arquivo de backup diferente do banco em uso.");
        await backupService.validarBanco(arquivoOrigem);
        const pastaSeguranca=path.join(backupService.pastaBase(),"Restauracoes");
        const dataHora=new Date().toISOString().replace(/[:.]/g,"-");
        await backupService.backupBanco(path.join(pastaSeguranca,`antes_restauracao_${dataHora}.db`));
        const temporarioRestauracao=`${destinoBanco}.restaurando-${process.pid}-${Date.now()}`;
        const bancoAnterior=`${destinoBanco}.anterior-${process.pid}-${Date.now()}`;
        await fs.promises.copyFile(arquivoOrigem,temporarioRestauracao);
        await backupService.validarBanco(temporarioRestauracao);
        await new Promise((resolve, reject) => {

            db.close((erro) => {

                if (erro) {

                    reject(erro);

                    return;

                }

                bancoFechado = true;

                resolve();

            });

        });
        try{
            await fs.promises.rename(destinoBanco,bancoAnterior);
            try{await fs.promises.rename(temporarioRestauracao,destinoBanco);}
            catch(erro){await fs.promises.rename(bancoAnterior,destinoBanco);throw erro;}
            try{await fs.promises.unlink(bancoAnterior);}catch(erro){console.error("Limpeza do banco anterior:",erro.message);}
        }catch(erro){
            try{await fs.promises.unlink(temporarioRestauracao);}catch{}
            app.relaunch();
            app.exit(1);
            throw erro;
        }
        app.relaunch(); app.exit(0);
        return {reiniciando:true};
    }

);

/*
==========================================
FIM DOS IPC
==========================================
*/

ipcMain.handle("configuracao-obter", () => configuracaoController.obter());
ipcMain.handle("configuracao-salvar", (_,dados) => configuracaoController.salvar(dados));
ipcMain.handle("configuracao-selecionar-video", async () => {
    const escolha = await dialog.showOpenDialog(janelaPrincipal, {
        title:"Selecionar vídeo de abertura",
        properties:["openFile"],
        filters:[{name:"Vídeos compatíveis",extensions:["webm","mp4"]}]
    });
    if(escolha.canceled || !escolha.filePaths[0]) return null;
    const origem = escolha.filePaths[0];
    const extensao = path.extname(origem).toLowerCase();
    const tamanho = fs.statSync(origem).size;
    if(![".webm",".mp4"].includes(extensao)) throw new Error("Selecione um vídeo WebM ou MP4.");
    if(tamanho > 150 * 1024 * 1024) throw new Error("O vídeo deve ter no máximo 150 MB.");
    const pasta = path.join(app.getPath("userData"), "midia");
    fs.mkdirSync(pasta, {recursive:true});
    const destino = path.join(pasta, `abertura${extensao}`);
    fs.copyFileSync(origem, destino);
    return {caminho:destino,nome:path.basename(origem),url:pathToFileURL(destino).href};
});
