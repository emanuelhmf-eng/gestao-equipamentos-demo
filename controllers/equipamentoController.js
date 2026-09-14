const equipamentoRepository =
require("../repositories/equipamentoRepository");

const historicoRepository =
require("../repositories/historicoRepository");

const usuarioRepository =
require("../repositories/usuarioRepository");

const os = require("os");

class EquipamentoController {
    async historico(id){
        const equipamento=await equipamentoRepository.buscarPorId(Number(id));
        if(!equipamento) throw new Error("Equipamento não encontrado.");
        const registros=await equipamentoRepository.historico(Number(id));
        const cautelas=[];
        const manutencoes=[];
        const baixas=[];
        for(const registro of registros){
            let dados=null;
            try{ dados=JSON.parse(registro.observacao || ""); }catch{ /* histórico legado em texto */ }
            const alteracoes=Array.isArray(dados?.alteracoes) ? dados.alteracoes : [];
            const alteracao=alteracoes.find(item=>Number(item.equipamentoId)===Number(id));
            const vinculadoDiretamente=Number(registro.equipamentoId)===Number(id);
            if(["CAUTELA","CAUTELA_EXTERNA"].includes(registro.operacao) && (alteracao || vinculadoDiretamente)){
                cautelas.push({id:registro.id,dataHora:registro.dataHora,matricula:registro.matricula,graduacao:registro.graduacao,nomeGuerra:registro.nomeGuerra,tipo:registro.tipo || "TEMPORARIA"});
            }else if(registro.operacao==="EDICAO_CAUTELA" && alteracao && String(alteracao.tipo).includes("ADICIONADO")){
                cautelas.push({id:registro.id,dataHora:registro.dataHora,matricula:registro.matricula,graduacao:registro.graduacao,nomeGuerra:registro.nomeGuerra,tipo:registro.tipo || "TEMPORARIA",edicao:true});
            }
            if(vinculadoDiretamente && registro.operacao==="MANUTENCAO") manutencoes.push({id:registro.id,dataHora:registro.dataHora,descricao:registro.observacao || "Manutenção registrada."});
            if(vinculadoDiretamente && registro.operacao==="BAIXADO") baixas.push({id:registro.id,dataHora:registro.dataHora,motivo:registro.observacao || "Motivo não informado."});
        }
        const porMes={},porAno={};
        cautelas.forEach(item=>{const instante=new Date(item.dataHora);if(Number.isNaN(instante.getTime()))return;const ano=String(instante.getFullYear()),mes=`${ano}-${String(instante.getMonth()+1).padStart(2,"0")}`;porAno[ano]=(porAno[ano]||0)+1;porMes[mes]=(porMes[mes]||0)+1;});
        return {equipamento,cautelas,porMes,porAno,totalCautelas:cautelas.length,manutencoes,totalManutencoes:manutencoes.length,baixas,totalBaixas:baixas.length};
    }


    async listar(){

        return await equipamentoRepository.listar();

    }
    async listarRelatorio(){
        return await equipamentoRepository.listar(true);
    }
    async buscar(id){

        return await equipamentoRepository.buscar(id);

    }

    async listarDisponiveis(){

        return await equipamentoRepository
        .listarDisponiveis();

    }

    async listarPorCategoria(categoria){

        return await equipamentoRepository
        .listarPorCategoria(categoria);

    }

    async salvar(equipamento){

        if(!equipamento.categoria){

            throw new Error(

                "Informe a categoria."

            );

        }

        if(equipamento.categoria !== "MUNICAO" && !equipamento.modelo){

            throw new Error(

                "Informe o modelo."

            );

        }

        const ehMunicao = equipamento.categoria === "MUNICAO";
        const ehArmamento = ["ARMA_LONGA","ARMA_CURTA"].includes(equipamento.categoria);
        const controlaQuantidade = ehMunicao || equipamento.categoria === "OUTROS";

        if((ehMunicao || ehArmamento) && !equipamento.calibre?.trim()){
            throw new Error("Selecione o calibre da munição.");
        }

        if(!ehMunicao && !equipamento.patrimonio){

            throw new Error(

                "Informe o patrimônio."

            );

        }

        equipamento.patrimonio = equipamento.patrimonio?.trim() || null;
        equipamento.numeroSerie = equipamento.numeroSerie?.trim() || null;
        equipamento.prefixo = null;
        equipamento.dataValidade = equipamento.dataValidade?.trim() || null;
        equipamento.quantidade = controlaQuantidade
            ? Number.parseInt(equipamento.quantidade, 10)
            : 1;

        if(!Number.isInteger(equipamento.quantidade) || equipamento.quantidade < 1){
            throw new Error("Informe uma quantidade válida.");
        }

        

        equipamento.dataCadastro=

        new Date().toISOString();

        equipamento.status||="DISPONIVEL";

        const id = await equipamentoRepository.salvar(equipamento);
        const sessao = await usuarioRepository.buscarSessao();
        await historicoRepository.registrar({
            cautelaId:null, usuarioId:null, armeiroId:sessao?.usuarioId || null,
            equipamentoId:id, operacao:"CADASTRO_EQUIPAMENTO",
            dataHora:equipamento.dataCadastro, computador:os.hostname(),
            observacao:`${equipamento.categoria} ${equipamento.calibre || equipamento.modelo || ""} cadastrado.`
        });
        return id;

    }

    async pesquisar(texto){

        return await equipamentoRepository.pesquisar(texto);

    }

    async editar(equipamento){

        if(!equipamento.id){

            throw new Error(

                "Equipamento inválido."

            );

        }

        if(!equipamento.categoria){
            throw new Error("Informe a categoria.");
        }

        if(equipamento.categoria !== "MUNICAO" && !equipamento.modelo){
            throw new Error("Informe o modelo.");
        }

        const ehMunicao = equipamento.categoria === "MUNICAO";
        const ehArmamento = ["ARMA_LONGA","ARMA_CURTA"].includes(equipamento.categoria);
        const controlaQuantidade = ehMunicao || equipamento.categoria === "OUTROS";
        if((ehMunicao || ehArmamento) && !equipamento.calibre?.trim()){
            throw new Error("Selecione o calibre da munição.");
        }
        equipamento.patrimonio = equipamento.patrimonio?.trim() || null;
        equipamento.numeroSerie = equipamento.numeroSerie?.trim() || null;
        equipamento.prefixo = null;
        equipamento.dataValidade = equipamento.dataValidade?.trim() || null;
        equipamento.quantidade = controlaQuantidade
            ? Number.parseInt(equipamento.quantidade, 10)
            : 1;

        if(!ehMunicao && !equipamento.patrimonio){
            throw new Error("Informe o patrimônio.");
        }

        if(!Number.isInteger(equipamento.quantidade) || equipamento.quantidade < 1){
            throw new Error("Informe uma quantidade válida.");
        }

        const equipamentoAtual = await equipamentoRepository.buscarPorId(equipamento.id);
        const camposAlterados = [
            ["categoria","Categoria"], ["fabricante","Fabricante"],
            ["modelo","Modelo"], ["calibre","Calibre"],
            ["patrimonio","Patrimônio"],
            ["numeroSerie","Prefixo / número de série"], ["quantidade","Quantidade"],
            ["dataValidade","Validade"], ["observacao","Observação"]
        ].filter(([campo]) =>
            String(equipamentoAtual?.[campo] ?? "") !== String(equipamento[campo] ?? "")
        ).map(([,rotulo]) => rotulo);
        const statusAlterado = equipamentoAtual?.status !== equipamento.status;
        const operacao = statusAlterado && ["MANUTENCAO","BAIXADO"].includes(equipamento.status)
            ? equipamento.status
            : "EDICAO_EQUIPAMENTO";
        const resultado = await equipamentoRepository.editar(equipamento);
        const sessao = await usuarioRepository.buscarSessao();
        await historicoRepository.registrar({
            cautelaId:null, usuarioId:null, armeiroId:sessao?.usuarioId || null,
            equipamentoId:equipamento.id, operacao,
            dataHora:new Date().toISOString(), computador:os.hostname(),
            observacao:operacao === "MANUTENCAO"
                ? (equipamento.observacao ? `Manutenção: ${equipamento.observacao}` : "Status do equipamento alterado para manutenção.")
                : operacao === "BAIXADO"
                    ? (equipamento.observacao ? `Motivo da baixa: ${equipamento.observacao}` : "Equipamento baixado do sistema. Motivo não informado.")
                    : `${camposAlterados.length
                        ? `Campos alterados: ${camposAlterados.join(", ")}.`
                        : "Registro salvo sem alteração de dados."}${statusAlterado
                        ? ` Status alterado de ${equipamentoAtual.status} para ${equipamento.status}.`
                        : ""}`
        });
        return resultado;

    }

    async excluir(id){
        const equipamento = (await equipamentoRepository.listar()).find(item => item.id === Number(id));
        if(!equipamento) throw new Error("Equipamento não encontrado.");
        if(equipamento.status === "CAUTELADO" || equipamento.policialCautela){
            throw new Error("O equipamento não pode ser excluído porque está cautelado.");
        }
        const resultado = await equipamentoRepository.excluir(id);
        const sessao = await usuarioRepository.buscarSessao();
        await historicoRepository.registrar({
            cautelaId:null, usuarioId:null, armeiroId:sessao?.usuarioId || null,
            equipamentoId:Number(id), operacao:"EXCLUSAO_EQUIPAMENTO",
            dataHora:new Date().toISOString(), computador:os.hostname(),
            observacao:`Equipamento ${equipamento.calibre || equipamento.modelo || equipamento.patrimonio} excluído.`
        });
        return resultado;

    }

    async alterarStatus(id,status){
        const equipamento = await equipamentoRepository.buscarPorId(id);
        if(!equipamento) throw new Error("Equipamento não encontrado.");
        const resultado = await equipamentoRepository.alterarStatus(id,status);
        if(["MANUTENCAO","BAIXADO"].includes(status) && equipamento.status !== status){
            const sessao = await usuarioRepository.buscarSessao();
            await historicoRepository.registrar({
                cautelaId:null, usuarioId:null, armeiroId:sessao?.usuarioId || null,
                equipamentoId:Number(id), operacao:status,
                dataHora:new Date().toISOString(), computador:os.hostname(),
                observacao:status === "MANUTENCAO"
                    ? "Status do equipamento alterado para manutenção."
                    : "Equipamento baixado do sistema."
            });
        }
        return resultado;

    }

    async total(){

        return await equipamentoRepository.contar();

    }

    async categorias(){

        return await equipamentoRepository
        .contarPorCategoria();

    }

    async dashboard(){

        return{

            totalEquipamentos:
                await equipamentoRepository.contar(),

            categorias:
                await equipamentoRepository.contarPorCategoria()

        };

    }

}

    module.exports =
    new EquipamentoController();

