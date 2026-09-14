(() => {
    let cautelaSelecionada = null;
    let cautelasTemporarias = [];
    let cautelasPermanentes = [];
    let cautelasExternas = [];
    let equipamentosEdicao = [];
    let selecionadosEdicao = new Map();
    let selecionadosOriginaisEdicao = new Map();
    const municoesPorArmaEdicao = new Map();
    const filtrosCategoriaEdicao = {};
    const categoriasAbertasEdicao = new Set();
    const retornarParaNovaCautela = sessionStorage.getItem("recebimentoOriginadoNovaCautela") === "1";
    sessionStorage.removeItem("recebimentoOriginadoNovaCautela");
    const el = id => document.getElementById(id);
    const seguro = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    const nomeEquipamento = item => item.categoria === "MUNICAO" ? item.calibre : item.modelo;
    const nomeCategoriaEdicao = categoria => categoria === "MUNICAO" ? "MUNIÇÃO" : String(categoria || "OUTROS").replaceAll("_"," ");
    const normalizarCalibreEdicao = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
    const chaveCalibreEdicao = valor => String(valor || "").replace(",",".").match(/(?:\d+\.\d+|\.\d+|\d+)/)?.[0]?.replace(".","") || "";
    const municaoCompativelEdicao = arma => {
        const exata=normalizarCalibreEdicao(arma.calibre),chave=chaveCalibreEdicao(arma.calibre);
        const municoes=equipamentosEdicao.filter(item=>item.categoria==="MUNICAO"&&Number(item.saldoDisponivel)>0);
        return municoes.find(item=>normalizarCalibreEdicao(item.calibre)===exata)||municoes.find(item=>chave&&chaveCalibreEdicao(item.calibre)===chave)||null;
    };

    function configurarEventos(){
        document.querySelectorAll("[data-fechar-modal]").forEach(botao => {
            botao.addEventListener("click", () => fecharModal(botao.dataset.fecharModal));
        });
        document.querySelectorAll(".modalCautela").forEach(modal => {
            modal.addEventListener("click", evento => { if(evento.target === modal) fecharModal(modal.id); });
        });
        el("btnSalvarEdicaoCautela").addEventListener("click", salvarEdicao);
        el("btnConfirmarRecebimentoCautela").addEventListener("click", confirmarRecebimento);
        el("senhaReceberCautela").addEventListener("keydown", evento => {
            if(evento.key !== "Enter" || evento.repeat) return;
            evento.preventDefault();
            const botao = el("btnConfirmarRecebimentoCautela");
            if(!el("modalReceberCautela").classList.contains("oculto") && !botao.disabled){
                confirmarRecebimento();
            }
        });
        el("pesquisaEdicaoCautela").addEventListener("input", desenharEquipamentosEdicao);
        el("filtroCautelasTemporarias").addEventListener("input", filtrarTabelasCautelas);
        el("filtroCautelasPermanentes").addEventListener("input", filtrarTabelasCautelas);
        el("filtroCautelasExternas").addEventListener("input", filtrarTabelasCautelas);
    }

    async function carregarCautelasAbertas(){
        [cautelasTemporarias, cautelasPermanentes, cautelasExternas] = await Promise.all([
            window.api.cautela.listarAbertas("TEMPORARIA"),
            window.api.cautela.listarAbertas("PERMANENTE"),
            window.api.cautela.listarAbertas("EXTERNA")
        ]);
        filtrarTabelasCautelas();
        await abrirRecebimentoSolicitado();
    }

    async function abrirRecebimentoSolicitado(){
        const usuarioId=Number(sessionStorage.getItem("receberCautelaUsuarioId"));
        sessionStorage.removeItem("receberCautelaUsuarioId");
        if(!usuarioId) return;
        const cautela=[...cautelasTemporarias,...cautelasPermanentes]
            .find(item=>Number(item.usuarioId)===usuarioId);
        if(!cautela){
            alert("O policial selecionado não possui cautela em aberto.");
            return;
        }
        await abrirRecebimento(cautela.id);
    }

    function filtrarTabelasCautelas(){
        const filtrar = (lista,termo) => lista.filter(cautela => [
            cautela.nome,
            cautela.graduacao,
            cautela.unidadeOrigem,
            new Date(cautela.dataRetirada).toLocaleString("pt-BR")
        ].some(valor => String(valor || "").toLowerCase().includes(termo)));
        desenharTabelaCautelas(
            "listaCautelasAbertas",
            filtrar(cautelasTemporarias,el("filtroCautelasTemporarias").value.toLowerCase().trim()),
            "Não há cautelas temporárias correspondentes."
        );
        desenharTabelaCautelas(
            "listaCautelasPermanentes",
            filtrar(cautelasPermanentes,el("filtroCautelasPermanentes").value.toLowerCase().trim()),
            "Não há cautelas permanentes correspondentes."
        );
        desenharTabelaCautelasExternas(filtrar(cautelasExternas,el("filtroCautelasExternas").value.toLowerCase().trim()));
    }

    function desenharTabelaCautelasExternas(cautelas){
        const corpo=el("listaCautelasExternas");
        corpo.innerHTML=cautelas.map(c=>`<tr><td><strong>${seguro(c.nome)}</strong></td><td>${seguro(c.graduacao)||"—"}</td><td>${seguro(c.unidadeOrigem)||"—"}</td><td>${new Date(c.dataRetirada).toLocaleString("pt-BR")}</td><td class="acoesCautelaAberta"><button class="btnDetalhesCautela" data-detalhes="${c.id}"><i class="fa-solid fa-eye"></i> Detalhes</button><button class="btnEditarCautela" data-editar="${c.id}"><i class="fa-solid fa-pen"></i> Editar</button><button class="btnReceberCautela" data-receber="${c.id}"><i class="fa-solid fa-box-open"></i> Receber</button></td></tr>`).join("")||'<tr><td colspan="5" class="estadoVazioTabela">Não há cautelas externas abertas.</td></tr>';
        corpo.querySelectorAll("[data-detalhes]").forEach(b=>b.onclick=()=>abrirDetalhes(Number(b.dataset.detalhes)));corpo.querySelectorAll("[data-editar]").forEach(b=>b.onclick=()=>abrirEdicao(Number(b.dataset.editar)));corpo.querySelectorAll("[data-receber]").forEach(b=>b.onclick=()=>abrirRecebimento(Number(b.dataset.receber)));
    }

    function desenharTabelaCautelas(idCorpo, cautelas, mensagemVazia){
        const corpo = el(idCorpo);
        corpo.innerHTML = cautelas.map(cautela => `<tr>
            <td><strong>${seguro(cautela.nome)}</strong></td>
            <td>${seguro(cautela.graduacao) || "—"}</td>
            <td><span class="dataHoraCautela"><i class="fa-regular fa-calendar"></i>${new Date(cautela.dataRetirada).toLocaleString("pt-BR")}</span></td>
            <td class="acoesCautelaAberta">
                <button class="btnDetalhesCautela" data-detalhes="${cautela.id}"><i class="fa-solid fa-eye"></i> Detalhes</button>
                <button class="btnEditarCautela" data-editar="${cautela.id}"><i class="fa-solid fa-pen"></i> Editar</button>
                <button class="btnReceberCautela" data-receber="${cautela.id}"><i class="fa-solid fa-box-open"></i> Receber</button>
            </td>
        </tr>`).join("") || `<tr><td colspan="4" class="estadoVazioTabela">${mensagemVazia}</td></tr>`;
        corpo.querySelectorAll("[data-detalhes]").forEach(b => b.onclick = () => abrirDetalhes(Number(b.dataset.detalhes)));
        corpo.querySelectorAll("[data-editar]").forEach(b => b.onclick = () => abrirEdicao(Number(b.dataset.editar)));
        corpo.querySelectorAll("[data-receber]").forEach(b => b.onclick = () => abrirRecebimento(Number(b.dataset.receber)));
    }

    async function abrirDetalhes(id){
        const cautela = await window.api.cautela.detalhes(id);
        el("subtituloDetalhesCautela").textContent = `${cautela.graduacao || ""} ${cautela.nome || ""} · ${new Date(cautela.dataRetirada).toLocaleString("pt-BR")}`;
        el("conteudoDetalhesCautela").innerHTML = cautela.itens.filter(item => !item.devolvido).map(item => `
            <div class="itemDetalheCautela"><i class="fa-solid fa-box"></i><div><strong>${seguro(nomeEquipamento(item))}</strong><span>${seguro(item.categoria)} · ${seguro(item.patrimonio) || "Sem patrimônio"} · ${item.quantidade} ${item.quantidade === 1 ? "unidade" : "unidades"}</span></div></div>
        `).join("") || "<p>Nenhum equipamento pendente.</p>";
        if(cautela.tipo === "EXTERNA") el("conteudoDetalhesCautela").insertAdjacentHTML("afterbegin",`<div class="resumoOperacaoHistorico"><strong>Matrícula:</strong> ${seguro(cautela.matriculaExterna)}<br><strong>Nome completo:</strong> ${seguro(cautela.nomeCompletoExterno)}<br><strong>Nome de guerra:</strong> ${seguro(cautela.nomeGuerraExterno)}<br><strong>Graduação:</strong> ${seguro(cautela.graduacaoExterna)}<br><strong>Unidade:</strong> ${seguro(cautela.unidadeOrigem)}<br><strong>Telefone:</strong> ${seguro(cautela.telefoneExterno)}<br><strong>E-mail:</strong> ${seguro(cautela.emailExterno)||"—"}<br><strong>Motivo:</strong> ${seguro(cautela.motivoExterno)}<br><strong>Autoridade solicitante:</strong> ${seguro(cautela.autoridadeSolicitante)}<br><strong>Responsável que autorizou:</strong> ${seguro(cautela.responsavelAutorizou)}</div>`);
        abrirModal("modalDetalhesCautela");
    }

    async function abrirEdicao(id){
        cautelaSelecionada = await window.api.cautela.detalhes(id);
        const disponiveis = await window.api.equipamento.listarDisponiveis();
        selecionadosEdicao = new Map(cautelaSelecionada.itens.filter(item => !item.devolvido)
            .map(item => [item.equipamentoId, Number(item.quantidade)]));
        selecionadosOriginaisEdicao = new Map(selecionadosEdicao);
        const unicos = new Map();
        [...cautelaSelecionada.itens.filter(item => !item.devolvido), ...disponiveis].forEach(item => {
            const idEquipamento = Number(item.equipamentoId || item.id);
            unicos.set(idEquipamento,{...item,id:idEquipamento,
                saldoDisponivel:Number(item.saldoDisponivel || 0) + Number(selecionadosEdicao.get(idEquipamento) || 0)});
        });
        equipamentosEdicao = [...unicos.values()];
        municoesPorArmaEdicao.clear();
        const vinculadas=new Map();
        equipamentosEdicao.filter(item=>selecionadosEdicao.has(item.id)&&["ARMA_LONGA","ARMA_CURTA"].includes(item.categoria)).forEach(arma=>{
            const municao=municaoCompativelEdicao(arma),total=Number(selecionadosEdicao.get(municao?.id)||0),usado=Number(vinculadas.get(municao?.id)||0);
            if(municao&&usado<total){municoesPorArmaEdicao.set(arma.id,{municaoId:municao.id,quantidade:1});vinculadas.set(municao.id,usado+1);}
        });
        Object.keys(filtrosCategoriaEdicao).forEach(chave => delete filtrosCategoriaEdicao[chave]);
        categoriasAbertasEdicao.clear();
        el("subtituloEditarCautela").textContent = `${cautelaSelecionada.graduacao || ""} ${cautelaSelecionada.nome || ""}`;
        el("pesquisaEdicaoCautela").value = "";
        const secaoExterna=el("dadosExternosEdicao");
        const ehCautelaExterna=cautelaSelecionada.tipo==="EXTERNA";
        secaoExterna.classList.toggle("oculto",!ehCautelaExterna);
        secaoExterna.hidden=!ehCautelaExterna;
        if(!ehCautelaExterna)el("camposExternosEdicao").innerHTML="";
        if(ehCautelaExterna){
            const campos=[["matriculaExterna","Matrícula"],["nomeCompletoExterno","Nome completo"],["nomeGuerraExterno","Nome de guerra"],["graduacaoExterna","Graduação"],["unidadeOrigem","Unidade de origem"],["telefoneExterno","Telefone"],["emailExterno","E-mail"],["motivoExterno","Motivo"],["autoridadeSolicitante","Autoridade solicitante"],["responsavelAutorizou","Responsável que autorizou"]];
            el("camposExternosEdicao").innerHTML=campos.map(([campo,rotulo])=>`<label><span>${rotulo}</span><input data-externo="${campo}" value="${seguro(cautelaSelecionada[campo])}"></label>`).join("");
        }
        el("observacaoEdicaoCautela").value = "";
        desenharEquipamentosEdicao();
        abrirModal("modalEditarCautela");
    }

    function desenharEquipamentosEdicao(){
        const termo = el("pesquisaEdicaoCautela").value.toLowerCase().trim();
        const lista = equipamentosEdicao.filter(item => [item.categoria,nomeEquipamento(item),item.patrimonio]
            .some(valor => String(valor ?? "").toLowerCase().includes(termo)));
        const grupos = lista.reduce((resultado,item) => {
            (resultado[item.categoria || "OUTROS"] ||= []).push(item);
            return resultado;
        },{});
        const destino = el("listaEdicaoCautela");
        destino.innerHTML = Object.entries(grupos).map(([categoria,itens]) => `
            <section class="grupoEquipamentos ${categoriasAbertasEdicao.has(categoria) ? "aberto" : ""}" data-categoria-edicao="${seguro(categoria)}">
                <h3>${seguro(categoria.replaceAll("_"," "))}</h3>
                <div class="pesquisaCategoriaEquipamento campoComIcone">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input type="search" data-pesquisa-categoria-edicao="${seguro(categoria)}"
                        value="${seguro(filtrosCategoriaEdicao[categoria] || "")}"
                        placeholder="Pesquisar nesta categoria">
                </div>
                <div class="itensCategoriaEquipamento">
                    ${itens.map(item => {
                        const marcado = selecionadosEdicao.has(item.id);
                        const quantidade = selecionadosEdicao.get(item.id) || 1;
                        return `<label class="itemEdicaoCautela itemEquipamentoCautela categoria-${item.categoria}">
                            <input type="checkbox" data-selecionar="${item.id}" ${marcado ? "checked" : ""}>
                            <div class="dadosEquipamentoCautela"><strong>${seguro(nomeEquipamento(item)) || "Sem identificação"}</strong>
                                <div class="identificadoresEquipamentoCautela"><span><b>Patrimônio:</b> ${seguro(item.patrimonio) || "Não informado"}</span><span><b>Prefixo / nº de série:</b> ${seguro([item.prefixo,item.numeroSerie].filter(Boolean).join(" / ")) || "Não informado"}</span></div>
                            </div>
                            ${["MUNICAO","OUTROS"].includes(item.categoria) ? `<div class="controleQuantidadeEdicao"><input class="quantidadeEdicaoCautela" data-quantidade="${item.id}" type="number" min="1" max="${item.saldoDisponivel}" value="${quantidade}" ${marcado ? "" : "disabled"}><small>de ${item.saldoDisponivel}</small></div>` : ""}
                        </label>`;
                    }).join("")}
                    <p class="semResultadoCategoria oculto">Nenhum equipamento encontrado nesta categoria.</p>
                </div>
            </section>
        `).join("") || "<p>Nenhum equipamento encontrado.</p>";
        destino.querySelectorAll("[data-selecionar]").forEach(campo => {
            campo.onchange = () => {
                const id = Number(campo.dataset.selecionar);
                if(campo.checked) selecionadosEdicao.set(id,1); else selecionadosEdicao.delete(id);
                desenharEquipamentosEdicao();
            };
        });
        destino.querySelectorAll("[data-quantidade]").forEach(campo => {
            campo.onclick = evento => evento.stopPropagation();
            campo.oninput = () => {
                const limite = Number(campo.max);
                const quantidade = Math.min(limite,Math.max(1,Number(campo.value) || 1));
                selecionadosEdicao.set(Number(campo.dataset.quantidade),quantidade);
                desenharSelecionadosEdicao();
            };
        });
        destino.querySelectorAll("[data-pesquisa-categoria-edicao]").forEach(campo => {
            const filtrar = () => {
                const grupo = campo.closest(".grupoEquipamentos");
                const pesquisa = campo.value.toLowerCase().trim();
                let visiveis = 0;
                grupo.querySelectorAll(".itemEdicaoCautela").forEach(item => {
                    const corresponde = item.textContent.toLowerCase().includes(pesquisa);
                    item.classList.toggle("ocultoPorPesquisa",!corresponde);
                    if(corresponde) visiveis++;
                });
                grupo.querySelector(".semResultadoCategoria").classList.toggle("oculto",visiveis > 0);
            };
            campo.oninput = () => {
                filtrosCategoriaEdicao[campo.dataset.pesquisaCategoriaEdicao] = campo.value;
                filtrar();
            };
            filtrar();
        });
        destino.querySelectorAll(".grupoEquipamentos h3").forEach(titulo => {
            titulo.onclick = () => {
                const grupo = titulo.closest(".grupoEquipamentos");
                const categoria = grupo.dataset.categoriaEdicao;
                grupo.classList.toggle("aberto");
                if(grupo.classList.contains("aberto")) categoriasAbertasEdicao.add(categoria);
                else categoriasAbertasEdicao.delete(categoria);
            };
        });
        desenharSelecionadosEdicao();
    }

    function desenharSelecionadosEdicao(){
        const destino = el("listaSelecionadosEdicaoCautela");
        const itens = equipamentosEdicao.filter(item => selecionadosEdicao.has(item.id));
        const total = itens.reduce((soma,item) => soma + Number(selecionadosEdicao.get(item.id) || 1),0);
        el("totalSelecionadosEdicaoCautela").textContent = `${total} ${total === 1 ? "item" : "itens"}`;
        destino.innerHTML = itens.map(item => `
            <div class="equipamentoSelecionado">
                <div class="dadosSelecionadoCautela"><strong>${seguro(item.categoria)} — ${seguro(nomeEquipamento(item))}</strong>
                    <span>Patrimônio: ${seguro(item.patrimonio) || "Não informado"}</span>
                    <span>Quantidade: ${selecionadosEdicao.get(item.id) || 1}</span>
                </div>
                <button type="button" data-remover-edicao="${item.id}">Remover</button>
            </div>
        `).join("") || `<div class="estadoVazioSelecionados"><i class="fa-solid fa-box-open"></i><strong>Nenhum item selecionado</strong><span>Marque os equipamentos na seção acima.</span></div>`;
        destino.querySelectorAll("[data-remover-edicao]").forEach(botao => {
            botao.onclick = () => {
                selecionadosEdicao.delete(Number(botao.dataset.removerEdicao));
                desenharEquipamentosEdicao();
            };
        });
    }

    function ajustarMunicaoEdicao(id,diferenca){
        if(!id||!diferenca)return;
        const atual=Number(selecionadosEdicao.get(Number(id))||0),novo=atual+Number(diferenca);
        if(novo>0)selecionadosEdicao.set(Number(id),novo);else selecionadosEdicao.delete(Number(id));
    }

    function desenharEquipamentosEdicao(){
        const termo=el("pesquisaEdicaoCautela").value.toLowerCase().trim();
        const grupos=equipamentosEdicao.filter(item=>[item.categoria,nomeEquipamento(item),item.patrimonio,item.prefixo,item.numeroSerie].some(v=>String(v||"").toLowerCase().includes(termo))).reduce((r,item)=>{(r[item.categoria||"OUTROS"]||=[]).push(item);return r;},{});
        const aberta=[...categoriasAbertasEdicao][0]||null;
        const entradas=Object.entries(grupos).filter(([categoria])=>!aberta||categoria===aberta);
        const destino=el("listaEdicaoCautela");
        destino.innerHTML=entradas.map(([categoria,itens])=>`<section class="grupoEquipamentos ${aberta===categoria?"aberto":""}" data-categoria-edicao="${seguro(categoria)}"><h3>${seguro(nomeCategoriaEdicao(categoria))}</h3><div class="pesquisaCategoriaEquipamento campoComIcone"><i class="fa-solid fa-magnifying-glass"></i><input type="search" data-pesquisa-categoria-edicao="${seguro(categoria)}" value="${seguro(filtrosCategoriaEdicao[categoria]||"")}" placeholder="Pesquisar nesta categoria"></div><div class="itensCategoriaEquipamento">${itens.map(item=>{
            const marcado=selecionadosEdicao.has(item.id),quantidade=Number(selecionadosEdicao.get(item.id)||1),arma=["ARMA_LONGA","ARMA_CURTA"].includes(item.categoria),vinculo=municoesPorArmaEdicao.get(item.id)||{};
            const municao=equipamentosEdicao.find(eq=>eq.id===Number(vinculo.municaoId)),totalMunicao=Number(selecionadosEdicao.get(Number(vinculo.municaoId))||0),maximo=Math.max(1,Number(municao?.saldoDisponivel||1)-Math.max(0,totalMunicao-Number(vinculo.quantidade||0)));
            const opcoes=equipamentosEdicao.filter(eq=>eq.categoria==="MUNICAO"&&Number(eq.saldoDisponivel)>0).map(eq=>`<option value="${eq.id}" ${Number(vinculo.municaoId)===eq.id?"selected":""}>${seguro(eq.calibre)}</option>`).join("");
            const ids=item.categoria==="MUNICAO"?"":`<span><b>Prefixo / nº de série:</b> ${seguro([item.prefixo,item.numeroSerie].filter(Boolean).join(" / "))||"Não informado"}</span>`;
            return `<div class="itemEdicaoCautela itemEquipamentoCautela categoria-${item.categoria}"><input type="checkbox" data-selecionar="${item.id}" ${marcado?"checked":""}><div class="dadosEquipamentoCautela"><strong>${seguro(nomeEquipamento(item))||"Sem identificação"}</strong><div class="identificadoresEquipamentoCautela"><span><b>Patrimônio:</b> ${seguro(item.patrimonio)||"Não informado"}</span>${ids}</div></div>${arma?`<div class="vinculoMunicaoArma"><div><span>Calibre da munição</span><select data-municao-edicao="${item.id}" ${marcado?"":"disabled"}><option value="">Sem munição</option>${opcoes}</select></div><div><span>Quantidade a cautelar</span><input data-qtd-municao-edicao="${item.id}" type="number" min="1" max="${maximo}" value="${Math.min(Number(vinculo.quantidade||1),maximo)}" ${marcado&&vinculo.municaoId?"":"disabled"}></div></div>`:""}${["MUNICAO","OUTROS"].includes(item.categoria)?`<div class="quantidadeDisponivelCautela"><span>${item.categoria==="OUTROS"?"Quantidade do equipamento":"Quantidade"}</span><input data-quantidade="${item.id}" type="number" min="1" max="${item.saldoDisponivel}" value="${quantidade}" ${marcado?"":"disabled"}></div>`:""}</div>`;
        }).join("")}<p class="semResultadoCategoria oculto">Nenhum equipamento encontrado nesta categoria.</p></div></section>`).join("")||"<p>Nenhum equipamento encontrado.</p>";
        destino.querySelectorAll("[data-selecionar]").forEach(c=>c.onchange=()=>{const id=Number(c.dataset.selecionar),item=equipamentosEdicao.find(eq=>eq.id===id);if(c.checked){selecionadosEdicao.set(id,1);if(["ARMA_LONGA","ARMA_CURTA"].includes(item.categoria)){const m=municaoCompativelEdicao(item);if(m){municoesPorArmaEdicao.set(id,{municaoId:m.id,quantidade:1});ajustarMunicaoEdicao(m.id,1);}}}else{selecionadosEdicao.delete(id);const v=municoesPorArmaEdicao.get(id);if(v)ajustarMunicaoEdicao(v.municaoId,-v.quantidade);municoesPorArmaEdicao.delete(id);}desenharEquipamentosEdicao();});
        destino.querySelectorAll("[data-quantidade]").forEach(c=>c.onchange=()=>{const id=Number(c.dataset.quantidade),max=Number(c.max),v=Math.max(1,Number(c.value)||1);if(v>max)alert(`Quantidade indisponível. Máximo disponível: ${max}.`);selecionadosEdicao.set(id,Math.min(v,max));desenharEquipamentosEdicao();});
        destino.querySelectorAll("[data-municao-edicao]").forEach(c=>c.onchange=()=>{const armaId=Number(c.dataset.municaoEdicao),anterior=municoesPorArmaEdicao.get(armaId);if(anterior)ajustarMunicaoEdicao(anterior.municaoId,-anterior.quantidade);if(c.value){municoesPorArmaEdicao.set(armaId,{municaoId:Number(c.value),quantidade:1});ajustarMunicaoEdicao(Number(c.value),1);}else municoesPorArmaEdicao.delete(armaId);desenharEquipamentosEdicao();});
        destino.querySelectorAll("[data-qtd-municao-edicao]").forEach(c=>c.onchange=()=>{const armaId=Number(c.dataset.qtdMunicaoEdicao),v=municoesPorArmaEdicao.get(armaId);if(!v)return;const max=Number(c.max),nova=Math.max(1,Number(c.value)||1);if(nova>max)alert(`Quantidade indisponível. Máximo disponível: ${max}.`);const final=Math.min(nova,max);ajustarMunicaoEdicao(v.municaoId,final-v.quantidade);v.quantidade=final;desenharEquipamentosEdicao();});
        destino.querySelectorAll("[data-pesquisa-categoria-edicao]").forEach(c=>{const filtrar=()=>{let n=0,g=c.closest(".grupoEquipamentos");g.querySelectorAll(".itemEdicaoCautela").forEach(i=>{const ok=i.textContent.toLowerCase().includes(c.value.toLowerCase());i.classList.toggle("ocultoPorPesquisa",!ok);if(ok)n++;});g.querySelector(".semResultadoCategoria").classList.toggle("oculto",n>0);};c.oninput=()=>{filtrosCategoriaEdicao[c.dataset.pesquisaCategoriaEdicao]=c.value;filtrar();};filtrar();});
        destino.querySelectorAll(".grupoEquipamentos h3").forEach(h=>h.onclick=()=>{const categoria=h.closest(".grupoEquipamentos").dataset.categoriaEdicao;if(categoriasAbertasEdicao.has(categoria))categoriasAbertasEdicao.clear();else{categoriasAbertasEdicao.clear();categoriasAbertasEdicao.add(categoria);}desenharEquipamentosEdicao();});
        desenharSelecionadosEdicao();
    }

    function desenharSelecionadosEdicao(){
        const destino=el("listaSelecionadosEdicaoCautela"),itens=equipamentosEdicao.filter(item=>selecionadosEdicao.has(item.id));
        const total=itens.reduce((soma,item)=>soma+Number(selecionadosEdicao.get(item.id)||1),0);el("totalSelecionadosEdicaoCautela").textContent=`${total} ${total===1?"item":"itens"}`;
        destino.innerHTML=itens.map(item=>`<div class="equipamentoSelecionado"><div class="dadosSelecionadoCautela"><strong>${seguro(nomeCategoriaEdicao(item.categoria))} — ${seguro(nomeEquipamento(item))}</strong>${item.categoria==="MUNICAO"?"":`<span>Prefixo / nº de série: ${seguro([item.prefixo,item.numeroSerie].filter(Boolean).join(" / "))||"—"}</span>`}<span class="quantidadeSelecionadaDestaque">Quantidade: <b>${selecionadosEdicao.get(item.id)||1}</b></span></div><button type="button" data-remover-edicao="${item.id}">Remover</button></div>`).join("")||`<div class="estadoVazioSelecionados"><i class="fa-solid fa-box-open"></i><strong>Nenhum item selecionado</strong><span>Marque os equipamentos na seção acima.</span></div>`;
        destino.querySelectorAll("[data-remover-edicao]").forEach(b=>b.onclick=()=>{const id=Number(b.dataset.removerEdicao),v=municoesPorArmaEdicao.get(id);if(v)ajustarMunicaoEdicao(v.municaoId,-v.quantidade);municoesPorArmaEdicao.delete(id);if(equipamentosEdicao.find(i=>i.id===id)?.categoria==="MUNICAO")[...municoesPorArmaEdicao].forEach(([arma,x])=>{if(x.municaoId===id)municoesPorArmaEdicao.delete(arma);});selecionadosEdicao.delete(id);desenharEquipamentosEdicao();});
    }

    async function salvarEdicao(){
        if(!selecionadosEdicao.size){ alert("A cautela deve possuir pelo menos um equipamento."); return; }
        try{
            el("btnSalvarEdicaoCautela").disabled = true;
            const observacaoEdicao = el("observacaoEdicaoCautela").value.trim();
            const alteracoesVisuais = [];
            equipamentosEdicao.forEach(item => {
                const anterior = Number(selecionadosOriginaisEdicao.get(item.id) || 0);
                const atual = Number(selecionadosEdicao.get(item.id) || 0);
                if(atual > anterior) alteracoesVisuais.push(`${nomeEquipamento(item)}: ${atual - anterior} unidade(s) adicionada(s).`);
                if(atual < anterior) alteracoesVisuais.push(`${nomeEquipamento(item)}: ${anterior - atual} unidade(s) removida(s).`);
            });
            await window.api.cautela.editar({
                cautelaId:cautelaSelecionada.id,
                observacao:observacaoEdicao,
                dadosExternos:cautelaSelecionada.tipo === "EXTERNA" ? Object.fromEntries([...document.querySelectorAll("[data-externo]")].map(c=>[c.dataset.externo,c.value.trim()])) : null,
                itens:[...selecionadosEdicao].map(([equipamentoId,quantidade]) => ({equipamentoId,quantidade}))
            });
            fecharModal("modalEditarCautela");
            await carregarCautelasAbertas();
            window.dispatchEvent(new Event("dashboardAtualizar"));
            alert(alteracoesVisuais.length
                ? `Cautela atualizada:\n${alteracoesVisuais.join("\n")}`
                : observacaoEdicao
                    ? "Cautela atualizada e observação registrada."
                    : "Cautela atualizada sem alteração de itens.");
        }catch(erro){ alert(erro.message || "Não foi possível editar a cautela."); }
        finally{ el("btnSalvarEdicaoCautela").disabled = false; }
    }

    async function abrirRecebimento(id){
        cautelaSelecionada = await window.api.cautela.detalhes(id);
        el("subtituloReceberCautela").textContent = `${cautelaSelecionada.graduacao || ""} ${cautelaSelecionada.nome || ""}`;
        el("senhaReceberCautela").value = "";
        const externa = cautelaSelecionada.tipo === "EXTERNA";
        el("modalReceberCautela").querySelector(".corpoReceberCautela>p").textContent = externa
            ? "Digite a senha do armeiro logado para confirmar a devolução de todos os materiais."
            : "Digite a senha do policial. Administradores também podem utilizar sua senha universal.";
        el("modalReceberCautela").querySelector("label span").textContent = externa ? "Senha do armeiro" : "Senha de confirmação";
        el("observacaoReceberCautela").value = "";
        const pendentes=cautelaSelecionada.itens.filter(item=>!item.devolvido);
        el("listaRecebimentoCautela").innerHTML=pendentes.map(item=>{
            const armamento=["ARMA_LONGA","ARMA_CURTA"].includes(item.categoria);
            const identificadores=armamento
                ? [["Patrimônio",item.patrimonio || "—"],["Prefixo / série",[item.prefixo,item.numeroSerie].filter(Boolean).join(" / ") || "—"]]
                : item.categoria === "MUNICAO"
                    ? [["Cauteladas",item.quantidade]]
                    : [["Patrimônio",item.patrimonio],["Prefixo / série",[item.prefixo,item.numeroSerie].filter(Boolean).join(" / ")]].filter(([,valor])=>valor);
            const detalhes=identificadores.map(([rotulo,valor])=>`<b>${seguro(rotulo)}: ${seguro(valor)}</b>`).join(" · ");
            return `<div class="itemRecebimentoCautela categoriaRecebimento-${item.categoria}"><div class="dadosItemRecebimento"><strong>${seguro(nomeEquipamento(item))}</strong><span>${detalhes || seguro(String(item.categoria || "").replaceAll("_"," "))}</span></div>${item.categoria === "MUNICAO" ? `<label><span>Quantidade entregue</span><input data-quantidade-recebida="${item.id}" type="number" min="0" max="${item.quantidade}" value="${item.quantidade}"></label>` : ""}</div>`;
        }).join("")||"<p>Nenhum equipamento pendente.</p>";
        abrirModal("modalReceberCautela");
        el("senhaReceberCautela").focus();
    }

    async function confirmarRecebimento(){
        const senhaPolicial = el("senhaReceberCautela").value;
        const observacao = el("observacaoReceberCautela").value.trim();
        if(!senhaPolicial){ alert("Informe a senha de confirmação."); return; }
        try{
            el("btnConfirmarRecebimentoCautela").disabled = true;
            const resultado = await window.api.cautela.receber({
                cautelaId:cautelaSelecionada.id,
                senhaPolicial:cautelaSelecionada.tipo === "EXTERNA" ? null : senhaPolicial,
                senhaArmeiro:cautelaSelecionada.tipo === "EXTERNA" ? senhaPolicial : null,
                itens:[...document.querySelectorAll("[data-quantidade-recebida]")].map(campo=>({itemId:Number(campo.dataset.quantidadeRecebida),quantidade:Number(campo.value)})),
                observacao
            });
            fecharModal("modalReceberCautela");
            window.dispatchEvent(new Event("dashboardAtualizar"));
            alert(resultado?.quantidadeNaoDevolvida
                ? `Cautela encerrada. ${resultado.quantidadeNaoDevolvida} unidade(s) de munição não devolvida(s) foram registradas e descontadas do estoque.`
                : "Cautela recebida e encerrada com sucesso.");
            if(retornarParaNovaCautela) await abrirTela("cautelaNova");
            else await carregarCautelasAbertas();
        }catch(erro){ alert(erro.message || "Não foi possível receber a cautela."); }
        finally{ if(el("btnConfirmarRecebimentoCautela")) el("btnConfirmarRecebimentoCautela").disabled = false; }
    }

    function abrirModal(id){ el(id).classList.remove("oculto"); }
    function fecharModal(id){ el(id).classList.add("oculto"); }

    configurarEventos();
    carregarCautelasAbertas().catch(erro => alert(erro.message));
})();
