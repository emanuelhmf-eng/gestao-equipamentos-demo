const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");

const fs = require('fs');
const caminhoBanco = path.join(__dirname, '.demo-data', 'demo.sqlite');
fs.mkdirSync(path.dirname(caminhoBanco), {recursive:true});

const db = new sqlite3.Database(
    caminhoBanco,
    (erro) => {

        if (erro) {

            console.error(
                "Erro ao conectar ao banco:",
                erro.message
            );

        } else {

            console.log(
                "Banco SQLite conectado."
            );

        }

    }
);

// SQLite não habilita integridade referencial por padrão. Mantê-la ligada evita
// que uma cautela seja gravada com referências inexistentes em instalações novas.
db.run("PRAGMA foreign_keys = ON");

db.serialize(() => {

    console.log(
        "Criando estrutura do banco..."
    );

    /*====================================================
    USUÁRIOS
    ====================================================*/

    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            matricula TEXT UNIQUE NOT NULL,

            nome TEXT NOT NULL,

            nomeGuerra TEXT,

            graduacao TEXT,

            pelotao TEXT,

            funcao TEXT,

            telefone TEXT,

            email TEXT,

            perfil TEXT,

            senhaHash TEXT,

            foto TEXT,

            observacao TEXT,

            ativo INTEGER DEFAULT 1,

            dataCadastro TEXT

        )
    `);

    /*====================================================
    SESSÃO
    ====================================================*/

    db.run(`
        CREATE TABLE IF NOT EXISTS sessao (

        id INTEGER PRIMARY KEY,

        usuarioId INTEGER,

        matricula TEXT,

        nome TEXT,

        graduacao TEXT,

        perfil TEXT,

        dataLogin TEXT

    )
    `);

   

    /*====================================================
    EQUIPAMENTOS
    ====================================================*/

    db.run(`
        CREATE TABLE IF NOT EXISTS equipamentos (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            categoria TEXT,

            fabricante TEXT,

            modelo TEXT,

            calibre TEXT,

            numeroSerie TEXT UNIQUE,

            patrimonio TEXT,

            prefixo TEXT,

            quantidade INTEGER DEFAULT 1,

            status TEXT DEFAULT 'DISPONIVEL',

            localizacao TEXT,

            foto TEXT,

            observacao TEXT,

            dataCadastro TEXT,

            dataValidade TEXT

        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS policiais_externos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            matricula TEXT UNIQUE NOT NULL,
            nomeCompleto TEXT NOT NULL,
            nomeGuerra TEXT NOT NULL,
            graduacao TEXT NOT NULL,
            unidadeOrigem TEXT NOT NULL,
            telefone TEXT NOT NULL,
            email TEXT,
            dataCadastro TEXT,
            dataAtualizacao TEXT
        )
    `);

    db.run(
        "ALTER TABLE equipamentos ADD COLUMN dataValidade TEXT",
        erro => {
            if(erro && !String(erro.message).includes("duplicate column name")){
                console.error("Não foi possível atualizar a validade dos equipamentos:", erro.message);
            }
        }
    );

    /*====================================================
    CAUTELAS
    ====================================================*/

    db.run(`
        CREATE TABLE IF NOT EXISTS cautelas (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            usuarioId INTEGER,

            armeiroId INTEGER,

            dataRetirada TEXT,

            dataPrevista TEXT,

            dataDevolucao TEXT,

            status TEXT DEFAULT 'ABERTA',

            observacao TEXT,

            tipo TEXT NOT NULL DEFAULT 'TEMPORARIA'

        )
    `);

    // Mantém bancos já existentes compatíveis com a distinção entre cautelas.
    db.run(
        "ALTER TABLE cautelas ADD COLUMN tipo TEXT NOT NULL DEFAULT 'TEMPORARIA'",
        erro => {
            if(erro && !String(erro.message).includes("duplicate column name")){
                console.error("Não foi possível atualizar o tipo das cautelas:", erro.message);
            }
        }
    );

    [
        ["matriculaExterna","TEXT"], ["nomeCompletoExterno","TEXT"],
        ["nomeGuerraExterno","TEXT"], ["graduacaoExterna","TEXT"],
        ["unidadeOrigem","TEXT"], ["telefoneExterno","TEXT"],
        ["emailExterno","TEXT"], ["motivoExterno","TEXT"],
        ["autoridadeSolicitante","TEXT"], ["responsavelAutorizou","TEXT"]
    ].forEach(([coluna,tipoColuna]) => db.run(
        `ALTER TABLE cautelas ADD COLUMN ${coluna} ${tipoColuna}`,
        erro => {
            if(erro && !String(erro.message).includes("duplicate column name")){
                console.error(`Não foi possível adicionar ${coluna}:`,erro.message);
            }
        }
    ));

    db.run(`INSERT OR IGNORE INTO policiais_externos
        (matricula,nomeCompleto,nomeGuerra,graduacao,unidadeOrigem,telefone,email,dataCadastro,dataAtualizacao)
        SELECT matriculaExterna,nomeCompletoExterno,nomeGuerraExterno,graduacaoExterna,
               unidadeOrigem,telefoneExterno,emailExterno,MIN(dataRetirada),MAX(dataRetirada)
        FROM cautelas
        WHERE tipo='EXTERNA' AND COALESCE(matriculaExterna,'')<>''
        GROUP BY matriculaExterna`);

    /*====================================================
    ITENS DA CAUTELA
    ====================================================*/

    db.run(`
        CREATE TABLE IF NOT EXISTS cautela_itens (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            cautelaId INTEGER,

            equipamentoId INTEGER,

            quantidade INTEGER,

            devolvido INTEGER DEFAULT 0,

            dataDevolucao TEXT

        )
    `);

    /*====================================================
    HISTÓRICO
    ====================================================*/

    db.run(`
        CREATE TABLE IF NOT EXISTS historico (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            cautelaId INTEGER,

            usuarioId INTEGER,

            armeiroId INTEGER,

            equipamentoId INTEGER,

            operacao TEXT,

            dataHora TEXT,

            computador TEXT,

            observacao TEXT

        )
    `);

    /*====================================================
    CONFIGURAÇÕES
    ====================================================*/

    db.run(`
        CREATE TABLE IF NOT EXISTS configuracoes (

            id INTEGER PRIMARY KEY,

            batalhao TEXT,

            cidade TEXT,

            estado TEXT,

            brasao TEXT,

            comandante TEXT,

            subcomandante TEXT

        )
    `);

    [
        ["nomeUnidade", "TEXT"],
        ["orgaoSeguranca", "TEXT"],
        ["nomeUnidadeRelatorios", "TEXT"],
        ["corPrimaria", "TEXT"],
        ["corBarra", "TEXT"],
        ["corTitulos", "TEXT"],
        ["corSecundaria", "TEXT"],
        ["corMenu", "TEXT"],
        ["corFundo", "TEXT"],
        ["videoAbertura", "TEXT"]
    ].forEach(([coluna,tipo]) => db.run(
        `ALTER TABLE configuracoes ADD COLUMN ${coluna} ${tipo}`,
        erro => {
            if(erro && !String(erro.message).includes("duplicate column name")) console.error(erro);
        }
    ));

    db.run(`
        INSERT OR IGNORE INTO configuracoes(

            id,

            batalhao

        )

        VALUES(

            1,

            'CAUTELA DEMO'

        )
    `);

});


db.ready = new Promise((resolve,reject)=>{
 db.get('SELECT 1', async erro=>{
  if(erro) return reject(erro);
  try { await require('./demo/seed')(db); resolve(); } catch(e){reject(e);}
 });
});
module.exports = db;
