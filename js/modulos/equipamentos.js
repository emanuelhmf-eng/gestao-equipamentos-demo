(() => {
let equipamentos = [];
let equipamentoEditando = null;
let salvamentoEquipamentoEmAndamento = false;

const porId = id => document.getElementById(id);
const textoSeguro = valor => String(valor ?? "").replace(/[&<>"']/g, caractere => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
})[caractere]);
const identificacaoSerie = equipamento => [equipamento?.prefixo, equipamento?.numeroSerie]
    .filter((valor, indice, valores) => valor && valores.indexOf(valor) === indice)
    .join(" / ");
const formatarData = valor => {
    if(!valor) return "—";
    const [ano,mes,dia] = String(valor).slice(0,10).split("-");
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : "—";
};
const dataLocalISO = () => {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2,"0")}-${String(agora.getDate()).padStart(2,"0")}`;
};
const iconesCategoria = {
    ARMA_LONGA: "fa-person-rifle",
    ARMA_CURTA: "fa-gun",
    MUNICAO: "fa-crosshairs",
    RADIO: "fa-walkie-talkie",
    COLETE: "fa-shield-halved",
    OUTROS: "fa-box"
};

iniciarEquipamentos().catch(erro => {
    console.error(erro);
    alert("Não foi possível carregar os equipamentos.");
});

async function iniciarEquipamentos(){
    configurarEventos();
    atualizarCampoQuantidade();
    await carregarEquipamentos();
}

function configurarEventos(){
    porId("btnNovoEquipamento").addEventListener("click", abrirCadastroEquipamento);
    porId("btnCancelarEquipamento").addEventListener("click", () => fecharModalEquipamento());
    porId("btnFecharEquipamento").addEventListener("click", () => fecharModalEquipamento());
    porId("btnSalvarEquipamento").addEventListener("click", salvarEquipamento);
    porId("btnFecharHistoricoEquipamento").addEventListener("click", fecharHistoricoEquipamento);
    porId("btnConcluirHistoricoEquipamento").addEventListener("click", fecharHistoricoEquipamento);
    porId("categoria").addEventListener("change", atualizarCampoQuantidade);
    porId("calibreMunicao").addEventListener("change", atualizarOutroCalibre);
    porId("pesquisaEquipamento").addEventListener("input", aplicarFiltros);
    porId("filtroCategoria").addEventListener("change", aplicarFiltros);
    porId("filtroStatus").addEventListener("change", aplicarFiltros);
    document.querySelectorAll("[data-indicador-categoria]").forEach(indicador => {
        indicador.addEventListener("click", () => exibirTotalCategoria(indicador.dataset.indicadorCategoria));
    });
    porId("modalEquipamento").addEventListener("click", evento => {
        if(evento.target === porId("modalEquipamento")) fecharModalEquipamento();
    });
    porId("modalHistoricoEquipamento").addEventListener("click", evento => {
        if(evento.target === porId("modalHistoricoEquipamento")) fecharHistoricoEquipamento();
    });
    porId("modalEquipamento").addEventListener("input", evento => {
        if(evento.target.matches("input,select,textarea")){
            evento.target.classList.remove("campoInvalido");
            porId("erroEquipamento").textContent = "";
        }
    });
}

function exibirTotalCategoria(categoria){
    const nomes = {
        ARMA_LONGA: "Armas longas",
        ARMA_CURTA: "Armas curtas",
        RADIO: "Rádios",
        COLETE: "Coletes",
        MUNICAO: "Munições",
        OUTROS: "Outros"
    };
    const itens = equipamentos.filter(equipamento => equipamento.categoria === categoria);
    const quantitativos = itens.reduce((resumo, equipamento) => {
        const identificacao = categoria === "MUNICAO"
            ? equipamento.calibre || "Calibre não informado"
            : equipamento.modelo || "Modelo não informado";
        resumo[identificacao] = (resumo[identificacao] || 0)
            + (["MUNICAO","OUTROS"].includes(categoria) ? Number(equipamento.quantidade || 0) : 1);
        return resumo;
    }, {});

    document.querySelectorAll("[data-indicador-categoria]").forEach(indicador => {
        indicador.classList.toggle("selecionado", indicador.dataset.indicadorCategoria === categoria);
    });

    let painel = porId("totalCategoriaEquipamentos");
    if(!painel){
        painel = document.createElement("section");
        painel.id = "totalCategoriaEquipamentos";
        painel.className = "totalCategoriaEquipamentos";
        document.querySelector(".barraPesquisa").before(painel);
    }
    painel.innerHTML = `
        <div class="cabecalhoTotalCategoriaEquipamentos">
            <div>
                <i class="fa-solid ${iconesCategoria[categoria] || "fa-box"}"></i>
                <div>
                    <span>Quantitativo por ${categoria === "MUNICAO" ? "calibre" : "modelo"}</span>
                    <h2>${nomes[categoria] || categoria.replaceAll("_", " ")}</h2>
                </div>
            </div>
            <button type="button" id="fecharTotalCategoriaEquipamentos">Fechar</button>
        </div>
        <div class="tabelaResponsiva">
            <table class="tabela tabelaCaqui">
                <thead>
                    <tr>
                        <th>${categoria === "MUNICAO" ? "Calibre" : "Modelo"}</th>
                        <th>Quantidade</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(quantitativos)
                        .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
                        .map(([modelo, quantidade]) => `<tr><td>${textoSeguro(modelo)}</td><td><strong>${quantidade}</strong></td></tr>`)
                        .join("") || '<tr><td colspan="2" class="listaVaziaEquipamentos">Nenhum equipamento cadastrado nesta categoria.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
    porId("fecharTotalCategoriaEquipamentos").onclick = () => {
        painel.remove();
        document.querySelectorAll("[data-indicador-categoria]").forEach(indicador =>
            indicador.classList.remove("selecionado"));
    };
    painel.scrollIntoView({behavior:"smooth", block:"nearest"});
}

function abrirCadastroEquipamento(){
    equipamentoEditando = null;
    limparFormulario();
    restaurarInteratividadeFormulario();
    porId("tituloModalEquipamento").textContent = "Cadastrar novo equipamento";
    porId("btnSalvarEquipamento").textContent = "Cadastrar equipamento";
    porId("erroEquipamento").textContent = "";
    porId("modalEquipamento").classList.remove("oculto");
    requestAnimationFrame(() => porId("categoria").focus());
}

function restaurarInteratividadeFormulario(){
    document.querySelectorAll("#modalEquipamento input, #modalEquipamento select, #modalEquipamento textarea").forEach(campo => {
        campo.disabled = false;
        campo.readOnly = false;
    });
    porId("btnSalvarEquipamento").disabled = false;
    porId("btnCancelarEquipamento").disabled = false;
    salvamentoEquipamentoEmAndamento = false;
    atualizarCampoQuantidade();
}

function fecharModalEquipamento(forcar=false){
    if(salvamentoEquipamentoEmAndamento && !forcar) return;
    equipamentoEditando = null;
    limparFormulario();
    porId("modalEquipamento").classList.add("oculto");
}

function validarEquipamento(equipamento){
    if(!equipamento.categoria) return {mensagem:"Selecione a categoria.", campo:"categoria"};
    if(equipamento.categoria !== "MUNICAO" && !equipamento.modelo){
        return {mensagem:"Informe o modelo do equipamento.", campo:"modelo"};
    }
    if(["MUNICAO","ARMA_LONGA","ARMA_CURTA"].includes(equipamento.categoria) && !equipamento.calibre){
        return {
            mensagem:"Selecione ou informe o calibre da munição.",
            campo:porId("calibreMunicao").value === "OUTRO" ? "calibreMunicaoOutro" : "calibreMunicao"
        };
    }
    if(equipamento.categoria !== "MUNICAO" && !equipamento.patrimonio){
        return {mensagem:"Informe o patrimônio.", campo:"patrimonio"};
    }
    if(!Number.isInteger(equipamento.quantidade) || equipamento.quantidade < 1){
        return {mensagem:"Informe uma quantidade válida.", campo:"quantidade"};
    }
    return null;
}

function exibirErroEquipamento(validacao){
    porId("erroEquipamento").textContent = validacao.mensagem;
    const campo = porId(validacao.campo);
    if(campo){
        campo.focus();
        campo.classList.add("campoInvalido");
    }
}

function atualizarCampoQuantidade(){
    const ehMunicao = porId("categoria").value === "MUNICAO";
    const ehOutros = porId("categoria").value === "OUTROS";
    const controlaQuantidade = ehMunicao || ehOutros;
    porId("campoQuantidade").classList.toggle("oculto", !controlaQuantidade);
    porId("quantidade").disabled = !controlaQuantidade;
    porId("rotuloQuantidade").textContent = ehMunicao ? "Quantidade de munições" : "Quantidade";
    porId("ajudaQuantidade").textContent = ehMunicao
        ? "Informe o total de unidades deste lote."
        : "Informe o total de unidades deste equipamento.";
    porId("calibre").classList.add("oculto");
    porId("calibre").disabled = true;
    porId("calibreMunicao").classList.remove("oculto");
    porId("calibreMunicao").disabled = false;
    porId("obrigatorioModelo").classList.toggle("oculto", ehMunicao);
    porId("modelo").placeholder = ehMunicao
        ? "Modelo (opcional para munição)"
        : ehOutros
            ? "Ex.: Bastão, capacete, Spark ou spray de pimenta"
            : "Informe o modelo";
    if(!controlaQuantidade) porId("quantidade").value = 1;
    atualizarOutroCalibre();
    porId("patrimonio").placeholder = ehMunicao ? "Patrimônio / lote (opcional)" : "Patrimônio";
}

function atualizarOutroCalibre(){
    const exibirOutro = porId("calibreMunicao").value === "OUTRO";
    porId("calibreMunicaoOutro").classList.toggle("oculto", !exibirOutro);
    porId("calibreMunicaoOutro").disabled = !exibirOutro;
}

async function carregarEquipamentos(){
    equipamentos = await window.api.equipamento.listar();
    atualizarIndicadores();
    aplicarFiltros();
}

function atualizarIndicadores(){
    const totais = {
        ARMA_LONGA: 0, ARMA_CURTA: 0, RADIO: 0, COLETE: 0, MUNICAO: 0, OUTROS: 0
    };
    equipamentos.forEach(equipamento => {
        totais[equipamento.categoria] = (totais[equipamento.categoria] || 0)
            + (["MUNICAO","OUTROS"].includes(equipamento.categoria) ? Number(equipamento.quantidade || 0) : 1);
    });
    porId("totalLongas").textContent = totais.ARMA_LONGA;
    porId("totalCurtas").textContent = totais.ARMA_CURTA;
    porId("totalRadios").textContent = totais.RADIO;
    porId("totalColetes").textContent = totais.COLETE;
    porId("totalMunicoes").textContent = totais.MUNICAO;
    porId("totalOutros").textContent = totais.OUTROS;
}

function aplicarFiltros(){
    const pesquisa = porId("pesquisaEquipamento").value.trim().toLowerCase();
    const categoria = porId("filtroCategoria").value;
    const status = porId("filtroStatus").value;
    const lista = equipamentos.filter(equipamento => {
        const conteudo = [
            equipamento.categoria, equipamento.fabricante, equipamento.modelo,
            equipamento.patrimonio, equipamento.numeroSerie, equipamento.prefixo, equipamento.dataValidade
        ].join(" ").toLowerCase();
        return (!pesquisa || conteudo.includes(pesquisa))
            && (!categoria || equipamento.categoria === categoria)
            && (!status || equipamento.status === status);
    });
    atualizarTabela(lista);
}

function atualizarTabela(lista){
    const corpo = porId("listaEquipamentos");
    if(!lista.length){
        corpo.innerHTML = `
            <tr>
                <td colspan="10" class="listaVaziaEquipamentos">
                    Nenhum equipamento encontrado.
                </td>
            </tr>
        `;

        return;
    }
    corpo.innerHTML = lista.map(equipamento => {
        const controlaQuantidade = ["MUNICAO","OUTROS"].includes(equipamento.categoria);
        const totalUnidades = Number(equipamento.quantidade || 0);
        const unidadesCauteladas = Math.max(
            0,
            totalUnidades - Number(equipamento.saldoDisponivel ?? totalUnidades)
        );
        const quantidade = controlaQuantidade
            ? `<span class="quantidadeTabela">${totalUnidades} un.</span>
                ${unidadesCauteladas > 0
                    ? `<small class="quantidadeCauteladaTabela">− ${unidadesCauteladas} un. cautelada${unidadesCauteladas === 1 ? "" : "s"}</small>`
                    : ""}`
            : "";
        const modeloExibido = equipamento.categoria === "MUNICAO"
            ? equipamento.calibre
            : equipamento.modelo;
        const classeStatus = `status${String(equipamento.status || "").toLowerCase().replace(/(^|_)(\w)/g, (_, __, letra) => letra.toUpperCase())}`;
        const iconeCategoria = iconesCategoria[equipamento.categoria] || "fa-box";
        const classeCategoria = `categoria${String(equipamento.categoria || "OUTROS").replaceAll("_","")}`;
        const vencido = Boolean(equipamento.dataValidade && String(equipamento.dataValidade).slice(0,10) < dataLocalISO());
        return `
            <tr class="${vencido ? "equipamentoVencido" : ""}">

                <!-- FOTO -->
                <td>
                    <div
                        class="fotoEquipamentoVazia iconeCategoriaEquipamento ${classeCategoria}"
                        title="${textoSeguro(equipamento.categoria).replaceAll("_", " ")}"
                    >
                        <i class="fa-solid ${iconeCategoria}"></i>
                    </div>
                </td>

                <!-- CATEGORIA -->
                <td>
                    ${textoSeguro(equipamento.categoria)}
                    ${quantidade}
                </td>

                <!-- FABRICANTE -->
                <td>
                    ${textoSeguro(equipamento.fabricante) || "—"}
                </td>

                <!-- MODELO -->
                <td>
                    ${textoSeguro(modeloExibido) || "—"}
                </td>

                <!-- PATRIMÔNIO -->
                <td>
                    ${textoSeguro(equipamento.patrimonio) || "—"}
                </td>

                <!-- PREFIXO / NÚMERO DE SÉRIE -->
                <td>
                    ${textoSeguro(identificacaoSerie(equipamento)) || "—"}
                </td>

                <!-- VALIDADE -->
                <td>
                    <span class="validadeEquipamento ${vencido ? "validadeVencida" : ""}">
                        ${formatarData(equipamento.dataValidade)}
                    </span>
                    ${vencido ? '<small class="alertaValidadeEquipamento"><i class="fa-solid fa-triangle-exclamation"></i> Prazo de validade atingido</small>' : ""}
                </td>

                <!-- STATUS -->
                <td>
                    <span class="status ${classeStatus}">
                        ${textoSeguro(equipamento.status)}
                    </span>

                    ${
                        equipamento.status === "CAUTELADO" &&
                        equipamento.policialCautela &&
                        !["MUNICAO","OUTROS"].includes(equipamento.categoria)

                            ? `
                                <small class="responsavelCautela">
                                    <i class="fa-solid fa-user"></i>

                                    ${textoSeguro(
                                        equipamento.policialCautela
                                    )}
                                </small>
                            `

                            : ""
                    }
                </td>

                <!-- LOCALIZAÇÃO -->
                <td>
                    ${textoSeguro(equipamento.localizacao) || "—"}
                </td>

                <!-- AÇÕES -->
                <td class="acoesEquipamento">

                    <button
                        class="btnEditar"
                        data-editar="${equipamento.id}"
                        title="Editar"
                    >
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    ${["ARMA_LONGA","ARMA_CURTA"].includes(equipamento.categoria) ? `
                        <button class="btnHistoricoEquipamento" data-historico="${equipamento.id}" title="Visualizar histórico">
                            <i class="fa-solid fa-clock-rotate-left"></i>
                        </button>
                    ` : ""}

                    <button
                        class="btnExcluir"
                        data-excluir="${equipamento.id}"
                        title="Excluir"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </td>

            </tr>
        `;
        
    }).join("");
    corpo.querySelectorAll("[data-editar]").forEach(botao => {
        botao.addEventListener("click", () => editarEquipamento(Number(botao.dataset.editar)));
    });
    corpo.querySelectorAll("[data-historico]").forEach(botao => {
        botao.addEventListener("click", () => abrirHistoricoEquipamento(Number(botao.dataset.historico)));
    });
    corpo.querySelectorAll("[data-excluir]").forEach(botao => {
        botao.addEventListener("click", () => excluirEquipamento(Number(botao.dataset.excluir)));
    });
}

function fecharHistoricoEquipamento(){ porId("modalHistoricoEquipamento").classList.add("oculto"); }

async function abrirHistoricoEquipamento(id){
    const modal=porId("modalHistoricoEquipamento"),conteudo=porId("conteudoHistoricoEquipamento");
    modal.classList.remove("oculto");
    conteudo.innerHTML='<div class="carregandoHistoricoEquipamento"><i class="fa-solid fa-spinner fa-spin"></i> Carregando histórico...</div>';
    try{
        const dados=await window.api.equipamento.historico(id),equipamento=dados.equipamento||{};
        const nome=equipamento.categoria==="MUNICAO"?equipamento.calibre:equipamento.modelo;
        porId("subtituloHistoricoEquipamento").textContent=[nome,equipamento.patrimonio&&`Patrimônio ${equipamento.patrimonio}`,identificacaoSerie(equipamento)&&`Prefixo / série ${identificacaoSerie(equipamento)}`].filter(Boolean).join(" · ");
        const cautelas=dados.cautelas||[];
        const montarEventosCautela=lista=>lista.map(item=>`<div class="eventoLinhaTempoEquipamento"><span class="marcadorLinhaTempo"><i class="fa-solid fa-user-shield"></i></span><div><time>${new Date(item.dataHora).toLocaleString("pt-BR")}</time><strong>${textoSeguro(item.graduacao)} ${textoSeguro(item.nomeGuerra)||"Policial não informado"}</strong><p><b>Matrícula:</b> ${textoSeguro(item.matricula)||"Não informada"}${item.edicao?" · Equipamento adicionado durante edição":""}</p></div></div>`).join("")||'<div class="estadoVazioHistoricoEquipamento">Nenhuma cautela corresponde aos filtros informados.</div>';
        const registros=(lista,campo,vazio)=>lista.slice(0,10).map(item=>`<li><div><strong>${new Date(item.dataHora).toLocaleString("pt-BR")}</strong><p>${textoSeguro(item[campo])}</p></div></li>`).join("")||`<li class="estadoVazioHistoricoEquipamento">${vazio}</li>`;
        conteudo.innerHTML=`<div class="cardsHistoricoEquipamento"><article><i class="fa-solid fa-clipboard-check"></i><span>Total de cautelas</span><b>${dados.totalCautelas||0}</b></article><article><i class="fa-solid fa-screwdriver-wrench"></i><span>Manutenções</span><b>${dados.totalManutencoes||0}</b></article><article><i class="fa-solid fa-box-archive"></i><span>Baixas</span><b>${dados.totalBaixas||0}</b></article></div><section class="secaoHistoricoEquipamento"><div class="tituloHistoricoComFiltros"><h3><i class="fa-solid fa-timeline"></i> Policiais que cautelaram o equipamento</h3><span id="quantidadeHistoricoFiltrado">${cautelas.length} registro(s)</span></div><div class="filtrosHistoricoEquipamento"><label><span>Policial ou matrícula</span><div><i class="fa-solid fa-magnifying-glass"></i><input id="filtroPolicialHistoricoEquipamento" type="search" placeholder="Nome, graduação ou matrícula"></div></label><label><span>Data inicial</span><input id="filtroDataInicialHistoricoEquipamento" type="date"></label><label><span>Data final</span><input id="filtroDataFinalHistoricoEquipamento" type="date"></label><button id="limparFiltrosHistoricoEquipamento" type="button"><i class="fa-solid fa-eraser"></i> Limpar</button></div><div id="linhaTempoHistoricoFiltrado" class="linhaTempoEquipamento">${montarEventosCautela(cautelas)}</div></section><div class="gradeOcorrenciasEquipamento"><section class="secaoHistoricoEquipamento"><h3><i class="fa-solid fa-screwdriver-wrench"></i> Últimas manutenções</h3><ul>${registros(dados.manutencoes||[],"descricao","Nenhuma manutenção registrada.")}</ul></section><section class="secaoHistoricoEquipamento"><h3><i class="fa-solid fa-box-archive"></i> Últimas baixas e motivos</h3><ul>${registros(dados.baixas||[],"motivo","Nenhuma baixa registrada.")}</ul></section></div>`;
        const aplicarFiltrosHistorico=()=>{
            const termo=String(porId("filtroPolicialHistoricoEquipamento")?.value||"").trim().toLocaleLowerCase("pt-BR");
            const inicial=porId("filtroDataInicialHistoricoEquipamento")?.value||"";
            const final=porId("filtroDataFinalHistoricoEquipamento")?.value||"";
            const filtradas=cautelas.filter(item=>{
                const instante=new Date(item.dataHora);
                const data=Number.isNaN(instante.getTime())?"":`${instante.getFullYear()}-${String(instante.getMonth()+1).padStart(2,"0")}-${String(instante.getDate()).padStart(2,"0")}`;
                const policial=[item.nomeGuerra,item.graduacao,item.matricula].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
                return (!termo||policial.includes(termo))&&(!inicial||data>=inicial)&&(!final||data<=final);
            });
            porId("linhaTempoHistoricoFiltrado").innerHTML=montarEventosCautela(filtradas);
            porId("quantidadeHistoricoFiltrado").textContent=`${filtradas.length} registro(s)`;
        };
        ["filtroPolicialHistoricoEquipamento","filtroDataInicialHistoricoEquipamento","filtroDataFinalHistoricoEquipamento"].forEach(campo=>{
            porId(campo)?.addEventListener("input",aplicarFiltrosHistorico);
        });
        porId("limparFiltrosHistoricoEquipamento")?.addEventListener("click",()=>{
            porId("filtroPolicialHistoricoEquipamento").value="";
            porId("filtroDataInicialHistoricoEquipamento").value="";
            porId("filtroDataFinalHistoricoEquipamento").value="";
            aplicarFiltrosHistorico();
        });
    }catch(erro){conteudo.innerHTML=`<div class="estadoVazioHistoricoEquipamento">${textoSeguro(erro.message||"Não foi possível carregar o histórico.")}</div>`;}
}

async function salvarEquipamento(){
    if(salvamentoEquipamentoEmAndamento) return;
    const ehMunicao = porId("categoria").value === "MUNICAO";
    const controlaQuantidade = ehMunicao || porId("categoria").value === "OUTROS";
    const equipamento = {
        categoria: porId("categoria").value,
        fabricante: porId("fabricante").value.trim(),
        modelo: porId("modelo").value.trim(),
        calibre: porId("calibreMunicao").value === "OUTRO"
            ? porId("calibreMunicaoOutro").value.trim()
            : porId("calibreMunicao").value,
        patrimonio: porId("patrimonio").value.trim(),
        numeroSerie: porId("numeroSerie").value.trim(),
        prefixo: "",
        dataValidade: porId("dataValidade").value,
        quantidade: controlaQuantidade ? Number.parseInt(porId("quantidade").value, 10) : 1,
        status: porId("status").value,
        localizacao: porId("localizacao").value.trim(),
        observacao: porId("observacao").value.trim()
    };
    const validacao = validarEquipamento(equipamento);
    porId("erroEquipamento").textContent = "";
    document.querySelectorAll("#modalEquipamento .campoInvalido").forEach(campo => campo.classList.remove("campoInvalido"));
    if(validacao){
        exibirErroEquipamento(validacao);
        return;
    }

    try{
        const estavaEditando = Boolean(equipamentoEditando);
        salvamentoEquipamentoEmAndamento = true;
        porId("btnSalvarEquipamento").disabled = true;
        porId("btnCancelarEquipamento").disabled = true;
        if(equipamentoEditando){
            equipamento.id = equipamentoEditando;
            await window.api.equipamento.editar(equipamento);
        }else{
            await window.api.equipamento.salvar(equipamento);
        }
        fecharModalEquipamento(true);
        await carregarEquipamentos();
        window.dispatchEvent(new Event("dashboardAtualizar"));
        alert(estavaEditando ? "Equipamento atualizado com sucesso." : "Equipamento cadastrado com sucesso.");
    }catch(erro){
        porId("erroEquipamento").textContent = erro.message || "Não foi possível salvar o equipamento.";
    }finally{
        salvamentoEquipamentoEmAndamento = false;
        porId("btnSalvarEquipamento").disabled = false;
        porId("btnCancelarEquipamento").disabled = false;
    }
}

async function editarEquipamento(id){
    let equipamento;
    try{
        equipamento = await window.api.equipamento.buscar(id);
    }catch(erro){
        alert(erro.message || "Não foi possível carregar o equipamento.");
        return;
    }
    if(!equipamento){
        alert("Equipamento não encontrado.");
        return;
    }
    equipamentoEditando = id;
    ["categoria", "fabricante", "modelo", "calibre", "patrimonio", "quantidade", "status", "localizacao", "dataValidade", "observacao"].forEach(campo => {
        if(equipamento[campo] != null) porId(campo).value = equipamento[campo];
    });
    porId("numeroSerie").value = identificacaoSerie(equipamento);
    const opcoes = Array.from(porId("calibreMunicao").options).map(opcao => opcao.value);
    if(opcoes.includes(equipamento.calibre)){
        porId("calibreMunicao").value = equipamento.calibre;
    }else if(equipamento.calibre){
        porId("calibreMunicao").value = "OUTRO";
        porId("calibreMunicaoOutro").value = equipamento.calibre;
    }
    atualizarCampoQuantidade();
    porId("tituloModalEquipamento").textContent = "Editar equipamento";
    porId("btnSalvarEquipamento").textContent = "Salvar alterações";
    porId("erroEquipamento").textContent = "";
    porId("modalEquipamento").classList.remove("oculto");
}

async function excluirEquipamento(id){
    const equipamento = equipamentos.find(item => item.id === Number(id));
    if(equipamento?.status === "CAUTELADO" || equipamento?.policialCautela){
        alert("Este equipamento não pode ser excluído porque está cautelado.");
        return;
    }
    if(!confirm("Deseja realmente excluir este equipamento?")) return;
    try{
        await window.api.equipamento.excluir(id);
        await carregarEquipamentos();
        window.dispatchEvent(new Event("dashboardAtualizar"));
    }catch(erro){
        alert(erro.message || "Não foi possível excluir o equipamento.");
    }
}

function limparFormulario(){
    ["categoria", "fabricante", "modelo", "calibre", "calibreMunicao", "calibreMunicaoOutro", "patrimonio", "numeroSerie",
        "localizacao", "dataValidade", "observacao"].forEach(campo => porId(campo).value = "");
    porId("quantidade").value = 1;
    porId("status").value = "DISPONIVEL";
    porId("patrimonio").disabled = false;
    porId("erroEquipamento").textContent = "";
    document.querySelectorAll("#modalEquipamento .campoInvalido").forEach(campo => campo.classList.remove("campoInvalido"));
    atualizarCampoQuantidade();
}
})();
