const db=require("../database");

class HistoricoRepository{

    limparTodos(){
        return new Promise((resolve,reject)=>{
            db.run("DELETE FROM historico",[],function(erro){
                if(erro) reject(erro);
                else resolve(Number(this.changes||0));
            });
        });
    }

    limparPeriodo(dataInicial,dataFinal){
        return new Promise((resolve,reject)=>{
            db.run(
                "DELETE FROM historico WHERE date(dataHora, 'localtime') BETWEEN date(?) AND date(?)",
                [dataInicial,dataFinal],
                function(erro){
                    if(erro) reject(erro);
                    else resolve(Number(this.changes||0));
                }
            );
        });
    }

    agruparOperacoes(linhas){
        const grupos = new Map();

        linhas.forEach(linha => {
            const familia = String(linha.operacao || "").startsWith("EDICAO_CAUTELA")
                ? "EDICAO_CAUTELA"
                : linha.operacao;
            const instante = String(linha.dataHora || "").slice(0,19);
            const agrupavel = linha.cautelaId
                && ["CAUTELA","DEVOLUCAO","EDICAO_CAUTELA"].includes(familia);
            const chave = agrupavel
                ? `${linha.cautelaId}|${familia}|${instante}`
                : `registro|${linha.id}`;
            const detalhe = {
                equipamentoId: linha.equipamentoId,
                tipo: linha.operacao,
                observacao: linha.observacao,
                modelo: linha.modelo,
                calibre: linha.calibre,
                categoria: linha.categoria,
                patrimonio: linha.patrimonio,
                fabricante: linha.fabricante,
                numeroSerie: linha.numeroSerie,
                prefixo: linha.prefixo,
                quantidade: linha.quantidade
            };

            if(!grupos.has(chave)){
                grupos.set(chave, {
                    ...linha,
                    operacao: familia,
                    detalhes: []
                });
            }
            const grupo = grupos.get(chave);
            if(linha.equipamentoId || linha.observacao) grupo.detalhes.push(detalhe);
        });

        return [...grupos.values()];
    }

    registrar(dados){

        return new Promise((resolve,reject)=>{

            db.run(

            `

            INSERT INTO historico(

                cautelaId,

                usuarioId,

                armeiroId,

                equipamentoId,

                operacao,

                dataHora,

                computador,

                observacao

            )

            VALUES(?,?,?,?,?,?,?,?)

            `,

            [

                dados.cautelaId,

                dados.usuarioId,

                dados.armeiroId,

                dados.equipamentoId,

                dados.operacao,

                dados.dataHora,

                dados.computador,

                dados.observacao

            ],

            function(erro){

                if(erro)
                    reject(erro);

                else
                    resolve(true);

            });

        });

    }

    registrarDevolucao(item){

        return this.registrar({

        cautelaId:item.cautelaId,

        usuarioId:item.usuarioId,

        armeiroId:item.armeiroId,

        equipamentoId:item.equipamentoId,

        operacao:"DEVOLUCAO",

        dataHora:new Date().toISOString(),

        computador:require("os").hostname(),

        observacao:""

        });

    }

    listar(){

        return new Promise((resolve,reject)=>{

            db.all(

                `

                SELECT

                    h.id,

                    h.cautelaId,

                    h.equipamentoId,

                    h.operacao,

                    h.dataHora,

                    h.computador,

                    h.observacao,

                    CASE WHEN c.tipo='EXTERNA' THEN COALESCE(c.nomeGuerraExterno,c.nomeCompletoExterno) ELSE COALESCE(NULLIF(u.nomeGuerra,''),u.nome) END nome,

                    CASE WHEN c.tipo='EXTERNA' THEN c.graduacaoExterna ELSE u.graduacao END graduacao,
                    u.matricula,
                    u.nomeGuerra,
                    u.ativo,

                    e.modelo,

                    e.calibre,

                    e.categoria,

                    e.patrimonio

                    ,e.fabricante

                    ,e.numeroSerie

                    ,e.prefixo

                    ,e.quantidade

                    ,e.status

                FROM historico h

                LEFT JOIN usuarios u

                ON u.id=h.usuarioId

                LEFT JOIN cautelas c ON c.id=h.cautelaId

                LEFT JOIN equipamentos e

                ON e.id=h.equipamentoId

                ORDER BY h.id DESC

                `,

                [],

                (erro,linhas)=>{

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(this.agruparOperacoes(linhas));

                    }

                }

            );

        });

    }

    listarPorCautela(cautelaId){
        return new Promise((resolve,reject)=>{
            db.all(
                `
                SELECT
                    h.id, h.cautelaId, h.equipamentoId, h.operacao,
                    h.dataHora, h.computador, h.observacao,
                    CASE WHEN c.tipo='EXTERNA' THEN COALESCE(c.nomeGuerraExterno,c.nomeCompletoExterno) ELSE COALESCE(NULLIF(u.nomeGuerra,''),u.nome) END nome,
                    CASE WHEN c.tipo='EXTERNA' THEN c.graduacaoExterna ELSE u.graduacao END graduacao, e.modelo, e.calibre, e.categoria,
                    e.patrimonio, e.fabricante, e.numeroSerie,
                    e.prefixo, e.quantidade
                FROM historico h
                LEFT JOIN usuarios u ON u.id=h.usuarioId
                LEFT JOIN cautelas c ON c.id=h.cautelaId
                LEFT JOIN equipamentos e ON e.id=h.equipamentoId
                WHERE h.cautelaId=?
                ORDER BY h.id DESC
                `,
                [Number(cautelaId)],
                (erro,linhas)=>{
                    if(erro) reject(erro);
                    else resolve(this.agruparOperacoes(linhas));
                }
            );
        });
    }

    ultimosRegistros(){

        return new Promise((resolve,reject)=>{

            db.all(

                `

                SELECT

                    h.operacao,

                    h.dataHora,

                    COALESCE(NULLIF(u.nomeGuerra,''),u.nome) nome,

                    u.graduacao,

                    e.modelo,

                    e.calibre,

                    e.categoria,

                    e.patrimonio

                FROM historico h

                LEFT JOIN usuarios u

                    ON u.id = h.usuarioId

                LEFT JOIN equipamentos e

                    ON e.id = h.equipamentoId

                WHERE date(h.dataHora, 'localtime') = date('now', 'localtime')

                ORDER BY h.dataHora DESC

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

module.exports=
new HistoricoRepository();
