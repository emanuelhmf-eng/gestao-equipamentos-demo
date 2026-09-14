(() => {
    let equipamentos = [];
    let selecionados = [];
    let policial = null;
    let policiais = [];
    const municoesPorArma = new Map();
    const quantidadesManuaisMunicao = new Map();
    const filtrosCategoria = {};
    const categoriasAbertas = new Set();

    const porId = id => document.getElementById(id);
    const seguro = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    const nomeEquipamento = eq => eq.categoria === "MUNICAO" ? eq.calibre : eq.modelo;
    const nomeCategoria = categoria => categoria === "MUNICAO"
        ? "MUNIÇÃO"
        : String(categoria || "OUTROS").replaceAll("_"," ");
    const normalizarCalibre = valor => String(valor || "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
        .toLowerCase().replace(/[^a-z0-9]/g,"");
    const chaveNumericaCalibre = valor => {
        const texto=String(valor || "").toLowerCase().replace(",", ".");
        const numero=texto.match(/(?:\d+\.\d+|\.\d+|\d+)/)?.[0];
        return numero ? numero.replace(".", "") : "";
    };
    const buscarMunicaoCompativel = armamento => {
        const calibreArma=normalizarCalibre(armamento?.calibre);
        if(!calibreArma) return null;
        const chaveArma=chaveNumericaCalibre(armamento.calibre);
        const municoes=equipamentos.filter(item=>item.categoria==="MUNICAO"&&Number(item.saldoDisponivel)>0);
        return municoes.find(item=>normalizarCalibre(item.calibre)===calibreArma)
            || municoes.find(item=>chaveArma&&chaveNumericaCalibre(item.calibre)===chaveArma)
            || null;
    };
    const tipoCautela = document.querySelector(".paginaNovaCautela")?.dataset.tipoCautela === "PERMANENTE"
        ? "PERMANENTE"
        : "TEMPORARIA";

    async function iniciar(){
        porId("btnBuscarPolicial").addEventListener("click", buscarPolicial);
        porId("btnFinalizarCautela").addEventListener("click", abrirConfirmacao);
        porId("btnReceberCautelaNova")?.addEventListener("click", abrirRecebimentoDoPolicial);
        porId("cautelaEmergencial")?.addEventListener("change", alternarRegistroEmergencial);
        porId("confirmarEmissaoCautela").addEventListener("click", finalizarCautela);
        porId("fecharConfirmacaoCautela").addEventListener("click", fecharConfirmacao);
        porId("cancelarConfirmacaoCautela").addEventListener("click", fecharConfirmacao);
        porId("modalConfirmarCautela").addEventListener("click", evento => {
            if(evento.target === porId("modalConfirmarCautela")) fecharConfirmacao();
        });
        porId("senhaConfirmacaoCautela").addEventListener("keydown", evento => {
            if(evento.key === "Enter") finalizarCautela();
        });
        ["buscarMatriculaPolicial","buscarNomePolicial"].forEach(id => porId(id).addEventListener("keydown", evento => {
            if(evento.key === "Enter") buscarPolicial();
        }));
        porId("buscarMatriculaPolicial").addEventListener("input", selecionarSugestaoPorMatricula);
        porId("buscarNomePolicial").addEventListener("input", selecionarSugestaoPorNome);
        porId("pesquisaEquipamento").addEventListener("input", mostrarEquipamentos);
        mostrarSelecionados();
        await Promise.all([carregarEquipamentos(), carregarPoliciais()]);
    }

    function valorDataHoraLocal(data=new Date()){
        const deslocamento=data.getTimezoneOffset()*60000;
        return new Date(data.getTime()-deslocamento).toISOString().slice(0,16);
    }

    function alternarRegistroEmergencial(){
        const ativo=porId("cautelaEmergencial")?.checked;
        const campo=porId("campoDataEmergencialCautela");
        const entrada=porId("dataHoraEmergencialCautela");
        const recebimento=porId("dataHoraRecebimentoEmergencial");
        campo?.classList.toggle("oculto",!ativo);
        if(entrada){
            entrada.max=valorDataHoraLocal();
            if(ativo&&!entrada.value) entrada.value=valorDataHoraLocal();
            if(!ativo) entrada.value="";
        }
        if(recebimento){
            recebimento.max=valorDataHoraLocal();
            if(!ativo) recebimento.value="";
        }
    }

    async function carregarEquipamentos(){
        equipamentos = await window.api.equipamento.listarDisponiveis();
        mostrarEquipamentos();
    }

    async function carregarPoliciais(){
        const lista = await window.api.usuario.listar();
        policiais = lista.filter(usuario => usuario.ativo);

        const porMatricula = [...policiais].sort((a,b) => String(a.matricula || "").localeCompare(
            String(b.matricula || ""), "pt-BR", {numeric:true, sensitivity:"base"}
        ));
        const porNome = [...policiais].sort((a,b) => String(a.nome || "").localeCompare(
            String(b.nome || ""), "pt-BR", {sensitivity:"base"}
        ));

        porId("sugestoesMatriculaPolicial").innerHTML = porMatricula.map(usuario =>
            `<option value="${seguro(usuario.matricula)}">${seguro(usuario.nome)}</option>`
        ).join("");
        porId("sugestoesNomePolicial").innerHTML = porNome.map(usuario =>
            `<option value="${seguro(usuario.nome)}">${seguro(usuario.matricula)}${usuario.nomeGuerra ? ` · ${seguro(usuario.nomeGuerra)}` : ""}</option>`
        ).join("");
    }

    function exibirPolicial(usuario){
        policial = usuario;
        porId("buscarMatriculaPolicial").value = usuario.matricula || "";
        porId("buscarNomePolicial").value = usuario.nome || "";
        porId("nomePolicial").value = usuario.nome || "";
        porId("graduacaoPolicial").value = usuario.graduacao || "";
        porId("pelotaoPolicial").value = usuario.pelotao || "";
        porId("funcaoPolicial").value = usuario.funcao || "";
    }

    function selecionarSugestaoPorMatricula(){
        const termo = porId("buscarMatriculaPolicial").value.trim();
        const encontrado = policiais.find(usuario => String(usuario.matricula || "") === termo);
        if(encontrado) exibirPolicial(encontrado);
    }

    function selecionarSugestaoPorNome(){
        const termo = porId("buscarNomePolicial").value.trim().toLocaleLowerCase("pt-BR");
        const encontrado = policiais.find(usuario => String(usuario.nome || "").toLocaleLowerCase("pt-BR") === termo);
        if(encontrado) exibirPolicial(encontrado);
    }

    async function abrirRecebimentoDoPolicial(){
        sessionStorage.setItem("recebimentoOriginadoNovaCautela","1");
        if(policial?.id) sessionStorage.setItem("receberCautelaUsuarioId",String(policial.id));
        else sessionStorage.removeItem("receberCautelaUsuarioId");
        await abrirTela("cautelasAbertas");
    }

    function mostrarEquipamentos(){

    const termo =
        porId("pesquisaEquipamento")
            .value
            .toLowerCase()
            .trim();

    const lista =
        equipamentos.filter(eq => {

            const dadosPesquisa = [

                eq.categoria,
                nomeEquipamento(eq),
                eq.fabricante,
                eq.patrimonio,
                eq.prefixo,
                eq.numeroSerie

            ];

            return dadosPesquisa.some(valor =>

                String(valor ?? "")
                    .toLowerCase()
                    .includes(termo)

            );

        });

    const destino =
        porId("listaEquipamentos");

    const grupos =
        lista.reduce(
            (resultado, equipamento) => {

                const categoria =
                    equipamento.categoria ||
                    "OUTROS";

                (
                    resultado[categoria] ||=
                    []
                ).push(equipamento);

                return resultado;

            },
            {}
        );

    destino.innerHTML =
        Object.entries(grupos)
            .filter(([categoria]) => !categoriasAbertas.size || categoriasAbertas.has(categoria))
            .map(([categoria, itens]) => {

                const tituloCategoria =
                    seguro(
                        nomeCategoria(categoria)
                    );

                const equipamentosCategoria =
                    itens.map(eq => {

                        const selecionado = eq.categoria === "MUNICAO"
                            ? quantidadesManuaisMunicao.has(Number(eq.id))
                            : selecionados.some(
                                item =>
                                    Number(item.id) ===
                                    Number(eq.id)
                            );

                        const patrimonio =
                            seguro(eq.patrimonio) ||
                            "Não informado";

                        const prefixoNumeroSerie =
                            seguro([eq.prefixo,eq.numeroSerie].filter(Boolean).join(" / ")) ||
                            "Não informado";

                        const disponibilidade =
                            ["MUNICAO","OUTROS"].includes(eq.categoria)

                                ? `
                                    <span>
                                        <strong>Disponível:</strong>
                                        ${
                                            Number(
                                                eq.saldoDisponivel ||
                                                0
                                            )
                                        } unidade(s)
                                    </span>
                                `

                                : "";

                        const aceitaMunicao = ["ARMA_LONGA","ARMA_CURTA"].includes(eq.categoria);
                        const municaoVinculada = municoesPorArma.get(Number(eq.id)) || {};
                        const municaoSelecionada = equipamentos.find(item => Number(item.id) === Number(municaoVinculada.municaoId));
                        const saldoMunicaoSelecionada = Number(municaoSelecionada?.saldoDisponivel || 1);
                        const opcoesMunicao = equipamentos.filter(item => item.categoria === "MUNICAO")
                            .map(item => `<option value="${item.id}" ${Number(municaoVinculada.municaoId) === Number(item.id) ? "selected" : ""}>${seguro(item.calibre || item.modelo)}</option>`).join("");
                        const controleMunicaoArma = aceitaMunicao ? `<div class="vinculoMunicaoArma ${selecionado ? "" : "vinculoMunicaoDesabilitado"}">
                            <div><span>Calibre da munição</span><select data-municao-arma="${eq.id}" ${selecionado ? "" : "disabled"}><option value="">Sem munição</option>${opcoesMunicao}</select></div>
                            <div><span>Quantidade a cautelar</span><input data-qtd-municao-arma="${eq.id}" type="number" min="1" max="${saldoMunicaoSelecionada}" value="${Math.min(Number(municaoVinculada.quantidade || 1),saldoMunicaoSelecionada)}" ${selecionado && municaoVinculada.municaoId ? "" : "disabled"}></div>
                        </div>` : "";
                        const controleQuantidade = ["MUNICAO","OUTROS"].includes(eq.categoria) && selecionado
                            ? `<div class="quantidadeDisponivelCautela"><span>${eq.categoria === "OUTROS" ? "Quantidade do equipamento" : "Quantidade"}</span><input data-quantidade-disponivel="${eq.id}" type="number" min="1" max="${Number(eq.saldoDisponivel || 1)}" value="${eq.categoria === "MUNICAO" ? Number(quantidadesManuaisMunicao.get(Number(eq.id)) || 1) : Number(selecionados.find(item => item.id === eq.id)?.quantidade || 1)}"></div>` : "";

                        return `
                            <div class="itemEquipamentoCautela categoria-${eq.categoria}">

                                <input
                                    type="checkbox"
                                    data-equipamento="${eq.id}"
                                    ${selecionado ? "checked" : ""}
                                >

                                <div class="dadosEquipamentoCautela">

                                    <strong>
                                        ${seguro(
                                            nomeEquipamento(eq)
                                        ) || "Sem identificação"}
                                    </strong>

                                    <div class="identificadoresEquipamentoCautela">

                                        <span>
                                            <b>Patrimônio:</b>
                                            ${patrimonio}
                                        </span>

                                        <span>
                                            <b>Prefixo / nº de série:</b>
                                            ${prefixoNumeroSerie}
                                        </span>

                                        ${disponibilidade}

                                    </div>

                                </div>

                                ${controleMunicaoArma}
                                ${controleQuantidade}

                            </div>
                        `;

                    }).join("");

                return `
                    <section class="grupoEquipamentos ${categoriasAbertas.has(categoria) ? "aberto" : ""}" data-categoria="${seguro(categoria)}">

                        <h3>
                            ${tituloCategoria}
                        </h3>

                        <div class="pesquisaCategoriaEquipamento campoComIcone">
                            <i class="fa-solid fa-magnifying-glass"></i>
                            <input
                                type="search"
                                data-pesquisa-categoria="${seguro(categoria)}"
                                value="${seguro(filtrosCategoria[categoria] || "")}"
                                placeholder="Pesquisar nesta categoria"
                                aria-label="Pesquisar equipamentos em ${tituloCategoria}"
                            >
                        </div>

                        <div class="itensCategoriaEquipamento">
                            ${equipamentosCategoria}
                            <p class="semResultadoCategoria oculto">Nenhum equipamento encontrado nesta categoria.</p>
                        </div>

                    </section>
                `;

            })
            .join("") ||
        `
            <p>
                Nenhum equipamento disponível.
            </p>
        `;

    destino
        .querySelectorAll(
            "input[data-equipamento]"
        )
        .forEach(input => {

            input.addEventListener(
                "change",
                () => {

                    alternarEquipamento(
                        Number(
                            input.dataset.equipamento
                        ),
                        input.checked
                    );

                }
            );

        });

    destino.querySelectorAll("[data-municao-arma]").forEach(campo => {
        campo.onclick = evento => evento.stopPropagation();
        campo.onchange = () => {
            const armaId = Number(campo.dataset.municaoArma);
            const municaoId = Number(campo.value);
            if(municaoId) municoesPorArma.set(armaId,{municaoId,quantidade:Number(municoesPorArma.get(armaId)?.quantidade || 1)});
            else municoesPorArma.delete(armaId);
            recalcularMunicoesSelecionadas();
            mostrarEquipamentos();
        };
    });
    destino.querySelectorAll("[data-qtd-municao-arma]").forEach(campo => {
        campo.onclick = evento => evento.stopPropagation();
        campo.oninput = () => {
            const armaId=Number(campo.dataset.qtdMunicaoArma),vinculo=municoesPorArma.get(armaId);
            if(vinculo){
                const maximo=Number(campo.max || 1),informada=Number(campo.value)||1;
                if(informada > maximo){
                    const municao=equipamentos.find(item=>Number(item.id)===Number(vinculo.municaoId));
                    alert(`Quantidade indisponível para ${municao?.calibre || "a munição selecionada"}. Máximo disponível: ${maximo} unidade(s).`);
                    campo.value=maximo;
                }
                vinculo.quantidade=Math.min(maximo,Math.max(1,informada));
                recalcularMunicoesSelecionadas();
            }
        };
    });
    destino.querySelectorAll("[data-quantidade-disponivel]").forEach(campo => {
        campo.onclick = evento => evento.stopPropagation();
        campo.oninput = () => {
            const id=Number(campo.dataset.quantidadeDisponivel),eq=equipamentos.find(item=>item.id===id);
            const maximo=Number(campo.max),informada=Number(campo.value)||1;
            if(informada > maximo){
                alert(`Quantidade indisponível para ${nomeEquipamento(eq) || "o equipamento selecionado"}. Máximo disponível: ${maximo} unidade(s).`);
                campo.value=maximo;
            }
            const quantidade=Math.min(maximo,Math.max(1,informada));
            if(eq?.categoria === "MUNICAO"){quantidadesManuaisMunicao.set(id,quantidade);recalcularMunicoesSelecionadas();}
            else{const item=selecionados.find(item=>item.id===id);if(item)item.quantidade=quantidade;mostrarSelecionados();}
        };
    });

    destino
        .querySelectorAll(
            "input[data-pesquisa-categoria]"
        )
        .forEach(campo => {

            campo.addEventListener(
                "input",
                () => {
                    const categoria = campo.dataset.pesquisaCategoria;
                    filtrosCategoria[categoria] = campo.value;
                    filtrarCategoria(campo.closest(".grupoEquipamentos"), campo.value);
                }
            );

            filtrarCategoria(campo.closest(".grupoEquipamentos"), campo.value);

        });

    destino
        .querySelectorAll(
            ".grupoEquipamentos h3"
        )
        .forEach(titulo => {

            titulo.addEventListener(
                "click",
                () => {
                    const grupo = titulo.parentElement;
                    const categoria = grupo.dataset.categoria;
                    if(categoriasAbertas.has(categoria)) categoriasAbertas.clear();
                    else{
                        categoriasAbertas.clear();
                        categoriasAbertas.add(categoria);
                    }
                    mostrarEquipamentos();

                }
            );

        });

}
    function filtrarCategoria(grupo, termoInformado){
        const termo = String(termoInformado || "").toLowerCase().trim();
        let visiveis = 0;

        grupo.querySelectorAll(".itemEquipamentoCautela").forEach(item => {
            const id = Number(item.querySelector("input[data-equipamento]").dataset.equipamento);
            const equipamento = equipamentos.find(eq => Number(eq.id) === id);
            const dadosPesquisa = [
                nomeEquipamento(equipamento),
                equipamento?.fabricante,
                equipamento?.patrimonio,
                equipamento?.prefixo,
                equipamento?.numeroSerie
            ];
            const corresponde = dadosPesquisa.some(valor =>
                String(valor ?? "").toLowerCase().includes(termo)
            );

            item.classList.toggle("ocultoPorPesquisa", !corresponde);
            if(corresponde) visiveis++;
        });

        grupo.querySelector(".semResultadoCategoria").classList.toggle("oculto", visiveis > 0);
    }

    function alternarEquipamento(id, marcado){
        const equipamento = equipamentos.find(eq => eq.id === id);
        if(!equipamento) return;
        if(equipamento.categoria === "MUNICAO"){
            if(marcado) quantidadesManuaisMunicao.set(id,1);
            else{
                quantidadesManuaisMunicao.delete(id);
                [...municoesPorArma].forEach(([armaId,vinculo])=>{if(Number(vinculo.municaoId)===id)municoesPorArma.delete(armaId);});
            }
            recalcularMunicoesSelecionadas();
            mostrarEquipamentos();
            return;
        }
        selecionados = marcado ? [...selecionados.filter(eq => eq.id !== id), {...equipamento, quantidade: 1}] : selecionados.filter(eq => eq.id !== id);
        if(marcado && ["ARMA_LONGA","ARMA_CURTA"].includes(equipamento.categoria) && !municoesPorArma.has(id)){
            const municaoCompativel=buscarMunicaoCompativel(equipamento);
            if(municaoCompativel){
                municoesPorArma.set(id,{municaoId:Number(municaoCompativel.id),quantidade:1});
                recalcularMunicoesSelecionadas();
            }
        }
        if(!marcado && ["ARMA_LONGA","ARMA_CURTA"].includes(equipamento.categoria)){
            municoesPorArma.delete(id);
            recalcularMunicoesSelecionadas();
        }
        mostrarSelecionados();
        mostrarEquipamentos();
    }

    function recalcularMunicoesSelecionadas(){
        const totais=new Map(quantidadesManuaisMunicao);
        municoesPorArma.forEach(({municaoId,quantidade})=>totais.set(Number(municaoId),Number(totais.get(Number(municaoId))||0)+Number(quantidade||1)));
        selecionados=selecionados.filter(item=>item.categoria!=="MUNICAO");
        totais.forEach((quantidade,id)=>{const eq=equipamentos.find(item=>item.id===id);if(eq)selecionados.push({...eq,quantidade:Math.min(quantidade,Number(eq.saldoDisponivel||quantidade))});});
        mostrarSelecionados();
    }

    function atualizarTotal(){
        const total = selecionados.reduce((soma, item) => soma + Number(item.quantidade || 1), 0);
        porId("totalSelecionadosCautela").textContent = `${total} ${total === 1 ? "item" : "itens"}`;
    }

    function mostrarSelecionados(){
        const destino = porId("listaSelecionados");
        atualizarTotal();
        destino.innerHTML = selecionados
            .map(eq => {

                const patrimonio =
                    seguro(eq.patrimonio) ||
                    "Não informado";

                const prefixoNumeroSerie =
                    seguro([eq.prefixo,eq.numeroSerie].filter(Boolean).join(" / ")) ||
                    "Não informado";

                return `
                    <div class="equipamentoSelecionado">

                        <div class="dadosSelecionadoCautela">

                            <strong>
                                ${seguro(nomeCategoria(eq.categoria))}
                                —
                                ${seguro(nomeEquipamento(eq))}
                            </strong>

                            <span>
                                Patrimônio: ${patrimonio}
                            </span>

                            ${eq.categoria === "MUNICAO" ? "" : `<span>Prefixo / nº de série: ${prefixoNumeroSerie}</span>`}

                            ${["MUNICAO","OUTROS"].includes(eq.categoria) ? `<span class="quantidadeSelecionadaDestaque">Quantidade: <b>${Number(eq.quantidade || 1)}</b> unidade(s)</span>` : ""}

                        </div>

                        <button
                            type="button"
                            data-remover="${eq.id}"
                        >
                            Remover
                        </button>

                    </div>
                `;

            })
            .join("") ||
        `
            <div class="estadoVazioSelecionados">

                <i class="fa-solid fa-box-open"></i>

                <strong>
                    Nenhum item selecionado
                </strong>

                <span>
                    Marque os equipamentos na seção acima.
                </span>

            </div>
        `;
        destino.querySelectorAll("button[data-remover]").forEach(botao => botao.addEventListener("click", () => alternarEquipamento(Number(botao.dataset.remover), false)));
    }

    async function buscarPolicial(){
        const matricula = porId("buscarMatriculaPolicial").value.trim();
        const nome = porId("buscarNomePolicial").value.trim();
        const termo = matricula || nome;
        if(!termo){ alert("Informe a matrícula ou o nome do policial."); return; }
        try {
            const lista = await window.api.usuario.pesquisar(termo);
            const encontrado = lista.find(usuario => usuario.ativo && (
                String(usuario.matricula || "") === matricula
                || String(usuario.nome || "").toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR")
            )) || lista.find(usuario => usuario.ativo);
            if(!encontrado){ alert("Nenhum policial ativo foi encontrado."); return; }
            exibirPolicial(encontrado);
        } catch(erro) { console.error(erro); alert("Não foi possível buscar o policial."); }
    }

    function abrirConfirmacao(){
        if(!policial){ alert("Busque e selecione um policial."); return; }
        if(!selecionados.length){ alert("Selecione pelo menos um equipamento."); return; }
        if(porId("cautelaEmergencial")?.checked){
            const valor=porId("dataHoraEmergencialCautela")?.value;
            const instante=valor ? new Date(valor) : null;
            if(!instante || Number.isNaN(instante.getTime())){ alert("Informe a data e a hora reais da cautela emergencial."); return; }
            if(instante.getTime()>Date.now()){ alert("A data da cautela emergencial não pode estar no futuro."); return; }
            const valorRecebimento=porId("dataHoraRecebimentoEmergencial")?.value;
            if(valorRecebimento){
                const recebimento=new Date(valorRecebimento);
                if(Number.isNaN(recebimento.getTime())){ alert("Informe uma data e hora válidas para o recebimento."); return; }
                if(recebimento.getTime()<instante.getTime()){ alert("O recebimento não pode ocorrer antes da entrega."); return; }
                if(recebimento.getTime()>Date.now()){ alert("A data do recebimento não pode estar no futuro."); return; }
            }
        }
        porId("policialConfirmacaoCautela").textContent = `${policial.graduacao || ""} ${policial.nomeGuerra || policial.nome || ""}`.trim();
        mostrarResumoEmissao();
        porId("senhaConfirmacaoCautela").value = "";
        porId("erroConfirmacaoCautela").textContent = "";
        porId("modalConfirmarCautela").classList.remove("oculto");
        setTimeout(() => porId("senhaConfirmacaoCautela").focus(), 0);
    }

    function mostrarResumoEmissao(){
        const total = selecionados.reduce((soma,item) => soma + Number(item.quantidade || 1),0);
        porId("totalResumoEmissaoCautela").textContent = `${total} ${total === 1 ? "item" : "itens"}`;
        porId("listaResumoEmissaoCautela").innerHTML = selecionados.map(item => {
            const quantidade = Number(item.quantidade || 1);
            const identificadores = item.categoria === "MUNICAO"
                ? [item.fabricante, item.patrimonio && `Lote/patrimônio: ${item.patrimonio}`]
                : [item.patrimonio && `Patrimônio: ${item.patrimonio}`, [item.prefixo,item.numeroSerie].filter(Boolean).length && `Prefixo / série: ${[item.prefixo,item.numeroSerie].filter(Boolean).join(" / ")}`];
            return `<article class="itemResumoEmissaoCautela">
                <div><strong>${seguro(nomeCategoria(item.categoria))} — ${seguro(nomeEquipamento(item)) || "Sem identificação"}</strong>
                <span>${identificadores.filter(Boolean).map(seguro).join(" · ") || "Sem identificação complementar"}</span></div>
                <b>${quantidade} ${quantidade === 1 ? "unidade" : "unidades"}</b>
            </article>`;
        }).join("");
    }

    function fecharConfirmacao(){
        porId("modalConfirmarCautela").classList.add("oculto");
        porId("senhaConfirmacaoCautela").value = "";
        porId("erroConfirmacaoCautela").textContent = "";
    }

    async function finalizarCautela(){
        const senhaPolicial = porId("senhaConfirmacaoCautela").value;
        const erroConfirmacao = porId("erroConfirmacaoCautela");
        const botaoConfirmar = porId("confirmarEmissaoCautela");
        if(botaoConfirmar.disabled) return;
        if(!senhaPolicial){
            erroConfirmacao.textContent = "Informe a senha do policial.";
            porId("senhaConfirmacaoCautela").focus();
            return;
        }
        botaoConfirmar.disabled = true;
        erroConfirmacao.textContent = "";
        try {
            const sessao = await window.api.usuario.sessao();
            const emergencial=Boolean(porId("cautelaEmergencial")?.checked);
            const dataEmergencial=porId("dataHoraEmergencialCautela")?.value;
            const dataRecebimentoEmergencial=porId("dataHoraRecebimentoEmergencial")?.value;
            await window.api.cautela.nova({
                usuarioId:policial.id,
                armeiroId:sessao.usuarioId,
                dataRetirada:emergencial ? new Date(dataEmergencial).toISOString() : new Date().toISOString(),
                emergencial,
                dataRecebimentoEmergencial:emergencial&&dataRecebimentoEmergencial
                    ? new Date(dataRecebimentoEmergencial).toISOString() : null,
                dataPrevista:null,
                observacao:porId("observacaoCautela").value.trim(),
                tipo:tipoCautela,
                senhaPolicial,
                itens:selecionados
            });
            fecharConfirmacao();
            alert(dataRecebimentoEmergencial
                ? "Cautela emergencial e respectivo recebimento registrados com sucesso."
                : tipoCautela === "PERMANENTE"
                    ? "Cautela permanente realizada com sucesso."
                    : "Cautela realizada com sucesso.");
            window.dispatchEvent(new Event("dashboardAtualizar"));
            window.location.hash = "";
            selecionados = [];
            municoesPorArma.clear();
            quantidadesManuaisMunicao.clear();
            porId("observacaoCautela").value = "";
            if(porId("cautelaEmergencial")) porId("cautelaEmergencial").checked=false;
            alternarRegistroEmergencial();
            mostrarSelecionados();
            await carregarEquipamentos();
        } catch(erro) {
            console.error(erro);
            erroConfirmacao.textContent = erro.message || "Não foi possível emitir a cautela.";
            porId("senhaConfirmacaoCautela").select();
        } finally {
            botaoConfirmar.disabled = false;
        }
    }

    iniciar().catch(erro => { console.error(erro); alert("Não foi possível iniciar a tela de cautela."); });
})();
