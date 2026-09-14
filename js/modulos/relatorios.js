(() => {
    let equipamentos = [], cautelas = [], policiais = [], historico = [], registroSelecionado = null, cautelasVisiveis = [], cautelasPermanentesVisiveis = [], cautelasExternasVisiveis = [], equipamentosVisiveis = [], policiaisVisiveis = [];
    const registrosSelecionados = new Set();
    const externasSelecionadas = new Set();
    const permanentesSelecionadas = new Set();
    const equipamentosSelecionados = new Set();
    const policiaisSelecionados = new Set();
    const el = id => document.getElementById(id);
    const seguro = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    const data = valor => valor ? new Date(valor).toLocaleString("pt-BR") : "—";
    const nomeEquipamento = item => item.categoria === "MUNICAO" ? item.calibre : item.modelo;
    const identificacaoSerie = item => [item?.prefixo,item?.numeroSerie].filter(Boolean).join(" / ");
    const textoRelatorio = valor => String(valor || "").replace(/,\s*descontada\(s\) do estoque e dos indicadores\.?/gi,".");
    const dataLocal = valor => {
        if(!valor) return "";
        const dataRegistro = new Date(valor);
        if(Number.isNaN(dataRegistro.getTime())) return "";
        const ano = dataRegistro.getFullYear();
        const mes = String(dataRegistro.getMonth() + 1).padStart(2, "0");
        const dia = String(dataRegistro.getDate()).padStart(2, "0");
        return `${ano}-${mes}-${dia}`;
    };
    const correspondeIntervalo = (valor, inicio, fim) => {
        const dataRegistro = dataLocal(valor);
        if(inicio && dataRegistro < inicio) return false;
        if(fim && dataRegistro > fim) return false;
        return true;
    };
    const resumoMovimentacao = item => {
        try{
            const dados = JSON.parse(item.observacao || "");
            return textoRelatorio([dados.resumo,dados.observacaoCautela].filter(Boolean).join(" Observação: "));
        }
        catch{ return textoRelatorio(item.observacao); }
    };
    const observacaoMovimentacao = item => {
        try{ return JSON.parse(item.observacao || "").observacaoCautela || ""; }
        catch{ return ""; }
    };
    const alteracoesMovimentacao = movimentacao => {
        try{
            const dados = JSON.parse(movimentacao.observacao || "");
            if(Array.isArray(dados.alteracoes)) return dados.alteracoes;
        }catch{ /* Registros antigos são tratados abaixo. */ }
        return (movimentacao.detalhes || []).flatMap(detalhe => {
            try{
                const dados = JSON.parse(detalhe.observacao || "");
                return Array.isArray(dados.alteracoes) ? dados.alteracoes : [];
            }catch{
                if(!detalhe.equipamentoId) return [];
                const tipo = String(detalhe.tipo || detalhe.operacao || "")
                    .replace("EDICAO_CAUTELA_ADICIONAR","ADICIONADO")
                    .replace("EDICAO_CAUTELA_REMOVER","REMOVIDO")
                    .replace("EDICAO_CAUTELA_QUANTIDADE","QUANTIDADE ALTERADA");
                return [{...detalhe,tipo}];
            }
        });
    };
    const linhasMovimentacoes = cautela => (cautela.movimentacoes || []).flatMap(movimentacao => {
        const alteracoes = alteracoesMovimentacao(movimentacao);
        if(!alteracoes.length){
            return `<tr><td>${data(movimentacao.dataHora)}</td><td>${seguro(movimentacao.operacao.replaceAll("_"," "))}</td><td colspan="4">${seguro(resumoMovimentacao(movimentacao)) || "Sem detalhes de equipamentos."}</td></tr>`;
        }
        return alteracoes.map(item => `<tr>
            <td>${data(movimentacao.dataHora)}</td>
            <td><span class="tipoAlteracaoRelatorio tipo${seguro(String(item.tipo || "ITEM").replaceAll(" ",""))}">${seguro(item.tipo || movimentacao.operacao.replaceAll("_"," "))}</span></td>
            <td>${seguro(nomeEquipamento(item)) || "Equipamento"}</td>
            <td>${seguro(item.patrimonio) || "—"}</td>
            <td>${seguro(identificacaoSerie(item)) || "—"}</td>
            <td>${seguro(textoRelatorio([item.observacao,observacaoMovimentacao(movimentacao) &&
                `Observação da edição: ${observacaoMovimentacao(movimentacao)}`].filter(Boolean).join(" "))) ||
                seguro(resumoMovimentacao(movimentacao)) || "—"}</td>
        </tr>`);
    }).join("");

    async function carregar(){
        const resultado = await Promise.all([
            window.api.equipamento.listarRelatorio(),
            window.api.cautela.listarHistorico(),
            window.api.usuario.listar(),
            window.api.historico.listar(),
            window.api.usuario.sessao()
        ]);
        [equipamentos,cautelas,policiais,historico] = resultado;
        el("acoesLimpezaRelatorios").hidden=resultado[4]?.perfil!=="ADMINISTRADOR";
        desenharEquipamentos(); desenharCautelas(); desenharPoliciais();
    }

    async function limparRelatorios(){
        const dataInicial=el("dataInicialLimpezaRelatorios").value;
        const dataFinal=el("dataFinalLimpezaRelatorios").value;
        if(!dataInicial||!dataFinal){alert("Informe a data inicial e a data final da limpeza.");return;}
        if(dataInicial>dataFinal){alert("A data inicial não pode ser posterior à data final.");return;}
        const periodo=`${new Date(`${dataInicial}T12:00:00`).toLocaleDateString("pt-BR")} a ${new Date(`${dataFinal}T12:00:00`).toLocaleDateString("pt-BR")}`;
        const senha=await window.solicitarSenhaAdministrador(`Serão removidas somente as cautelas encerradas no período de ${periodo}, considerando a data de devolução. Cautelas abertas e cadastros serão preservados. Digite sua senha para confirmar.`);
        if(senha===null) return;
        if(!senha){ alert("Informe a senha do administrador."); return; }
        try{
            const resultado=await window.api.cautela.limparRelatorios(senha,dataInicial,dataFinal);
            alert(`${resultado.total} cautela(s) encerrada(s) removida(s) dos relatórios.`);
            registrosSelecionados.clear(); externasSelecionadas.clear(); permanentesSelecionadas.clear();
            await carregar();
        }catch(erro){ alert(erro.message||"Não foi possível limpar os relatórios."); }
    }

    function desenharEquipamentos(){
        const termo = el("filtroRelatorioEquipamentos").value.trim().toLowerCase();
        const termoSerie = termo.replace(/[^a-z0-9]/g,"");
        const dataInicial = el("dataInicialRelatorioEquipamentos").value;
        const dataFinal = el("dataFinalRelatorioEquipamentos").value;
        const operacoes = ["CADASTRO_EQUIPAMENTO","EDICAO_EQUIPAMENTO","EXCLUSAO_EQUIPAMENTO","MANUTENCAO","BAIXADO"];
        equipamentosVisiveis = historico.filter(item =>
            operacoes.includes(item.operacao)
            && ([item.categoria,item.modelo,item.calibre,item.patrimonio,item.prefixo,item.numeroSerie,item.operacao,item.observacao].some(v => String(v ?? "").toLowerCase().includes(termo))
                || Boolean(termoSerie && String(item.numeroSerie ?? "").toLowerCase().replace(/[^a-z0-9]/g,"").includes(termoSerie)))
            && correspondeIntervalo(item.dataHora, dataInicial, dataFinal)
        );
        el("relatorioEquipamentos").innerHTML = equipamentosVisiveis.map(item => `<tr>
            <td><input class="seletorEquipamentoRelatorio" type="checkbox" data-id="${item.id}" ${equipamentosSelecionados.has(item.id) ? "checked" : ""}></td>
            <td>${data(item.dataHora)}</td><td>${seguro(rotuloOperacaoEquipamento(item.operacao))}</td>
            <td>${seguro(item.categoria)}</td><td>${seguro(nomeEquipamento(item))}</td>
            <td>${seguro(item.patrimonio) || "—"}</td><td>${seguro(identificacaoSerie(item)) || "—"}</td>
            <td>${["MUNICAO","OUTROS"].includes(item.categoria) ? item.quantidade : 1}</td>
            <td>${seguro(item.observacao) || "—"}</td></tr>`).join("") || vazio(9);
        vincularSelecao("Equipamento",equipamentosVisiveis,equipamentosSelecionados);
    }

    const rotuloOperacaoEquipamento = operacao => ({
        CADASTRO_EQUIPAMENTO:"Cadastro de equipamentos",
        EXCLUSAO_EQUIPAMENTO:"Exclusão de equipamentos",
        EDICAO_EQUIPAMENTO:"Edição de equipamentos",
        MANUTENCAO:"Manutenção",
        BAIXADO:"Baixado"
    }[operacao] || String(operacao || "").replaceAll("_"," "));

    function eventosCautela(){
        return cautelas.flatMap(item => {
            const permanente = item.tipo === "PERMANENTE";
            const externa = item.tipo === "EXTERNA";
            const eventos = [{
                ...item,
                dataEvento:item.dataRetirada,
                operacao:externa ? "CAUTELA EXTERNA ABERTA" : permanente ? "CAUTELA PERMANENTE ABERTA" : "CAUTELA ABERTA"
            }];
            if(item.dataDevolucao){
                eventos.push({
                    ...item,
                    dataEvento:item.dataDevolucao,
                    operacao:externa ? "DEVOLUÇÃO DE CAUTELA EXTERNA" : permanente ? "DEVOLUÇÃO DE CAUTELA PERMANENTE" : "DEVOLUÇÃO"
                });
            }
            return eventos;
        }).sort((a,b) => new Date(b.dataEvento)-new Date(a.dataEvento));
    }

    function desenharCautelas(){
        const termo = el("filtroRelatorioCautelas").value.toLowerCase();
        const dataInicial = el("dataInicialRelatorioCautelas").value;
        const dataFinal = el("dataFinalRelatorioCautelas").value;
        cautelasVisiveis = cautelas.filter(item => item.tipo === "TEMPORARIA" &&
            [item.graduacao,item.nome,item.status,item.status === "FECHADA" ? "fechado" : "aberto"].some(v => String(v ?? "").toLowerCase().includes(termo))
            && correspondeIntervalo(item.dataRetirada, dataInicial, dataFinal)
        ).sort((a,b) => new Date(b.dataRetirada)-new Date(a.dataRetirada));
        el("relatorioCautelas").innerHTML = cautelasVisiveis.map(item => {
            const chave = chaveCautela(item);
            const marcado = registrosSelecionados.has(chave);
            const situacao = item.status === "FECHADA" ? "FECHADO" : "ABERTO";
            return `<tr class="${marcado ? "registroRelatorioSelecionado" : ""}" data-cautela-relatorio="${item.id}">
                <td><input class="seletorRegistroRelatorio" type="checkbox" data-chave="${seguro(chave)}" ${marcado ? "checked" : ""} aria-label="Selecionar cautela de ${seguro(item.nome)}"></td>
                <td>${data(item.dataRetirada)}</td><td>${data(item.dataDevolucao)}</td><td>${seguro(item.graduacao)}</td><td>${seguro(item.nome)}</td><td>${situacao}</td>
            </tr>`;
        }).join("") || vazio(6);
        el("relatorioCautelas").querySelectorAll("[data-cautela-relatorio]").forEach(linha => {
            linha.onclick = evento => {
                if(evento.target.closest("input[type='checkbox']")) return;
                abrirRelatorio(Number(linha.dataset.cautelaRelatorio),"RELATÓRIO");
            };
        });
        el("relatorioCautelas").querySelectorAll(".seletorRegistroRelatorio").forEach(campo => {
            campo.onchange = () => alternarSelecao(campo.dataset.chave,campo.checked);
        });
        atualizarSelecao();
        desenharCautelasPermanentes();
        desenharCautelasExternas();
    }

    function desenharCautelasPermanentes(){
        const termo=el("filtroRelatorioPermanentes").value.toLowerCase(),inicio=el("dataInicialRelatorioPermanentes").value,fim=el("dataFinalRelatorioPermanentes").value;
        cautelasPermanentesVisiveis=cautelas.filter(item=>item.tipo==="PERMANENTE"&&[item.graduacao,item.nome,item.status,item.status==="FECHADA"?"fechado":"aberto"].some(v=>String(v||"").toLowerCase().includes(termo))&&correspondeIntervalo(item.dataRetirada,inicio,fim)).sort((a,b)=>new Date(b.dataRetirada)-new Date(a.dataRetirada));
        const corpo=el("relatorioCautelasPermanentes");
        corpo.innerHTML=cautelasPermanentesVisiveis.map(item=>{const chave=chaveCautela(item),marcado=permanentesSelecionadas.has(chave),situacao=item.status==="FECHADA"?"FECHADO":"ABERTO";return `<tr class="${marcado?"registroRelatorioSelecionado":""}" data-permanente-relatorio="${item.id}"><td><input class="seletorPermanenteRelatorio" type="checkbox" data-chave="${seguro(chave)}" ${marcado?"checked":""}></td><td>${data(item.dataRetirada)}</td><td>${data(item.dataDevolucao)}</td><td>${seguro(item.graduacao)}</td><td>${seguro(item.nome)}</td><td>${situacao}</td></tr>`;}).join("")||vazio(6);
        corpo.querySelectorAll("[data-permanente-relatorio]").forEach(l=>l.onclick=e=>{if(!e.target.closest("input"))abrirRelatorio(Number(l.dataset.permanenteRelatorio),"RELATÓRIO");});
        corpo.querySelectorAll(".seletorPermanenteRelatorio").forEach(c=>c.onchange=()=>{c.checked?permanentesSelecionadas.add(c.dataset.chave):permanentesSelecionadas.delete(c.dataset.chave);desenharCautelasPermanentes();});
        const chaves=cautelasPermanentesVisiveis.map(chaveCautela),quantidade=chaves.filter(chave=>permanentesSelecionadas.has(chave)).length;
        el("contadorSelecaoPermanentes").textContent=quantidade?`${quantidade} ${quantidade===1?"registro selecionado":"registros selecionados"}`:"Nenhum registro selecionado";
        el("btnVisualizarPermanentesSelecionadas").disabled=!quantidade;el("btnPdfPermanentesSelecionadas").disabled=!quantidade;
        el("selecionarTodasPermanentes").checked=chaves.length>0&&quantidade===chaves.length;el("selecionarTodasPermanentes").indeterminate=quantidade>0&&quantidade<chaves.length;
    }

    function desenharCautelasExternas(){
        const termo=el("filtroRelatorioExternas").value.toLowerCase(),inicio=el("dataInicialRelatorioExternas").value,fim=el("dataFinalRelatorioExternas").value;
        cautelasExternasVisiveis=cautelas.filter(item=>item.tipo==="EXTERNA"&&[item.graduacao,item.nome,item.unidadeOrigem,item.armeiroNome,item.status,item.status==="FECHADA"?"fechado":"aberto"].some(v=>String(v||"").toLowerCase().includes(termo))&&correspondeIntervalo(item.dataRetirada,inicio,fim)).sort((a,b)=>new Date(b.dataRetirada)-new Date(a.dataRetirada));
        const corpo=el("relatorioCautelasExternas");corpo.innerHTML=cautelasExternasVisiveis.map(item=>{const chave=chaveCautela(item),marcado=externasSelecionadas.has(chave),situacao=item.status==="FECHADA"?"FECHADO":"ABERTO";return `<tr class="${marcado?"registroRelatorioSelecionado":""}" data-externa-relatorio="${item.id}"><td><input class="seletorExternoRelatorio" type="checkbox" data-chave="${seguro(chave)}" ${marcado?"checked":""}></td><td>${data(item.dataRetirada)}</td><td>${data(item.dataDevolucao)}</td><td>${seguro(item.graduacao)}</td><td>${seguro(item.nome)}</td><td>${seguro(item.unidadeOrigem)||"—"}</td><td>${seguro(item.armeiroNome)||"—"}</td><td>${situacao}</td></tr>`;}).join("")||vazio(8);
        corpo.querySelectorAll("[data-externa-relatorio]").forEach(l=>l.onclick=e=>{if(!e.target.closest("input"))abrirRelatorio(Number(l.dataset.externaRelatorio),"RELATÓRIO");});corpo.querySelectorAll(".seletorExternoRelatorio").forEach(c=>c.onchange=()=>{c.checked?externasSelecionadas.add(c.dataset.chave):externasSelecionadas.delete(c.dataset.chave);atualizarSelecaoExternas();desenharCautelasExternas();});atualizarSelecaoExternas();
    }

    function atualizarSelecaoExternas(){
        const chaves=cautelasExternasVisiveis.map(chaveCautela),quantidade=chaves.filter(chave=>externasSelecionadas.has(chave)).length;
        el("contadorSelecaoExternas").textContent=quantidade?`${quantidade} ${quantidade===1?"registro selecionado":"registros selecionados"}`:"Nenhum registro selecionado";
        el("btnVisualizarExternasSelecionadas").disabled=!quantidade;el("btnPdfExternasSelecionadas").disabled=!quantidade;
        el("selecionarTodasExternas").checked=chaves.length>0&&quantidade===chaves.length;el("selecionarTodasExternas").indeterminate=quantidade>0&&quantidade<chaves.length;
    }

    const chaveEvento = item => `${item.id}|${item.operacao}`;
    const chaveCautela = item => String(item.id);

    function alternarSelecao(chave,marcado){
        if(marcado) registrosSelecionados.add(chave);
        else registrosSelecionados.delete(chave);
        desenharCautelas();
    }

    function atualizarSelecao(){
        const quantidade = registrosSelecionados.size;
        el("contadorSelecaoRelatorio").textContent = quantidade
            ? `${quantidade} ${quantidade === 1 ? "registro selecionado" : "registros selecionados"}`
            : "Nenhum registro selecionado";
        el("btnGerarPdfSelecionados").disabled = !quantidade;
        el("btnVisualizarSelecionados").disabled = !quantidade;
        const chavesVisiveis = cautelasVisiveis.map(chaveCautela);
        const marcadosVisiveis = chavesVisiveis.filter(chave => registrosSelecionados.has(chave)).length;
        el("selecionarTodosRelatorios").checked = chavesVisiveis.length > 0 && marcadosVisiveis === chavesVisiveis.length;
        el("selecionarTodosRelatorios").indeterminate = marcadosVisiveis > 0 && marcadosVisiveis < chavesVisiveis.length;
    }

    async function visualizarRelatoriosSelecionados(eventosForcados=null){
        const botao = Array.isArray(eventosForcados) ? el(eventosForcados[0]?.tipo === "PERMANENTE" ? "btnVisualizarPermanentesSelecionadas" : "btnVisualizarExternasSelecionadas") : el("btnVisualizarSelecionados");
        const eventos = Array.isArray(eventosForcados) ? eventosForcados : cautelas.filter(item => item.tipo === "TEMPORARIA" && registrosSelecionados.has(chaveCautela(item)));
        if(!eventos.length) return;
        try{
            botao.disabled = true;
            botao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Carregando';
            const registros = await Promise.all(eventos.map(async item => ({
                ...await window.api.cautela.detalhes(item.id),
                operacao:"RELATÓRIO"
            })));
            const variosRelatorios = registros.length > 1;
            const tituloGeral = variosRelatorios ? "RELATÓRIOS DE CAUTELAS" : "RELATÓRIO DE CAUTELA";
            const documentos = registros.map((cautela,indice) => `
                <article class="relatorioSelecionadoVisualizacao">
                    <h2>${variosRelatorios ? `${indice + 1}. RELATÓRIO` : "RELATÓRIO DE CAUTELA"}</h2>
                    <div class="dadosDocumentoCautela">
                        <p><b>Policial:</b> ${seguro(cautela.graduacao)} ${seguro(cautela.nomeGuerra || cautela.nome)}</p>
                        <p><b>Tipo:</b> ${cautela.tipo === "EXTERNA" ? "Cautela externa" : cautela.tipo === "PERMANENTE" ? "Cautela permanente" : "Cautela temporária"}</p>
                        <p><b>Matrícula:</b> ${seguro(cautela.matricula)}</p>
                        <p><b>Devolução da cautela:</b> ${data(cautela.dataDevolucao)}</p>
                        <p><b>Abertura da cautela:</b> ${data(cautela.dataRetirada)}</p>
                        <p><b>Situação da cautela:</b> ${cautela.status === "FECHADA" ? "FECHADO" : "ABERTO"}</p>
                        <p><b>Armeiro responsável:</b> ${seguro(cautela.armeiroNome) || "—"}</p>
                        ${cautela.tipo === "EXTERNA" ? `<p><b>Unidade:</b> ${seguro(cautela.unidadeOrigem)}</p><p><b>Telefone:</b> ${seguro(cautela.telefoneExterno)}</p><p><b>Motivo:</b> ${seguro(cautela.motivoExterno)}</p><p><b>Autoridade solicitante:</b> ${seguro(cautela.autoridadeSolicitante)}</p><p><b>Responsável que autorizou:</b> ${seguro(cautela.responsavelAutorizou)}</p>` : ""}
                        ${cautela.observacao ? `<p class="observacaoDocumentoCautela"><b>Observação:</b> ${seguro(cautela.observacao)}</p>` : ""}
                    </div>
                    <h3>Equipamentos</h3>
                    <table><thead><tr><th>Categoria</th><th>Equipamento</th><th>Patrimônio</th><th>Prefixo / número de série</th><th>Quantidade</th></tr></thead>
                    <tbody>${(cautela.itens || []).map(item => `<tr><td>${seguro(item.categoria)}</td><td>${seguro(nomeEquipamento(item))}</td><td>${seguro(item.patrimonio) || "—"}</td><td>${seguro(identificacaoSerie(item)) || "—"}</td><td>${item.quantidade}</td></tr>`).join("")}</tbody></table>
                    <h3>Movimentações e edições</h3>
                    <table><thead><tr><th>Data e hora</th><th>Modificação</th><th>Equipamento</th><th>Patrimônio</th><th>Prefixo / número de série</th><th>Descrição</th></tr></thead>
                    <tbody>${linhasMovimentacoes(cautela) || `<tr><td colspan="6">Nenhuma movimentação registrada.</td></tr>`}</tbody></table>
                </article>`).join("");
            el("tituloRelatorioListagem").textContent = tituloGeral;
            el("documentoRelatorioListagem").innerHTML =
                `${cabecalhoRelatorio(tituloGeral)}${documentos}`;
            el("modalRelatorioListagem").classList.remove("oculto");
        }catch(erro){
            alert(erro.message || "Não foi possível visualizar os relatórios selecionados.");
        }finally{
            botao.innerHTML = '<i class="fa-solid fa-eye"></i> Visualizar selecionados';
            atualizarSelecao();
            atualizarSelecaoExternas();
            desenharCautelasPermanentes();
        }
    }

    async function gerarRelatorioSelecionados(eventosForcados=null){
        const botao = Array.isArray(eventosForcados) ? el(eventosForcados[0]?.tipo === "PERMANENTE" ? "btnPdfPermanentesSelecionadas" : "btnPdfExternasSelecionadas") : el("btnGerarPdfSelecionados");
        const eventos = Array.isArray(eventosForcados) ? eventosForcados : cautelas.filter(item => item.tipo === "TEMPORARIA" && registrosSelecionados.has(chaveCautela(item)));
        if(!eventos.length) return;
        try{
            botao.disabled = true;
            botao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando relatório';
            const registros = await Promise.all(eventos.map(async item => ({
                ...await window.api.cautela.detalhes(item.id),
                operacao:"RELATÓRIO"
            })));
            const resultado = await window.api.relatorio.gerarPDF({registros});
            alert(`Relatório único gerado com sucesso.\n${resultado.arquivo}`);
        }catch(erro){
            alert(erro.message || "Não foi possível gerar o relatório selecionado.");
        }finally{
            botao.innerHTML = Array.isArray(eventosForcados)
                ? '<i class="fa-solid fa-file-pdf"></i> Gerar PDF selecionados'
                : '<i class="fa-solid fa-file-pdf"></i> Gerar relatório selecionado';
            atualizarSelecao();
            atualizarSelecaoExternas();
            desenharCautelasPermanentes();
        }
    }

    function desenharPoliciais(){
        const termo = el("filtroRelatorioPoliciais").value.toLowerCase();
        const dataInicial = el("dataInicialRelatorioPoliciais").value;
        const dataFinal = el("dataFinalRelatorioPoliciais").value;
        const operacoes = ["CADASTRO_POLICIAL","EDICAO_POLICIAL","ALTERACAO_SENHA_USUARIO","ATIVACAO_POLICIAL","DESATIVACAO_POLICIAL"];
        policiaisVisiveis = historico.filter(item =>
            operacoes.includes(item.operacao)
            && [item.matricula,item.graduacao,item.nomeGuerra,item.nome,item.operacao,item.observacao].some(v => String(v ?? "").toLowerCase().includes(termo))
            && correspondeIntervalo(item.dataHora, dataInicial, dataFinal)
        );
        el("relatorioPoliciais").innerHTML = policiaisVisiveis.map(item => `<tr>
            <td><input class="seletorPolicialRelatorio" type="checkbox" data-id="${item.id}" ${policiaisSelecionados.has(item.id) ? "checked" : ""}></td>
            <td>${data(item.dataHora)}</td><td>${seguro(String(item.operacao || "").replaceAll("_"," "))}</td>
            <td>${seguro(item.matricula)}</td><td>${seguro(item.graduacao)}</td>
            <td>${seguro(item.nomeGuerra || item.nome)}</td><td>${seguro(item.observacao) || "—"}</td></tr>`).join("") || vazio(7);
        vincularSelecao("Policial",policiaisVisiveis,policiaisSelecionados);
    }

    function vincularSelecao(tipo,lista,selecionados){
        const plural = tipo === "Equipamento" ? "Equipamentos" : "Policiais";
        document.querySelectorAll(`.seletor${tipo}Relatorio`).forEach(campo => {
            campo.onchange = () => {
                const id = Number(campo.dataset.id);
                if(campo.checked) selecionados.add(id); else selecionados.delete(id);
                atualizarSelecaoListagem(plural,lista,selecionados);
            };
        });
        atualizarSelecaoListagem(plural,lista,selecionados);
    }

    function atualizarSelecaoListagem(plural,lista,selecionados){
        const ids = lista.map(item => item.id);
        const quantidade = ids.filter(id => selecionados.has(id)).length;
        el(`contadorSelecao${plural}`).textContent = quantidade
            ? `${quantidade} ${quantidade === 1 ? "registro selecionado" : "registros selecionados"}`
            : "Nenhum registro selecionado";
        const todos = el(`selecionarTodos${plural}`);
        todos.checked = ids.length > 0 && quantidade === ids.length;
        todos.indeterminate = quantidade > 0 && quantidade < ids.length;
    }

    const registrosEscolhidos = tipo => {
        const equipamentosRelatorio = tipo === "EQUIPAMENTOS";
        const lista = equipamentosRelatorio ? equipamentosVisiveis : policiaisVisiveis;
        const selecionados = equipamentosRelatorio ? equipamentosSelecionados : policiaisSelecionados;
        const escolhidos = lista.filter(item => selecionados.has(item.id));
        return escolhidos.length ? escolhidos : lista;
    };

    const cabecalhoRelatorio = titulo => { const identidade=window.identidadeSistema||{}; return `<header class="cabecalhoDocumentoDemo"><img src="${seguro(identidade.brasao||"../assets/demo-logo.svg")}" alt="${seguro(identidade.batalhao||"CAUTELA DEMO")}"><div><strong>DEMONSTRAÇÃO — SEM VALIDADE OFICIAL</strong><span>${seguro(identidade.orgaoSeguranca||"ORGANIZAÇÃO DEMONSTRATIVA")}</span><span>${seguro(identidade.nomeUnidadeRelatorios||"UNIDADE DEMONSTRATIVA — SEM VALIDADE OFICIAL")}</span></div></header><h2>${seguro(titulo)}</h2>`; };
    function visualizarListagem(tipo){
        const equipamentosRelatorio = tipo === "EQUIPAMENTOS";
        const lista = registrosEscolhidos(tipo);
        const titulo = equipamentosRelatorio ? "RELATÓRIO DE EQUIPAMENTOS" : "RELATÓRIO DE POLICIAIS";
        const cabecalhos = equipamentosRelatorio
            ? ["Data e hora","Operação","Categoria","Equipamento","Patrimônio","Prefixo / número de série","Quantidade","Observações e edições"]
            : ["Data e hora","Operação","Matrícula","Graduação","Nome de guerra","Modificações"];
        const linhas = lista.map(item => equipamentosRelatorio
            ? [data(item.dataHora),rotuloOperacaoEquipamento(item.operacao),item.categoria,nomeEquipamento(item),item.patrimonio,identificacaoSerie(item),["MUNICAO","OUTROS"].includes(item.categoria) ? item.quantidade : 1,item.observacao]
            : [data(item.dataHora),String(item.operacao || "").replaceAll("_"," "),item.matricula,item.graduacao,item.nomeGuerra || item.nome,item.observacao]);
        el("tituloRelatorioListagem").textContent = titulo;
        el("documentoRelatorioListagem").innerHTML = `${cabecalhoRelatorio(titulo)}<table><thead><tr>${cabecalhos.map(c => `<th>${seguro(c)}</th>`).join("")}</tr></thead><tbody>${linhas.map(linha => `<tr>${linha.map(valor => `<td>${seguro(valor) || "—"}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${cabecalhos.length}">Nenhum registro.</td></tr>`}</tbody></table>`;
        el("modalRelatorioListagem").classList.remove("oculto");
    }
    async function gerarPdfListagem(tipo){
        const registros = registrosEscolhidos(tipo);
        const resultado = await window.api.relatorio.gerarPDF({tipoRelatorio:tipo,registros});
        alert(`PDF gerado com sucesso.\n${resultado.arquivo}`);
    }

    async function abrirRelatorio(id,operacao){
        const cautela = await window.api.cautela.detalhes(id);
        registroSelecionado = {...cautela,operacao};
        el("documentoRelatorioCautela").innerHTML = `
            ${cabecalhoRelatorio("RELATÓRIO DE CAUTELA").replace(/<h2>.*<\/h2>$/s,"")}
            <h2>RELATÓRIO DE CAUTELA</h2>
            <div class="dadosDocumentoCautela"><p><b>Policial:</b> ${seguro(cautela.graduacao)} ${seguro(cautela.nomeGuerra || cautela.nome)}</p><p><b>Tipo:</b> ${cautela.tipo === "EXTERNA" ? "Cautela externa" : cautela.tipo === "PERMANENTE" ? "Cautela permanente" : "Cautela temporária"}</p><p><b>Matrícula:</b> ${seguro(cautela.matricula)}</p><p><b>Devolução da cautela:</b> ${data(cautela.dataDevolucao)}</p><p><b>Abertura da cautela:</b> ${data(cautela.dataRetirada)}</p><p><b>Situação da cautela:</b> ${cautela.status === "FECHADA" ? "FECHADO" : "ABERTO"}</p><p><b>Armeiro:</b> ${seguro(cautela.armeiroNome)}</p>${cautela.tipo === "EXTERNA" ? `<p><b>Unidade:</b> ${seguro(cautela.unidadeOrigem)}</p><p><b>Telefone:</b> ${seguro(cautela.telefoneExterno)}</p><p><b>E-mail:</b> ${seguro(cautela.emailExterno)||"—"}</p><p><b>Motivo:</b> ${seguro(cautela.motivoExterno)}</p><p><b>Autoridade solicitante:</b> ${seguro(cautela.autoridadeSolicitante)}</p><p><b>Responsável que autorizou:</b> ${seguro(cautela.responsavelAutorizou)}</p>` : ""}${cautela.observacao ? `<p class="observacaoDocumentoCautela"><b>Observação:</b> ${seguro(cautela.observacao)}</p>` : ""}</div>
            <h3>Equipamentos</h3>
            <table><thead><tr><th>Categoria</th><th>Equipamento</th><th>Patrimônio</th><th>Prefixo / número de série</th><th>Quantidade</th></tr></thead><tbody>${cautela.itens.map(item => `<tr><td>${seguro(item.categoria)}</td><td>${seguro(nomeEquipamento(item))}</td><td>${seguro(item.patrimonio) || "—"}</td><td>${seguro(identificacaoSerie(item)) || "—"}</td><td>${item.quantidade}</td></tr>`).join("")}</tbody></table>
            <h3>Movimentações e edições</h3>
            <table class="tabelaAlteracoesRelatorio"><thead><tr><th>Data e hora</th><th>Modificação</th><th>Equipamento</th><th>Patrimônio</th><th>Prefixo / número de série</th><th>Descrição</th></tr></thead><tbody>${linhasMovimentacoes(cautela) || `<tr><td colspan="6">Nenhuma movimentação registrada.</td></tr>`}</tbody></table>`;
        el("modalRelatorioCautela").classList.remove("oculto");
    }

    function vazio(colunas){ return `<tr><td colspan="${colunas}" class="estadoVazioTabela">Nenhum registro encontrado.</td></tr>`; }
    el("filtroRelatorioEquipamentos").oninput = desenharEquipamentos;
    el("dataInicialRelatorioEquipamentos").onchange = desenharEquipamentos;
    el("dataFinalRelatorioEquipamentos").onchange = desenharEquipamentos;
    el("filtroRelatorioCautelas").oninput = desenharCautelas;
    el("dataInicialRelatorioCautelas").onchange = desenharCautelas;
    el("dataFinalRelatorioCautelas").onchange = desenharCautelas;
    el("filtroRelatorioExternas").oninput = desenharCautelasExternas;
    el("dataInicialRelatorioExternas").onchange = desenharCautelasExternas;
    el("dataFinalRelatorioExternas").onchange = desenharCautelasExternas;
    el("filtroRelatorioPermanentes").oninput = desenharCautelasPermanentes;
    el("dataInicialRelatorioPermanentes").onchange = desenharCautelasPermanentes;
    el("dataFinalRelatorioPermanentes").onchange = desenharCautelasPermanentes;
    el("selecionarTodasPermanentes").onchange = evento => {cautelasPermanentesVisiveis.forEach(item=>evento.target.checked?permanentesSelecionadas.add(chaveCautela(item)):permanentesSelecionadas.delete(chaveCautela(item)));desenharCautelasPermanentes();};
    const eventosPermanentesSelecionados=()=>cautelas.filter(item=>item.tipo==="PERMANENTE"&&permanentesSelecionadas.has(chaveCautela(item)));
    el("btnVisualizarPermanentesSelecionadas").onclick=()=>visualizarRelatoriosSelecionados(eventosPermanentesSelecionados());
    el("btnPdfPermanentesSelecionadas").onclick=()=>gerarRelatorioSelecionados(eventosPermanentesSelecionados());
    el("selecionarTodosRelatorios").onchange = evento => {
        cautelasVisiveis.forEach(item => {
            const chave = chaveCautela(item);
            if(evento.target.checked) registrosSelecionados.add(chave);
            else registrosSelecionados.delete(chave);
        });
        desenharCautelas();
    };
    el("btnGerarPdfSelecionados").onclick = () => gerarRelatorioSelecionados();
    el("btnVisualizarSelecionados").onclick = () => visualizarRelatoriosSelecionados();
    el("selecionarTodasExternas").onchange = evento => {
        cautelasExternasVisiveis.forEach(item => evento.target.checked
            ? externasSelecionadas.add(chaveCautela(item))
            : externasSelecionadas.delete(chaveCautela(item)));
        desenharCautelasExternas();
    };
    const eventosExternosSelecionados = () => cautelas.filter(item =>
        item.tipo === "EXTERNA" && externasSelecionadas.has(chaveCautela(item)));
    el("btnVisualizarExternasSelecionadas").onclick = () => visualizarRelatoriosSelecionados(eventosExternosSelecionados());
    el("btnPdfExternasSelecionadas").onclick = () => gerarRelatorioSelecionados(eventosExternosSelecionados());
    el("filtroRelatorioPoliciais").oninput = desenharPoliciais;
    el("dataInicialRelatorioPoliciais").onchange = desenharPoliciais;
    el("dataFinalRelatorioPoliciais").onchange = desenharPoliciais;
    el("selecionarTodosEquipamentos").onchange = evento => {
        equipamentosVisiveis.forEach(item => evento.target.checked
            ? equipamentosSelecionados.add(item.id)
            : equipamentosSelecionados.delete(item.id));
        desenharEquipamentos();
    };
    el("selecionarTodosPoliciais").onchange = evento => {
        policiaisVisiveis.forEach(item => evento.target.checked
            ? policiaisSelecionados.add(item.id)
            : policiaisSelecionados.delete(item.id));
        desenharPoliciais();
    };
    el("btnVisualizarRelatorioEquipamentos").onclick = () => visualizarListagem("EQUIPAMENTOS");
    el("btnGerarPdfEquipamentos").onclick = () => gerarPdfListagem("EQUIPAMENTOS").catch(erro => alert(erro.message));
    el("btnVisualizarRelatorioPoliciais").onclick = () => visualizarListagem("POLICIAIS");
    el("btnGerarPdfPoliciais").onclick = () => gerarPdfListagem("POLICIAIS").catch(erro => alert(erro.message));
    el("btnLimparRelatorios").onclick = limparRelatorios;
    el("fecharRelatorioListagem").onclick = () => el("modalRelatorioListagem").classList.add("oculto");
    el("fecharRelatorioCautela").onclick = () => el("modalRelatorioCautela").classList.add("oculto");
    el("btnGerarPdfCautela").onclick = async () => {
        if(!registroSelecionado) return;
        try{
            const resultado = await window.api.relatorio.gerarPDF(registroSelecionado);
            alert(`PDF gerado com sucesso.\n${resultado.arquivo}`);
        }
        catch(erro){ alert(erro.message || "Não foi possível gerar o PDF."); }
    };
    carregar().catch(erro => alert(erro.message));
})();
