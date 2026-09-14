const db = require("../database");

const equipamentoRepository=
require("./equipamentoRepository");

class CautelaRepository {

    listarAbertas(tipo="TEMPORARIA"){

        return new Promise((resolve,reject)=>{

            db.all(

                `
                SELECT

                    c.id,

                    c.usuarioId,

                    CASE WHEN c.tipo='EXTERNA' THEN c.matriculaExterna ELSE u.matricula END matricula,

                    CASE WHEN c.tipo='EXTERNA' THEN COALESCE(c.nomeGuerraExterno,c.nomeCompletoExterno) ELSE COALESCE(NULLIF(u.nomeGuerra,''),u.nome) END nome,

                    CASE WHEN c.tipo='EXTERNA' THEN c.graduacaoExterna ELSE u.graduacao END graduacao,

                    c.unidadeOrigem,

                    a.nome armeiroNome,

                    c.dataRetirada,

                    c.status,
                    COALESCE(SUM(CASE WHEN ci.devolvido=0 THEN ci.quantidade ELSE 0 END),0) quantidade

                FROM cautelas c

                LEFT JOIN usuarios u

                ON c.usuarioId=u.id

                LEFT JOIN usuarios a ON a.id=c.armeiroId

                LEFT JOIN cautela_itens ci

                ON ci.cautelaId=c.id

                WHERE c.status='ABERTA'
                  AND COALESCE(c.tipo,'TEMPORARIA')=?

                GROUP BY c.id,c.usuarioId,3,4,5,c.unidadeOrigem,a.nome,c.dataRetirada,c.status

                ORDER BY c.dataRetirada DESC
                `,

                [tipo],

                (erro,linhas)=>{

                    if(erro)
                        reject(erro);

                    else
                        resolve(linhas);

                }

            );

        });

    }

    buscar(id){

        return new Promise((resolve,reject)=>{

            db.get(

                `

                SELECT
                    c.*,
                    CASE WHEN c.tipo='EXTERNA' THEN COALESCE(c.nomeGuerraExterno,c.nomeCompletoExterno) ELSE COALESCE(NULLIF(u.nomeGuerra,''),u.nome) END nome,
                    CASE WHEN c.tipo='EXTERNA' THEN c.nomeGuerraExterno ELSE u.nomeGuerra END nomeGuerra,
                    CASE WHEN c.tipo='EXTERNA' THEN c.graduacaoExterna ELSE u.graduacao END graduacao,
                    CASE WHEN c.tipo='EXTERNA' THEN c.matriculaExterna ELSE u.matricula END matricula,
                    a.nome armeiroNome
                FROM cautelas c
                LEFT JOIN usuarios u ON u.id=c.usuarioId
                LEFT JOIN usuarios a ON a.id=c.armeiroId
                WHERE c.id=?

                `,

                [id],

                (erro,linha)=>{

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(linha);

                    }

                }

            );

        });

    }

    salvar(cautela){

        return new Promise((resolve,reject)=>{

            db.run(

                `
                INSERT INTO cautelas(

                    usuarioId,

                    armeiroId,

                    dataRetirada,

                    dataPrevista,

                    status,

                    observacao,

                    tipo,
                    matriculaExterna,nomeCompletoExterno,nomeGuerraExterno,
                    graduacaoExterna,unidadeOrigem,telefoneExterno,emailExterno,
                    motivoExterno,autoridadeSolicitante,responsavelAutorizou

                )

                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                `,

                [

                    cautela.usuarioId,

                    cautela.armeiroId,

                    cautela.dataRetirada,

                    cautela.dataPrevista,

                    "ABERTA",

                    cautela.observacao,

                    ["PERMANENTE","EXTERNA"].includes(cautela.tipo) ? cautela.tipo : "TEMPORARIA",
                    cautela.matriculaExterna || null,
                    cautela.nomeCompletoExterno || null,
                    cautela.nomeGuerraExterno || null,
                    cautela.graduacaoExterna || null,
                    cautela.unidadeOrigem || null,
                    cautela.telefoneExterno || null,
                    cautela.emailExterno || null,
                    cautela.motivoExterno || null,
                    cautela.autoridadeSolicitante || null,
                    cautela.responsavelAutorizou || null

                ],

                function(erro){

                    if(erro)
                        reject(erro);

                    else
                        resolve(this.lastID);

                }

            );

        });

    }

    salvarItem(cautelaId,equipamentoId,quantidade){

        return new Promise((resolve,reject)=>{

            db.run(

                `
                INSERT INTO cautela_itens(

                    cautelaId,

                    equipamentoId,

                    quantidade

                )

                VALUES(?,?,?)
                `,

                [

                    cautelaId,

                    equipamentoId,

                    quantidade

                ],

                function(erro){

                    if(erro)
                        reject(erro);

                    else
                        resolve(true);

                }

            );

        });

    }

    async finalizar(cautela){
        // Cada etapa é validada no controller antes desta gravação. A sequência
        // permanece centralizada para que o registro e seus itens não sejam
        // expostos ao renderer.
        const cautelaId = await this.salvar(cautela);
        try {
            for(const item of cautela.itens){
                await this.salvarItem(cautelaId, item.id, item.quantidade || 1);
                await equipamentoRepository.alterarStatus(item.id, "CAUTELADO");
            }
            return cautelaId;
        } catch(erro) {
            await new Promise(resolve => db.run("DELETE FROM cautela_itens WHERE cautelaId=?", [cautelaId], () => db.run("DELETE FROM cautelas WHERE id=?", [cautelaId], resolve)));
            throw erro;
        }

    }

    listarAbertasComItens(){

        return new Promise((resolve,reject)=>{

            db.all(

                `

                SELECT

                    c.id cautelaId,

                    ci.id,

                    CASE WHEN c.tipo='EXTERNA' THEN COALESCE(c.nomeGuerraExterno,c.nomeCompletoExterno) ELSE COALESCE(NULLIF(u.nomeGuerra,''),u.nome) END nome,

                    CASE WHEN c.tipo='EXTERNA' THEN c.graduacaoExterna ELSE u.graduacao END graduacao,

                    e.id equipamentoId,

                    e.categoria,

                    e.modelo,

                    e.patrimonio,

                    ci.devolvido

                FROM cautelas c

                LEFT JOIN usuarios u

                ON u.id=c.usuarioId

                INNER JOIN cautela_itens ci

                ON ci.cautelaId=c.id

                INNER JOIN equipamentos e

                ON e.id=ci.equipamentoId

                WHERE

                    c.status='ABERTA'

                ORDER BY

                    u.graduacao,

                    u.nome

                `,

                [],

                (erro,linhas)=>{

                    if(erro)
                        reject(erro);

                    else
                        resolve(linhas);

                });

        });

    }

    listarItens(cautelaId){

        return new Promise((resolve,reject)=>{

            db.all(

                `

                SELECT

                    ci.*,

                    e.categoria,

                    e.modelo,

                    e.calibre,

                    e.fabricante,

                    e.patrimonio,

                    e.numeroSerie,

                    e.prefixo

                FROM cautela_itens ci

                INNER JOIN equipamentos e

                ON e.id=ci.equipamentoId

                WHERE ci.cautelaId=?

                ORDER BY e.categoria,e.modelo

                `,

                [

                    cautelaId

                ],

                (erro,linhas)=>{

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(linhas);

                    }

                }

            );

        });

    }

    excluirItem(id){
        return new Promise((resolve,reject)=>{
            db.run("DELETE FROM cautela_itens WHERE id=?", [id], erro => erro ? reject(erro) : resolve(true));
        });
    }

    atualizarQuantidade(id,quantidade){
        return new Promise((resolve,reject)=>{
            db.run(
                "UPDATE cautela_itens SET quantidade=? WHERE id=? AND devolvido=0",
                [quantidade,id],
                erro => erro ? reject(erro) : resolve(true)
            );
        });
    }

    atualizarDadosExternos(id,dados){
        return new Promise((resolve,reject)=> db.run(`
            UPDATE cautelas SET matriculaExterna=?,nomeCompletoExterno=?,nomeGuerraExterno=?,
                graduacaoExterna=?,unidadeOrigem=?,telefoneExterno=?,emailExterno=?,
                motivoExterno=?,autoridadeSolicitante=?,responsavelAutorizou=?,observacao=?
            WHERE id=? AND tipo='EXTERNA' AND status='ABERTA'`,[
                dados.matriculaExterna,dados.nomeCompletoExterno,dados.nomeGuerraExterno,
                dados.graduacaoExterna,dados.unidadeOrigem,dados.telefoneExterno,
                dados.emailExterno || null,dados.motivoExterno,dados.autoridadeSolicitante,
                dados.responsavelAutorizou,dados.observacao || null,id
            ],erro => erro ? reject(erro) : resolve(true)));
    }

    devolverItem(id,dataDevolucao=null){

        

        return new Promise((resolve,reject)=>{

            db.run(

            `

            UPDATE cautela_itens

            SET

                devolvido=1,

                dataDevolucao=?

            WHERE

                id=?

            `,

            [

                dataDevolucao || new Date().toISOString(),

                id

            ],

            function(erro){

                if(erro)
                    reject(erro);

                else
                    resolve(true);

            });

        });

    }

    async verificarFechamento(cautelaId){

        const itens=

        await this.listarItens(

            cautelaId

        );

        const pendentes=

        itens.filter(

            item=>!item.devolvido

        );

        if(pendentes.length===0){

            await this.fechar(

                cautelaId

            );

        }

    }

    fechar(cautelaId,dataDevolucao=null){

        return new Promise((resolve,reject)=>{

            db.run(

                `

                UPDATE cautelas

                SET

                    status='FECHADA',

                    dataDevolucao=?

                WHERE id=?

                `,

                [

                    dataDevolucao || new Date().toISOString(),

                    cautelaId

                ],

                function(erro){

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(true);

                    }

                }

            );

        });

    }

    listarHistorico(){

        return new Promise((resolve,reject)=>{

            db.all(

                `

                SELECT

                    c.id,

                    CASE WHEN c.tipo='EXTERNA' THEN COALESCE(c.nomeGuerraExterno,c.nomeCompletoExterno) ELSE COALESCE(NULLIF(u.nomeGuerra,''),u.nome) END nome,

                    CASE WHEN c.tipo='EXTERNA' THEN c.graduacaoExterna ELSE u.graduacao END graduacao,

                    c.unidadeOrigem,

                    a.nome armeiroNome,

                    c.dataRetirada,

                    c.dataDevolucao,

                    c.status,

                    COALESCE(c.tipo,'TEMPORARIA') tipo

                FROM cautelas c

                LEFT JOIN usuarios u

                ON u.id=c.usuarioId

                LEFT JOIN usuarios a ON a.id=c.armeiroId

                ORDER BY c.dataRetirada DESC

                `,

                [],

                (erro,linhas)=>{

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(linhas);

                    }

                }

            );

        });

    }

    limparEncerradas(dataInicial,dataFinal){
        return new Promise((resolve,reject)=>{
            db.serialize(()=>{
                db.run("BEGIN TRANSACTION");
                const filtro="status='FECHADA' AND date(dataDevolucao, 'localtime') BETWEEN date(?) AND date(?)",parametros=[dataInicial,dataFinal];
                db.get(`SELECT COUNT(*) total FROM cautelas WHERE ${filtro}`,parametros,(erro,linha)=>{
                    if(erro){ db.run("ROLLBACK"); reject(erro); return; }
                    const total=Number(linha?.total||0);
                    db.run(`UPDATE historico SET cautelaId=NULL WHERE cautelaId IN (SELECT id FROM cautelas WHERE ${filtro})`,parametros,erroHistorico=>{
                        if(erroHistorico){ db.run("ROLLBACK"); reject(erroHistorico); return; }
                        db.run(`DELETE FROM cautela_itens WHERE cautelaId IN (SELECT id FROM cautelas WHERE ${filtro})`,parametros,erroItens=>{
                            if(erroItens){ db.run("ROLLBACK"); reject(erroItens); return; }
                            db.run(`DELETE FROM cautelas WHERE ${filtro}`,parametros,erroCautelas=>{
                                if(erroCautelas){ db.run("ROLLBACK"); reject(erroCautelas); return; }
                                db.run("COMMIT",erroCommit=>erroCommit?reject(erroCommit):resolve(total));
                            });
                        });
                    });
                });
            });
        });
    }

    contarAbertas(){

        return new Promise((resolve,reject)=>{

            db.get(

                `
                SELECT COUNT(*) total
                FROM cautelas
                WHERE status='ABERTA'
                `,

                [],

                (erro,linha)=>{

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(linha.total);

                    }

                }

            );

        });

    }

    listarResumoDashboard(){

        return new Promise((resolve,reject)=>{

            db.all(

                `

                SELECT

                    c.id,

                    CASE WHEN c.tipo='EXTERNA' THEN COALESCE(c.nomeGuerraExterno,c.nomeCompletoExterno) ELSE COALESCE(NULLIF(u.nomeGuerra,''),u.nome) END nome,

                    CASE WHEN c.tipo='EXTERNA' THEN c.graduacaoExterna ELSE u.graduacao END graduacao,

                    c.dataRetirada,

                    COALESCE(c.tipo,'TEMPORARIA') tipo,

                    COALESCE(SUM(CASE WHEN ci.devolvido=0 THEN ci.quantidade ELSE 0 END),0) AS quantidade

                FROM cautelas c

                LEFT JOIN usuarios u

                    ON u.id = c.usuarioId

                LEFT JOIN cautela_itens ci

                    ON ci.cautelaId = c.id

                WHERE c.status='ABERTA'

                GROUP BY

                    c.id,
                    2,
                    3,
                    c.dataRetirada,
                    c.tipo

                ORDER BY c.dataRetirada DESC

                LIMIT 10

                `,

                [],

                (erro,linhas)=>{

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(linhas);

                    }

                }

            );

        });

    }

}

module.exports =
new CautelaRepository();
