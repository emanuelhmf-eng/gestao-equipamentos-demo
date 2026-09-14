const configuracaoRepository = require("../repositories/configuracaoRepository");
const usuarioRepository = require("../repositories/usuarioRepository");

class ConfiguracaoController {
    async obter(){ return configuracaoRepository.obter(); }
    async salvar(dados){
        const sessao = await usuarioRepository.buscarSessao();
        if(!sessao || sessao.perfil !== "ADMINISTRADOR") throw new Error("Sem permissão para alterar configurações.");
        return configuracaoRepository.salvar(dados);
    }
}
module.exports = new ConfiguracaoController();
