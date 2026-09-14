const db = require("../database");

class ConfiguracaoRepository {
    obter(){ return new Promise((resolve,reject) => db.get("SELECT * FROM configuracoes WHERE id=1", [], (erro,linha) => erro ? reject(erro) : resolve(linha))); }
    salvar(dados){
        return new Promise((resolve,reject) => db.run(
            "UPDATE configuracoes SET batalhao=?, nomeUnidade=?, orgaoSeguranca=?, nomeUnidadeRelatorios=?, cidade=?, estado=?, brasao=?, comandante=?, subcomandante=?, corPrimaria=?, corBarra=?, corTitulos=?, corSecundaria=?, corMenu=?, corFundo=?, videoAbertura=? WHERE id=1",
            [dados.batalhao || "CAUTELA DEMO", dados.nomeUnidade || "Sistema de Cautela", dados.orgaoSeguranca || "ORGANIZAÇÃO DEMONSTRATIVA", dados.nomeUnidadeRelatorios || "UNIDADE DEMONSTRATIVA — SEM VALIDADE OFICIAL", dados.cidade || "", dados.estado || "", dados.brasao || "", dados.comandante || "", dados.subcomandante || "", dados.corPrimaria || "#168557", dados.corBarra || "#8b7b5d", dados.corTitulos || "#756343", dados.corSecundaria || "#756343", dados.corMenu || "#1d1c18", dados.corFundo || "#f5f6f8", dados.videoAbertura || ""],
            erro => erro ? reject(erro) : resolve(true)
        ));
    }
}
module.exports = new ConfiguracaoRepository();
