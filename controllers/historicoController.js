const historicoRepository =
require("../repositories/historicoRepository");

class HistoricoController{

    async listar(){

        return await historicoRepository.listar();

    }

    async registrar(dados){

        return await historicoRepository.registrar(

            dados

        );

    }

    async registrarDevolucao(item){

        return await historicoRepository

        .registrarDevolucao(item);

    }

}

module.exports =
new HistoricoController();