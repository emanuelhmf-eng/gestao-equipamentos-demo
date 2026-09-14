const db = require("../database");

class EquipamentoRepository {

    historico(id){
        return new Promise((resolve,reject)=>db.all(`
            SELECT h.id,h.equipamentoId,h.cautelaId,h.operacao,h.dataHora,h.observacao,
                   c.tipo,
                   CASE WHEN c.tipo='EXTERNA' THEN c.matriculaExterna ELSE u.matricula END matricula,
                   CASE WHEN c.tipo='EXTERNA' THEN c.graduacaoExterna ELSE u.graduacao END graduacao,
                   CASE WHEN c.tipo='EXTERNA' THEN COALESCE(c.nomeGuerraExterno,c.nomeCompletoExterno) ELSE COALESCE(NULLIF(u.nomeGuerra,''),u.nome) END nomeGuerra
            FROM historico h
            LEFT JOIN cautelas c ON c.id=h.cautelaId
            LEFT JOIN usuarios u ON u.id=c.usuarioId
            WHERE h.equipamentoId=? OR (h.cautelaId IS NOT NULL AND h.operacao IN ('CAUTELA','CAUTELA_EXTERNA','EDICAO_CAUTELA'))
            ORDER BY h.dataHora DESC,h.id DESC
        `,[Number(id)],(erro,linhas)=>erro?reject(erro):resolve(linhas)));
    }

    rankingArmamentos(){
        return new Promise((resolve,reject)=>db.all(`
            SELECT e.id,e.categoria,e.modelo,e.fabricante,e.patrimonio,e.prefixo,e.numeroSerie,
                   (SELECT COUNT(DISTINCT ci.cautelaId) FROM cautela_itens ci WHERE ci.equipamentoId=e.id) totalCautelas,
                   (SELECT COUNT(*) FROM historico h WHERE h.equipamentoId=e.id AND h.operacao='BAIXADO') totalBaixas
            FROM equipamentos e
            WHERE e.categoria IN ('ARMA_LONGA','ARMA_CURTA')
            ORDER BY e.categoria,e.modelo,e.id
        `,[],(erro,linhas)=>erro?reject(erro):resolve(linhas)));
    }

    listar(incluirExcluidos=false) {

        return new Promise((resolve, reject) => {

            db.all(

                `
                SELECT
                    e.*,
                    GROUP_CONCAT(DISTINCT CASE WHEN c.id IS NOT NULL THEN
                        CASE WHEN c.tipo='EXTERNA' THEN
                            TRIM(COALESCE(c.graduacaoExterna,'') || ' ' || COALESCE(c.nomeGuerraExterno,c.nomeCompletoExterno,''))
                        ELSE
                            TRIM(COALESCE(u.graduacao,'') || ' ' || COALESCE(NULLIF(u.nomeGuerra,''),u.nome))
                        END
                    END) AS policialCautela,
                    CASE
                        WHEN e.categoria IN ('MUNICAO','OUTROS') THEN MAX(
                            e.quantidade - COALESCE(SUM(CASE WHEN c.id IS NOT NULL THEN ci.quantidade ELSE 0 END),0),
                            0
                        )
                        WHEN e.status='DISPONIVEL' THEN 1
                        ELSE 0
                    END AS saldoDisponivel
                    ,(SELECT h.operacao FROM historico h
                      WHERE h.equipamentoId=e.id
                        AND h.operacao IN ('CADASTRO_EQUIPAMENTO','EDICAO_EQUIPAMENTO','EXCLUSAO_EQUIPAMENTO')
                      ORDER BY h.id DESC LIMIT 1) AS ultimaOperacao
                FROM equipamentos e
                LEFT JOIN cautela_itens ci
                    ON ci.equipamentoId=e.id AND ci.devolvido=0
                LEFT JOIN cautelas c
                    ON c.id=ci.cautelaId AND c.status='ABERTA'
                LEFT JOIN usuarios u
                    ON u.id=c.usuarioId
                ${incluirExcluidos ? "" : "WHERE e.status <> 'EXCLUIDO'"}
                GROUP BY e.id
                ORDER BY e.categoria,e.fabricante,e.modelo
                `,

                [],

                (erro, linhas) => {

                    if (erro)
                        reject(erro);

                    else
                        resolve(linhas);

                }

            );

        });

    }

    buscarPorId(id) {

        return new Promise((resolve, reject) => {

            db.get(

                `
                SELECT *
                FROM equipamentos
                WHERE id=?
                `,

                [id],

                (erro, linha) => {

                    if (erro)
                        reject(erro);

                    else
                        resolve(linha);

                }

            );

        });

    }

    buscar(id){

        return this.buscarPorId(id);

    }

    buscarPorPatrimonio(patrimonio) {

        return new Promise((resolve, reject) => {

            db.get(

                `
                SELECT *
                FROM equipamentos
                WHERE patrimonio=?
                `,

                [patrimonio],

                (erro, linha) => {

                    if (erro)
                        reject(erro);

                    else
                        resolve(linha);

                }

            );

        });

    }

    salvar(equipamento) {

        return new Promise((resolve, reject) => {

            db.run(

                `
                INSERT INTO equipamentos(

                    categoria,
                    fabricante,
                    modelo,
                    calibre,
                    numeroSerie,
                    patrimonio,
                    prefixo,
                    quantidade,
                    status,
                    localizacao,
                    dataCadastro,
                    observacao,
                    foto,
                    dataValidade

                )

                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                `,

                [

                    equipamento.categoria,
                    equipamento.fabricante,
                    equipamento.modelo,
                    equipamento.calibre,
                    equipamento.numeroSerie,
                    equipamento.patrimonio,
                    equipamento.prefixo,
                    equipamento.quantidade,
                    equipamento.status,
                    equipamento.localizacao,
                    equipamento.dataCadastro,
                    equipamento.observacao,
                    equipamento.foto,
                    equipamento.dataValidade

                ],

                function (erro) {

                    if (erro) {

                        if (
                            erro.code === "SQLITE_CONSTRAINT" &&
                            String(erro.message)
                                .includes("equipamentos.numeroSerie")
                        ) {

                            reject(
                                new Error(
                                    "Prefixo / número de série já cadastrado."
                                )
                            );

                            return;

                        }

                        reject(erro);
                        return;

                    }

                    resolve(this.lastID);

                }

            );

        });

    }

    editar(equipamento) {

        return new Promise((resolve, reject) => {

            db.run(

                `
                UPDATE equipamentos

                SET

                    categoria=?,
                    fabricante=?,
                    modelo=?,
                    calibre=?,
                    numeroSerie=?,
                    patrimonio=?,
                    prefixo=?,
                    quantidade=?,
                    status=?,
                    localizacao=?,
                    observacao=?,
                    foto=?,
                    dataValidade=?

                WHERE id=?
                `,

                [

                    equipamento.categoria,
                    equipamento.fabricante,
                    equipamento.modelo,
                    equipamento.calibre,
                    equipamento.numeroSerie,
                    equipamento.patrimonio,
                    equipamento.prefixo,
                    equipamento.quantidade,
                    equipamento.status,
                    equipamento.localizacao,
                    equipamento.observacao,
                    equipamento.foto,
                    equipamento.dataValidade,
                    equipamento.id

                ],

                function (erro) {

                    if (erro) {

                        if (
                            erro.code === "SQLITE_CONSTRAINT" &&
                            String(erro.message)
                                .includes("equipamentos.numeroSerie")
                        ) {

                            reject(
                                new Error(
                                    "Prefixo / número de série já cadastrado em outro equipamento."
                                )
                            );

                            return;

                        }

                        reject(erro);
                        return;

                    }

                    if (this.changes === 0) {

                        reject(
                            new Error(
                                "Equipamento não encontrado."
                            )
                        );

                        return;

                    }

                    resolve(true);

                }

            );

        });

    }

    alterarStatus(id, status) {

        return new Promise((resolve, reject) => {

            db.run(

                `
                UPDATE equipamentos
                SET status=?
                WHERE id=?
                `,

                [

                    status,
                    id

                ],

                function (erro) {

                    if (erro)
                        reject(erro);

                    else
                        resolve(true);

                }

            );

        });

    }

    baixarQuantidadeNaoDevolvida(id,quantidade){
        return new Promise((resolve,reject)=>{
            db.run(`UPDATE equipamentos
                SET quantidade=MAX(COALESCE(quantidade,0)-?,0)
                WHERE id=? AND categoria='MUNICAO'`,
                [Number(quantidade),Number(id)],
                erro=>erro?reject(erro):resolve(true));
        });
    }

    excluir(id) {

        return new Promise((resolve, reject) => {

            db.run(

                `
                UPDATE equipamentos
                SET status='EXCLUIDO'
                WHERE id=?
                `,

                [id],

                function (erro) {

                    if (erro)
                        reject(erro);

                    else if(!this.changes)
                        reject(new Error("Equipamento não encontrado."));

                    else
                        resolve(true);

                }

            );

        });

    }

    listarDisponiveis() {

        return new Promise((resolve, reject) => {

            db.all(

                `
                SELECT *
                FROM (
                    SELECT
                        e.*,
                        CASE
                            WHEN e.categoria IN ('MUNICAO','OUTROS') THEN MAX(
                                e.quantidade - COALESCE(SUM(CASE WHEN c.id IS NOT NULL THEN ci.quantidade ELSE 0 END),0),
                                0
                            )
                            WHEN e.status='DISPONIVEL' THEN 1
                            ELSE 0
                        END AS saldoDisponivel
                    FROM equipamentos e
                    LEFT JOIN cautela_itens ci
                        ON ci.equipamentoId=e.id AND ci.devolvido=0
                    LEFT JOIN cautelas c
                        ON c.id=ci.cautelaId AND c.status='ABERTA'
                    GROUP BY e.id
                )
                WHERE saldoDisponivel > 0
                    AND status <> 'EXCLUIDO'
                ORDER BY categoria,modelo
                `,

                [],

                (erro, linhas) => {

                    if (erro)
                        reject(erro);

                    else
                        resolve(linhas);

                }

            );

        });

    }

    listarPorCategoria(categoria) {

        return new Promise((resolve, reject) => {

            db.all(

                `
                SELECT *
                FROM equipamentos
                WHERE categoria=?
                ORDER BY modelo
                `,

                [

                    categoria

                ],

                (erro, linhas) => {

                    if (erro)
                        reject(erro);

                    else
                        resolve(linhas);

                }

            );

        });

    }

    pesquisar(texto){

        return new Promise((resolve,reject)=>{

            db.all(

                `
                SELECT *

                FROM equipamentos

                WHERE

                    status <> 'EXCLUIDO'

                    AND (

                    categoria LIKE ?

                    OR fabricante LIKE ?

                    OR modelo LIKE ?

                    OR patrimonio LIKE ?

                    OR numeroSerie LIKE ?

                    OR prefixo LIKE ?

                    )

                ORDER BY categoria,modelo
                `,

                [

                    `%${texto}%`,

                    `%${texto}%`,

                    `%${texto}%`,

                    `%${texto}%`,

                    `%${texto}%`,

                    `%${texto}%`

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

    disponibilizar(id){

        return this.alterarStatus(

            id,

            "DISPONIVEL"

        );

    }

    sincronizarStatusCautela(id){
        return new Promise((resolve,reject)=>{
            db.get(`
                SELECT
                    e.status,
                    COALESCE(SUM(CASE WHEN c.status='ABERTA' AND ci.devolvido=0 THEN ci.quantidade ELSE 0 END),0) AS cautelado
                FROM equipamentos e
                LEFT JOIN cautela_itens ci ON ci.equipamentoId=e.id
                LEFT JOIN cautelas c ON c.id=ci.cautelaId
                WHERE e.id=?
                GROUP BY e.id
            `,[id],(erro,linha)=>{
                if(erro) return reject(erro);
                if(!linha) return resolve(false);
                const status = Number(linha.cautelado) > 0
                    ? "CAUTELADO"
                    : (linha.status === "CAUTELADO" ? "DISPONIVEL" : linha.status);
                db.run("UPDATE equipamentos SET status=? WHERE id=?", [status,id], erroAtualizacao => {
                    if(erroAtualizacao) reject(erroAtualizacao);
                    else resolve(true);
                });
            });
        });
    }

    contar(){

        return new Promise((resolve,reject)=>{

            db.get(

                `

                SELECT COALESCE(SUM(CASE WHEN categoria IN ('MUNICAO','OUTROS') THEN quantidade ELSE 1 END),0) total

                FROM equipamentos

                WHERE status <> 'EXCLUIDO'

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

    contarDisponiveis(){

        return new Promise((resolve,reject)=>{

            db.get(

                `

                SELECT COALESCE(SUM(CASE WHEN categoria IN ('MUNICAO','OUTROS') THEN quantidade ELSE 1 END),0) total

                FROM equipamentos

                WHERE status='DISPONIVEL'

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

    contarCautelados(){

        return new Promise((resolve,reject)=>{

            db.get(

                `

                SELECT COALESCE(SUM(CASE WHEN categoria IN ('MUNICAO','OUTROS') THEN quantidade ELSE 1 END),0) total

                FROM equipamentos

                WHERE status='CAUTELADO'

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

    contarManutencao(){

        return new Promise((resolve,reject)=>{

            db.get(

                `

                SELECT COALESCE(SUM(CASE WHEN categoria IN ('MUNICAO','OUTROS') THEN quantidade ELSE 1 END),0) total

                FROM equipamentos

                WHERE status='MANUTENCAO'

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

    contarPorCategoria(){

        return new Promise((resolve,reject)=>{

            db.all(

                `

                SELECT

                    categoria,

                    SUM(CASE WHEN categoria IN ('MUNICAO','OUTROS') THEN COALESCE(quantidade,1) ELSE 1 END) total

                FROM equipamentos

                WHERE status <> 'EXCLUIDO'

                GROUP BY categoria

                ORDER BY categoria

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

    async obterResumoCategorias(){
        const categorias = await new Promise((resolve,reject)=>{
            db.all(`
                SELECT categoria, SUM(saldoDisponivel) total
                FROM (
                    SELECT
                        e.id,
                        e.categoria,
                        CASE
                            WHEN e.categoria IN ('MUNICAO','OUTROS') THEN MAX(
                                e.quantidade - COALESCE(SUM(CASE WHEN c.id IS NOT NULL THEN ci.quantidade ELSE 0 END),0),
                                0
                            )
                            WHEN e.status='DISPONIVEL' THEN 1
                            ELSE 0
                        END AS saldoDisponivel
                    FROM equipamentos e
                    LEFT JOIN cautela_itens ci
                        ON ci.equipamentoId=e.id AND ci.devolvido=0
                    LEFT JOIN cautelas c
                        ON c.id=ci.cautelaId AND c.status='ABERTA'
                    WHERE e.status <> 'EXCLUIDO'
                    GROUP BY e.id
                )
                GROUP BY categoria
            `,[],(erro,linhas)=> erro ? reject(erro) : resolve(linhas));
        });

        const resumo = {

            ARMA_LONGA: 0,
            ARMA_CURTA: 0,
            RADIO: 0,
            COLETE: 0,
            MUNICAO: 0,
            OUTROS: 0

        };

        categorias.forEach(item => {

            resumo[item.categoria] = item.total;

        });

        return resumo;

    }
}

    module.exports = new EquipamentoRepository();
