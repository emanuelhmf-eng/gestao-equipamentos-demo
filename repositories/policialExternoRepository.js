const db = require("../database");

const executar = (sql,parametros=[]) => new Promise((resolve,reject) => {
    db.run(sql,parametros,function(erro){ erro ? reject(erro) : resolve(this); });
});
const um = (sql,parametros=[]) => new Promise((resolve,reject) => {
    db.get(sql,parametros,(erro,linha) => erro ? reject(erro) : resolve(linha));
});
const todos = (sql,parametros=[]) => new Promise((resolve,reject) => {
    db.all(sql,parametros,(erro,linhas) => erro ? reject(erro) : resolve(linhas));
});

class PolicialExternoRepository {
    listar(){
        return todos("SELECT * FROM policiais_externos ORDER BY graduacao,nomeGuerra,nomeCompleto");
    }
    buscarMatricula(matricula){
        return um("SELECT * FROM policiais_externos WHERE matricula=?",[String(matricula || "").trim()]);
    }
    async salvarOuAtualizar(dados){
        const agora=new Date().toISOString();
        await executar(`INSERT INTO policiais_externos
            (matricula,nomeCompleto,nomeGuerra,graduacao,unidadeOrigem,telefone,email,dataCadastro,dataAtualizacao)
            VALUES(?,?,?,?,?,?,?,?,?)
            ON CONFLICT(matricula) DO UPDATE SET
                nomeCompleto=excluded.nomeCompleto,nomeGuerra=excluded.nomeGuerra,
                graduacao=excluded.graduacao,unidadeOrigem=excluded.unidadeOrigem,
                telefone=excluded.telefone,email=excluded.email,dataAtualizacao=excluded.dataAtualizacao`,[
            dados.matriculaExterna,dados.nomeCompletoExterno,dados.nomeGuerraExterno,
            dados.graduacaoExterna,dados.unidadeOrigem,dados.telefoneExterno,
            dados.emailExterno || null,agora,agora
        ]);
        return this.buscarMatricula(dados.matriculaExterna);
    }
    async editar(dados){
        const resultado=await executar(`UPDATE policiais_externos SET
            nomeCompleto=?,nomeGuerra=?,graduacao=?,unidadeOrigem=?,telefone=?,email=?,dataAtualizacao=?
            WHERE id=?`,[
            String(dados.nomeCompleto || "").trim(),String(dados.nomeGuerra || "").trim(),
            String(dados.graduacao || "").trim(),String(dados.unidadeOrigem || "").trim(),
            String(dados.telefone || "").trim(),String(dados.email || "").trim() || null,
            new Date().toISOString(),Number(dados.id)
        ]);
        if(!resultado.changes) throw new Error("Policial externo não encontrado.");
        return true;
    }
}

module.exports = new PolicialExternoRepository();
