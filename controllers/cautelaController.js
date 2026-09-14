const cautelaRepository = require("../repositories/cautelaRepository");
const equipamentoRepository = require("../repositories/equipamentoRepository");
const historicoRepository = require("../repositories/historicoRepository");
const usuarioRepository = require("../repositories/usuarioRepository");
const policialExternoRepository = require("../repositories/policialExternoRepository");
const bcrypt = require("bcrypt");
const os = require("os");

class CautelaController {
    validarPeriodo(dataInicial,dataFinal){
        const formato=/^\d{4}-\d{2}-\d{2}$/;
        const dataValida=valor=>{
            if(!formato.test(String(valor||"")))return false;
            const data=new Date(`${valor}T00:00:00Z`);
            return !Number.isNaN(data.getTime())&&data.toISOString().slice(0,10)===valor;
        };
        if(!dataValida(dataInicial)||!dataValida(dataFinal)){
            throw new Error("Informe a data inicial e a data final da limpeza.");
        }
        if(dataInicial>dataFinal) throw new Error("A data inicial não pode ser posterior à data final.");
        return {dataInicial,dataFinal};
    }

    validarDadosExternos(dados){
        const campos = [
            ["matriculaExterna","Matrícula"],["nomeCompletoExterno","Nome completo"],
            ["nomeGuerraExterno","Nome de guerra"],["graduacaoExterna","Graduação"],
            ["unidadeOrigem","Unidade de origem"],["telefoneExterno","Telefone"],
            ["motivoExterno","Motivo da cautela"]
        ];
        for(const [campo,rotulo] of campos){
            dados[campo] = String(dados[campo] || "").trim();
            if(!dados[campo]) throw new Error(`Informe: ${rotulo}.`);
        }
        dados.emailExterno = String(dados.emailExterno || "").trim();
        dados.autoridadeSolicitante = String(dados.autoridadeSolicitante || "").trim();
        dados.responsavelAutorizou = String(dados.responsavelAutorizou || "").trim();
        dados.observacao = String(dados.observacao || "").trim().slice(0,1000);
    }
    async validarOperador(){
        const sessao = await usuarioRepository.buscarSessao();
        if(!sessao || !["ADMINISTRADOR","ARMEIRO"].includes(sessao.perfil)){
            throw new Error("Sem permissão para realizar esta operação.");
        }
        return sessao;
    }

    async validarSenhaOperacao(senha,policial,sessao){
        if(policial && await bcrypt.compare(senha || "",policial.senhaHash)) return true;
        if(sessao?.perfil === "ADMINISTRADOR"){
            const administrador = await usuarioRepository.buscar(sessao.usuarioId);
            if(administrador?.ativo && await bcrypt.compare(senha || "",administrador.senhaHash)) return true;
        }
        return false;
    }

    async validarAdministrador(senha){
        const sessao = await usuarioRepository.buscarSessao();
        if(!sessao || sessao.perfil !== "ADMINISTRADOR") throw new Error("Apenas administradores podem realizar esta operação.");
        const administrador = await usuarioRepository.buscar(sessao.usuarioId);
        if(!administrador?.ativo || !await bcrypt.compare(senha || "",administrador.senhaHash)){
            throw new Error("Senha universal do administrador inválida.");
        }
        return sessao;
    }

    detalheItem(item,tipo,observacao){
        return {
            tipo,
            equipamentoId:Number(item.equipamentoId || item.id),
            categoria:item.categoria,
            modelo:item.modelo,
            calibre:item.calibre,
            patrimonio:item.patrimonio,
            prefixo:item.prefixo,
            numeroSerie:item.numeroSerie,
            quantidade:Number(item.quantidade || 1),
            observacao
        };
    }

    observacaoOperacao(resumo,alteracoes,observacaoCautela=""){
        return JSON.stringify({resumo,alteracoes,observacaoCautela});
    }

    async nova(cautela){
        if(!cautela.usuarioId) throw new Error("Usuário não informado.");
        if(!cautela.armeiroId) throw new Error("Armeiro não informado.");
        if(!Array.isArray(cautela.itens) || !cautela.itens.length){
            throw new Error("Selecione pelo menos um equipamento.");
        }
        cautela.observacao = String(cautela.observacao || "").trim().slice(0,1000);
        cautela.tipo = cautela.tipo === "PERMANENTE" ? "PERMANENTE" : "TEMPORARIA";
        cautela.emergencial = cautela.emergencial === true;
        const dataRegistro = new Date();
        const dataRetirada = cautela.emergencial ? new Date(cautela.dataRetirada) : dataRegistro;
        if(Number.isNaN(dataRetirada.getTime())) throw new Error("Data e hora da cautela emergencial inválidas.");
        if(dataRetirada.getTime() > dataRegistro.getTime()) throw new Error("A data da cautela emergencial não pode estar no futuro.");
        cautela.dataRetirada = dataRetirada.toISOString();
        let dataRecebimentoEmergencial = null;
        if(cautela.emergencial && cautela.dataRecebimentoEmergencial){
            dataRecebimentoEmergencial = new Date(cautela.dataRecebimentoEmergencial);
            if(Number.isNaN(dataRecebimentoEmergencial.getTime())) throw new Error("Data e hora do recebimento inválidas.");
            if(dataRecebimentoEmergencial.getTime() < dataRetirada.getTime()) throw new Error("O recebimento não pode ocorrer antes da entrega.");
            if(dataRecebimentoEmergencial.getTime() > dataRegistro.getTime()) throw new Error("A data do recebimento não pode estar no futuro.");
        }

        const sessao = await this.validarOperador();
        if(sessao.usuarioId !== cautela.armeiroId) throw new Error("Sessão do armeiro inválida.");
        const policial = await usuarioRepository.buscar(cautela.usuarioId);
        const armeiro = await usuarioRepository.buscar(cautela.armeiroId);
        if(!policial?.ativo || !armeiro?.ativo) throw new Error("Policial ou armeiro inválido.");
        if(!await this.validarSenhaOperacao(cautela.senhaPolicial,policial,sessao)){
            throw new Error("Confirmação de senha inválida.");
        }

        const disponiveis = await equipamentoRepository.listarDisponiveis();
        for(const item of cautela.itens){
            const equipamento = disponiveis.find(e => e.id === Number(item.id));
            const quantidade = ["MUNICAO","OUTROS"].includes(equipamento?.categoria) ? Number.parseInt(item.quantidade,10) : 1;
            if(!equipamento || !Number.isInteger(quantidade) || quantidade < 1
                || quantidade > Number(equipamento.saldoDisponivel)){
                throw new Error("Um ou mais equipamentos não possuem saldo disponível.");
            }
            item.quantidade = quantidade;
        }

        const cautelaId = await cautelaRepository.finalizar(cautela);
        const alteracoes = cautela.itens.map(item => {
            const equipamento = disponiveis.find(e => e.id === Number(item.id)) || item;
            return this.detalheItem({...equipamento,quantidade:item.quantidade},"ADICIONADO",`Quantidade cautelada: ${item.quantidade}.`);
        });
        await historicoRepository.registrar({
            cautelaId, usuarioId:cautela.usuarioId, armeiroId:sessao.usuarioId,
            equipamentoId:null, operacao:"CAUTELA", dataHora:cautela.dataRetirada,
            computador:os.hostname(),
            observacao:this.observacaoOperacao(
                `${cautela.tipo === "PERMANENTE" ? "Cautela permanente" : "Cautela"}${cautela.emergencial ? " emergencial, registrada posteriormente" : ""} emitida com ${alteracoes.length} item(ns).`,
                alteracoes,
                cautela.emergencial
                    ? `${cautela.observacao ? `${cautela.observacao} | ` : ""}Registro emergencial lançado no sistema em ${dataRegistro.toLocaleString("pt-BR")}.`
                    : cautela.observacao || ""
            )
        });
        if(dataRecebimentoEmergencial){
            const itensRegistrados = await cautelaRepository.listarItens(cautelaId);
            for(const item of itensRegistrados){
                await cautelaRepository.devolverItem(item.id,dataRecebimentoEmergencial.toISOString());
                await equipamentoRepository.sincronizarStatusCautela(item.equipamentoId);
            }
            await cautelaRepository.fechar(cautelaId,dataRecebimentoEmergencial.toISOString());
            await historicoRepository.registrar({
                cautelaId,usuarioId:cautela.usuarioId,armeiroId:sessao.usuarioId,
                equipamentoId:null,operacao:"DEVOLUCAO",dataHora:dataRecebimentoEmergencial.toISOString(),
                computador:os.hostname(),
                observacao:this.observacaoOperacao(
                    `Recebimento emergencial registrado posteriormente: ${itensRegistrados.length} item(ns) devolvido(s).`,
                    itensRegistrados.map(item=>this.detalheItem(item,"DEVOLVIDO","Item recebido integralmente.")),
                    `Registro lançado no sistema em ${dataRegistro.toLocaleString("pt-BR")}.`
                )
            });
        }
        return cautelaId;
    }

    async novaExterna(cautela){
        this.validarDadosExternos(cautela);
        if(!Array.isArray(cautela.itens) || !cautela.itens.length){
            throw new Error("Selecione pelo menos um equipamento.");
        }
        const sessao = await this.validarOperador();
        const armeiro = await usuarioRepository.buscar(sessao.usuarioId);
        if(!armeiro || !await bcrypt.compare(cautela.senhaArmeiro || "",armeiro.senhaHash)){
            throw new Error("Senha do armeiro inválida.");
        }
        const disponiveis = await equipamentoRepository.listarDisponiveis();
        for(const item of cautela.itens){
            const equipamento = disponiveis.find(e => e.id === Number(item.id));
            const quantidade = ["MUNICAO","OUTROS"].includes(equipamento?.categoria)
                ? Number.parseInt(item.quantidade,10) : 1;
            if(!equipamento || !Number.isInteger(quantidade) || quantidade < 1 ||
                quantidade > Number(equipamento.saldoDisponivel)){
                throw new Error("Um ou mais equipamentos não possuem saldo disponível.");
            }
            item.quantidade = quantidade;
        }
        Object.assign(cautela,{usuarioId:sessao.usuarioId,armeiroId:sessao.usuarioId,
            dataRetirada:new Date().toISOString(),dataPrevista:null,tipo:"EXTERNA"});
        const cautelaId = await cautelaRepository.finalizar(cautela);
        await policialExternoRepository.salvarOuAtualizar(cautela);
        const alteracoes = cautela.itens.map(item => {
            const equipamento = disponiveis.find(e => e.id === Number(item.id)) || item;
            return this.detalheItem({...equipamento,quantidade:item.quantidade},"ADICIONADO",`Quantidade cautelada: ${item.quantidade}.`);
        });
        await historicoRepository.registrar({
            cautelaId,usuarioId:null,armeiroId:sessao.usuarioId,equipamentoId:null,
            operacao:"CAUTELA_EXTERNA",dataHora:new Date().toISOString(),computador:os.hostname(),
            observacao:this.observacaoOperacao(
                `Cautela externa emitida para ${cautela.graduacaoExterna} ${cautela.nomeGuerraExterno}, da unidade ${cautela.unidadeOrigem}.`,
                alteracoes,cautela.observacao
            )
        });
        return cautelaId;
    }

    async listarAbertas(tipo){
        return cautelaRepository.listarAbertas(["PERMANENTE","EXTERNA"].includes(tipo) ? tipo : "TEMPORARIA");
    }

    async detalhes(id){
        const cautelaId = Number(id);
        const cautela = await cautelaRepository.buscar(cautelaId);
        if(!cautela) throw new Error("Cautela não encontrada.");
        return {
            ...cautela,
            nome:cautela.nomeGuerra || cautela.nome || "",
            graduacao:cautela.graduacao || "",
            itens:await cautelaRepository.listarItens(cautelaId),
            movimentacoes:await historicoRepository.listarPorCautela(cautelaId)
        };
    }

    async listarHistorico(){ return cautelaRepository.listarHistorico(); }

    async editar(dados){
        const cautelaId = Number(dados.cautelaId);
        const observacaoEdicao = String(dados.observacao || "").trim().slice(0,1000);
        const cautela = await cautelaRepository.buscar(cautelaId);
        const sessao = await this.validarOperador();
        if(!cautela || cautela.status !== "ABERTA") throw new Error("Cautela aberta não encontrada.");

        if(cautela.tipo === "EXTERNA" && dados.dadosExternos){
            dados.dadosExternos.observacao = cautela.observacao || "";
            this.validarDadosExternos(dados.dadosExternos);
            await cautelaRepository.atualizarDadosExternos(cautelaId,dados.dadosExternos);
            await policialExternoRepository.salvarOuAtualizar(dados.dadosExternos);
            dados.observacao = String(dados.observacao || "Dados cadastrais da cautela externa atualizados.");
        }

        const desejados = Array.isArray(dados.itens) ? dados.itens : [];
        if(!desejados.length) throw new Error("A cautela deve possuir pelo menos um equipamento.");
        const ids = desejados.map(item => Number(item.equipamentoId));
        if(new Set(ids).size !== ids.length) throw new Error("Há equipamentos duplicados na edição.");

        const atuais = (await cautelaRepository.listarItens(cautelaId)).filter(item => !item.devolvido);
        const disponiveis = await equipamentoRepository.listarDisponiveis();
        const equipamentos = await equipamentoRepository.listar();
        const alteracoes = [];

        for(const desejado of desejados){
            const equipamentoId = Number(desejado.equipamentoId);
            const atual = atuais.find(item => item.equipamentoId === equipamentoId);
            const equipamento = equipamentos.find(item => item.id === equipamentoId);
            if(!equipamento) throw new Error("Equipamento inválido.");
            const quantidade = ["MUNICAO","OUTROS"].includes(equipamento.categoria) ? Number.parseInt(desejado.quantidade,10) : 1;
            const saldo = Number(disponiveis.find(item => item.id === equipamentoId)?.saldoDisponivel || 0);
            const limite = saldo + Number(atual?.quantidade || 0);
            if(!Number.isInteger(quantidade) || quantidade < 1 || quantidade > limite){
                throw new Error(`Quantidade indisponível para ${equipamento.calibre || equipamento.modelo}.`);
            }
        }

        for(const atual of atuais){
            const desejado = desejados.find(item => Number(item.equipamentoId) === atual.equipamentoId);
            if(!desejado){
                await cautelaRepository.excluirItem(atual.id);
                await equipamentoRepository.sincronizarStatusCautela(atual.equipamentoId);
                alteracoes.push(this.detalheItem(atual,"REMOVIDO",`Removido da cautela (quantidade ${atual.quantidade}).`));
            }
        }

        for(const desejado of desejados){
            const equipamentoId = Number(desejado.equipamentoId);
            const equipamento = equipamentos.find(item => item.id === equipamentoId);
            const quantidade = ["MUNICAO","OUTROS"].includes(equipamento.categoria) ? Number.parseInt(desejado.quantidade,10) : 1;
            const atual = atuais.find(item => item.equipamentoId === equipamentoId);
            if(!atual){
                await cautelaRepository.salvarItem(cautelaId,equipamentoId,quantidade);
                await equipamentoRepository.sincronizarStatusCautela(equipamentoId);
                alteracoes.push(this.detalheItem({...equipamento,quantidade},"ADICIONADO",`Adicionado à cautela (quantidade ${quantidade}).`));
            }else if(Number(atual.quantidade) !== quantidade){
                await cautelaRepository.atualizarQuantidade(atual.id,quantidade);
                await equipamentoRepository.sincronizarStatusCautela(equipamentoId);
                const aumentou = quantidade > Number(atual.quantidade);
                const diferenca = Math.abs(quantidade - Number(atual.quantidade));
                alteracoes.push(this.detalheItem(
                    {...equipamento,quantidade:diferenca},
                    aumentou ? "ADICIONADO" : "REMOVIDO",
                    `${diferenca} unidade(s) ${aumentou ? "adicionada(s) à" : "removida(s) da"} cautela. Quantidade alterada de ${atual.quantidade} para ${quantidade}.`
                ));
            }
        }

        if(alteracoes.length || observacaoEdicao){
            await historicoRepository.registrar({
                cautelaId, usuarioId:cautela.usuarioId, armeiroId:sessao.usuarioId,
                equipamentoId:null, operacao:"EDICAO_CAUTELA",
                dataHora:new Date().toISOString(), computador:os.hostname(),
                observacao:this.observacaoOperacao(
                    `Cautela editada: ${alteracoes.length} modificação(ões).`,
                    alteracoes,
                    observacaoEdicao
                )
            });
        }
        return true;
    }

    async receberCautela(dados){
        const cautelaId = Number(dados.cautelaId);
        const observacaoRecebimento = String(dados.observacao || "").trim().slice(0,1000);
        const cautela = await cautelaRepository.buscar(cautelaId);
        const sessao = await this.validarOperador();
        if(!cautela || cautela.status !== "ABERTA") throw new Error("Cautela aberta não encontrada.");
        const usuarioConfirmacao = cautela.tipo === "EXTERNA"
            ? await usuarioRepository.buscar(sessao.usuarioId)
            : await usuarioRepository.buscar(cautela.usuarioId);
        const senhaConfirmacao = cautela.tipo === "EXTERNA" ? dados.senhaArmeiro : dados.senhaPolicial;
        if(!usuarioConfirmacao || !await this.validarSenhaOperacao(senhaConfirmacao,usuarioConfirmacao,sessao)){
            throw new Error(cautela.tipo === "EXTERNA" ? "Senha do armeiro inválida." : "Senha do policial inválida.");
        }
        const itens = (await cautelaRepository.listarItens(cautelaId)).filter(item => !item.devolvido);
        if(!itens.length) throw new Error("A cautela não possui itens pendentes.");
        const quantidadesRecebidas = new Map((Array.isArray(dados.itens) ? dados.itens : [])
            .map(item=>[Number(item.itemId),Number.parseInt(item.quantidade,10)]));
        const movimentacoes=[];
        let totalNaoDevolvido=0;
        for(const item of itens){
            const quantidadeTotal=Number(item.quantidade || 1);
            const quantidade=item.categoria === "MUNICAO" && quantidadesRecebidas.has(item.id)
                ? quantidadesRecebidas.get(item.id) : quantidadeTotal;
            if(!Number.isInteger(quantidade) || quantidade < 0 || quantidade > quantidadeTotal){
                throw new Error(`Quantidade devolvida inválida para ${item.calibre || item.modelo}.`);
            }
            const naoDevolvida=item.categoria === "MUNICAO" ? quantidadeTotal-quantidade : 0;
            await cautelaRepository.devolverItem(item.id);
            if(quantidade > 0) movimentacoes.push({...item,quantidade,tipoMovimentacao:"DEVOLVIDO",observacaoMovimentacao:`${quantidade} unidade(s) devolvida(s).`});
            if(naoDevolvida > 0){
                await equipamentoRepository.baixarQuantidadeNaoDevolvida(item.equipamentoId,naoDevolvida);
                totalNaoDevolvido+=naoDevolvida;
                movimentacoes.push({...item,quantidade:naoDevolvida,tipoMovimentacao:"NÃO DEVOLVIDO",observacaoMovimentacao:`${naoDevolvida} unidade(s) de munição não entregue(s).`});
            }
            await equipamentoRepository.sincronizarStatusCautela(item.equipamentoId);
        }
        await cautelaRepository.fechar(cautelaId);
        await this.registrarDevolucaoAgrupada(
            cautela,sessao,movimentacoes,totalNaoDevolvido
                ? `Cautela encerrada com ${totalNaoDevolvido} munição(ões) não devolvida(s)`
                : "Cautela encerrada",observacaoRecebimento
        );
        return {encerrada:true,quantidadeNaoDevolvida:totalNaoDevolvido};
    }

    async registrarDevolucaoAgrupada(cautela,sessao,itens,resumo,observacao=""){
        return historicoRepository.registrar({
            cautelaId:cautela.id, usuarioId:cautela.usuarioId,
            armeiroId:sessao.usuarioId, equipamentoId:null,
            operacao:"DEVOLUCAO", dataHora:new Date().toISOString(),
            computador:os.hostname(),
            observacao:this.observacaoOperacao(
                `${resumo}: ${itens.length} item(ns) devolvido(s).`,
                itens.map(item => this.detalheItem(
                    item,item.tipoMovimentacao || "DEVOLVIDO",
                    item.observacaoMovimentacao || "Item devolvido."
                )),
                observacao
            )
        });
    }

    async devolver(item){
        const cautela = await cautelaRepository.buscar(item.cautelaId);
        const sessao = await this.validarOperador();
        const itens = await cautelaRepository.listarItens(item.cautelaId);
        const atual = itens.find(i => i.id === item.id && i.equipamentoId === item.equipamentoId);
        if(!cautela || !atual || atual.devolvido) throw new Error("Item de cautela inválido ou já devolvido.");
        await cautelaRepository.devolverItem(atual.id);
        await equipamentoRepository.sincronizarStatusCautela(atual.equipamentoId);
        await this.registrarDevolucaoAgrupada(cautela,sessao,[atual],"Devolução parcial");
        await cautelaRepository.verificarFechamento(item.cautelaId);
        return true;
    }

    async carregarNovaCautela(){
        return {
            policiais:await usuarioRepository.listar(),
            equipamentos:await equipamentoRepository.listarDisponiveis()
        };
    }

    async limparRelatoriosEncerrados(dados={}){
        const periodo = this.validarPeriodo(dados.dataInicial,dados.dataFinal);
        const sessao = await this.validarAdministrador(dados.senha);
        const total = await cautelaRepository.limparEncerradas(periodo.dataInicial,periodo.dataFinal);
        await historicoRepository.registrar({
            cautelaId:null,usuarioId:null,armeiroId:sessao.usuarioId,equipamentoId:null,
            operacao:"LIMPEZA_RELATORIOS",dataHora:new Date().toISOString(),computador:os.hostname(),
            observacao:`Administrador removeu ${total} cautela(s) encerrada(s) dos relatórios entre ${periodo.dataInicial} e ${periodo.dataFinal}. Cautelas abertas foram preservadas.`
        });
        return {total,...periodo};
    }

    async limparHistorico(dados={}){
        const periodo = this.validarPeriodo(dados.dataInicial,dados.dataFinal);
        const sessao = await this.validarAdministrador(dados.senha);
        const total = await historicoRepository.limparPeriodo(periodo.dataInicial,periodo.dataFinal);
        await historicoRepository.registrar({
            cautelaId:null,usuarioId:null,armeiroId:sessao.usuarioId,equipamentoId:null,
            operacao:"LIMPEZA_HISTORICO",dataHora:new Date().toISOString(),computador:os.hostname(),
            observacao:`Administrador removeu ${total} registro(s) do histórico entre ${periodo.dataInicial} e ${periodo.dataFinal}.`
        });
        return {total,...periodo};
    }
}

module.exports = new CautelaController();
