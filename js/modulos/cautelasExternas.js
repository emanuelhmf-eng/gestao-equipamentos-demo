(() => {
    let equipamentos=[];
    const selecionados=new Map(), filtros={}, municoesPorArma=new Map();
    let categoriaAberta=null;
    const el=id=>document.getElementById(id);
    const seguro=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    const nome=e=>e.categoria==="MUNICAO"?e.calibre:e.modelo;
    const nomeCategoria=c=>c==="MUNICAO"?"MUNIÇÃO":String(c||"OUTROS").replaceAll("_"," ");
    const normalizar=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
    const chaveCalibre=v=>String(v||"").replace(",",".").match(/(?:\d+\.\d+|\.\d+|\d+)/)?.[0]?.replace(".","")||"";

    function municaoCompativel(arma){
        const exata=normalizar(arma.calibre), chave=chaveCalibre(arma.calibre);
        const lista=equipamentos.filter(e=>e.categoria==="MUNICAO"&&Number(e.saldoDisponivel)>0);
        return lista.find(e=>normalizar(e.calibre)===exata)||lista.find(e=>chave&&chaveCalibre(e.calibre)===chave)||null;
    }
    function totaisSelecionados(){
        const totais=new Map(selecionados);
        municoesPorArma.forEach(v=>totais.set(v.municaoId,Number(totais.get(v.municaoId)||0)+Number(v.quantidade||1)));
        return totais;
    }
    async function carregar(){equipamentos=await window.api.equipamento.listarDisponiveis();desenhar();}
    function desenhar(){
        const termo=el("pesquisaEquipamentoExterno").value.toLowerCase().trim();
        const grupos=equipamentos.filter(e=>[e.categoria,nome(e),e.patrimonio,e.prefixo,e.numeroSerie].some(v=>String(v||"").toLowerCase().includes(termo)))
            .reduce((a,e)=>{(a[e.categoria||"OUTROS"]||=[]).push(e);return a;},{});
        const entradas=Object.entries(grupos).filter(([categoria])=>!categoriaAberta||categoria===categoriaAberta);
        el("listaEquipamentosExternos").innerHTML=entradas.map(([categoria,itens])=>{
            const aberto=categoriaAberta===categoria;
            return `<section class="grupoEquipamentos ${aberto?"aberto":""}" data-cat="${seguro(categoria)}">
                <h3>${seguro(nomeCategoria(categoria))}</h3>
                <div class="pesquisaCategoriaEquipamento campoComIcone"><i class="fa-solid fa-magnifying-glass"></i><input data-filtro="${seguro(categoria)}" value="${seguro(filtros[categoria]||"")}" placeholder="Pesquisar nesta categoria"></div>
                <div class="itensCategoriaEquipamento">${itens.map(itemEquipamento).join("")}<p class="semResultadoCategoria oculto">Nenhum equipamento encontrado.</p></div>
            </section>`;
        }).join("")||"<p>Nenhum equipamento disponível.</p>";
        vincularEventos();mostrarSelecionados();
    }
    function itemEquipamento(e){
        const marcado=selecionados.has(e.id), arma=["ARMA_LONGA","ARMA_CURTA"].includes(e.categoria);
        const vinculo=municoesPorArma.get(e.id)||{};
        const opcoes=equipamentos.filter(m=>m.categoria==="MUNICAO"&&Number(m.saldoDisponivel)>0)
            .map(m=>`<option value="${m.id}" ${Number(vinculo.municaoId)===Number(m.id)?"selected":""}>${seguro(m.calibre)}</option>`).join("");
        return `<div class="itemEquipamentoCautela categoria-${seguro(e.categoria)}"><input type="checkbox" data-item="${e.id}" ${marcado?"checked":""}>
            <div class="dadosEquipamentoCautela"><strong>${seguro(nome(e))||"Sem identificação"}</strong><div class="identificadoresEquipamentoCautela"><span><b>Patrimônio:</b> ${seguro(e.patrimonio)||"Não informado"}</span>${e.categoria==="MUNICAO"?"":`<span><b>Prefixo / nº de série:</b> ${seguro([e.prefixo,e.numeroSerie].filter(Boolean).join(" / "))||"Não informado"}</span>`}${["MUNICAO","OUTROS"].includes(e.categoria)?`<span><strong>Disponível:</strong> ${Number(e.saldoDisponivel||0)} unidade(s)</span>`:""}</div></div>
            ${arma?`<div class="vinculoMunicaoArma ${marcado?"":"vinculoMunicaoDesabilitado"}"><div><span>Calibre da munição</span><select data-municao-arma="${e.id}" ${marcado?"":"disabled"}><option value="">Sem munição</option>${opcoes}</select></div><div><span>Quantidade a cautelar</span><input data-qtd-arma="${e.id}" type="number" min="1" value="${vinculo.quantidade||1}" ${marcado&&vinculo.municaoId?"":"disabled"}></div></div>`:""}
            ${["MUNICAO","OUTROS"].includes(e.categoria)&&marcado?`<div class="quantidadeDisponivelCautela"><span>${e.categoria==="OUTROS"?"Quantidade do equipamento":"Quantidade"}</span><input data-qtd="${e.id}" type="number" min="1" max="${e.saldoDisponivel}" value="${selecionados.get(e.id)||1}"></div>`:""}</div>`;
    }
    function vincularEventos(){
        document.querySelectorAll("[data-cat] h3").forEach(h=>h.onclick=()=>{const c=h.parentElement.dataset.cat;categoriaAberta=categoriaAberta===c?null:c;desenhar();});
        document.querySelectorAll("[data-item]").forEach(c=>c.onchange=()=>{const id=Number(c.dataset.item),e=equipamentos.find(x=>x.id===id);if(c.checked){selecionados.set(id,1);if(["ARMA_LONGA","ARMA_CURTA"].includes(e.categoria)){const m=municaoCompativel(e);if(m)municoesPorArma.set(id,{municaoId:m.id,quantidade:1});}}else{selecionados.delete(id);municoesPorArma.delete(id);}desenhar();});
        document.querySelectorAll("[data-qtd]").forEach(c=>c.onchange=()=>{const max=Number(c.max),q=Number(c.value)||1;if(q>max)alert(`Quantidade indisponível. Máximo disponível: ${max}.`);selecionados.set(Number(c.dataset.qtd),Math.min(max,Math.max(1,q)));desenhar();});
        document.querySelectorAll("[data-municao-arma]").forEach(c=>c.onchange=()=>{const id=Number(c.dataset.municaoArma);c.value?municoesPorArma.set(id,{municaoId:Number(c.value),quantidade:municoesPorArma.get(id)?.quantidade||1}):municoesPorArma.delete(id);desenhar();});
        document.querySelectorAll("[data-qtd-arma]").forEach(c=>c.onchange=()=>{const id=Number(c.dataset.qtdArma),v=municoesPorArma.get(id);if(!v)return;const municao=equipamentos.find(e=>e.id===v.municaoId),max=Number(municao?.saldoDisponivel||0),q=Number(c.value)||1;if(q>max)alert(`Quantidade indisponível. Máximo disponível: ${max}.`);v.quantidade=Math.min(max,Math.max(1,q));desenhar();});
        document.querySelectorAll("[data-filtro]").forEach(c=>{const filtrar=()=>{let n=0,g=c.closest(".grupoEquipamentos");g.querySelectorAll(".itemEquipamentoCautela").forEach(i=>{const ok=i.textContent.toLowerCase().includes(c.value.toLowerCase());i.classList.toggle("ocultoPorPesquisa",!ok);if(ok)n++;});g.querySelector(".semResultadoCategoria").classList.toggle("oculto",n>0);};c.oninput=()=>{filtros[c.dataset.filtro]=c.value;filtrar();};filtrar();});
    }
    function mostrarSelecionados(){
        const totais=totaisSelecionados(),itens=equipamentos.filter(e=>totais.has(e.id)),total=[...totais.values()].reduce((a,b)=>a+Number(b),0);
        el("totalSelecionadosExternos").textContent=`${total} ${total===1?"item":"itens"}`;
        el("listaSelecionadosExternos").innerHTML=itens.map(e=>`<div class="equipamentoSelecionado"><div class="dadosSelecionadoCautela"><strong>${seguro(nomeCategoria(e.categoria))} — ${seguro(nome(e))}</strong><span>Patrimônio: ${seguro(e.patrimonio)||"Não informado"}</span>${e.categoria==="MUNICAO"?"":`<span>Prefixo / nº de série: ${seguro([e.prefixo,e.numeroSerie].filter(Boolean).join(" / "))||"Não informado"}</span>`}${["MUNICAO","OUTROS"].includes(e.categoria)?`<span class="quantidadeSelecionadaDestaque">Quantidade: <b>${totais.get(e.id)}</b> unidade(s)</span>`:""}</div><button data-remover="${e.id}">Remover</button></div>`).join("")||'<div class="estadoVazioSelecionados"><i class="fa-solid fa-box-open"></i><strong>Nenhum item selecionado</strong><span>Marque os equipamentos na seção ao lado.</span></div>';
        document.querySelectorAll("[data-remover]").forEach(b=>b.onclick=()=>{const id=Number(b.dataset.remover);selecionados.delete(id);[...municoesPorArma].forEach(([arma,v])=>{if(arma===id||v.municaoId===id)municoesPorArma.delete(arma);});desenhar();});
    }
    const campos={matriculaExterna:"externaMatricula",nomeCompletoExterno:"externaNomeCompleto",nomeGuerraExterno:"externaNomeGuerra",graduacaoExterna:"externaGraduacao",unidadeOrigem:"externaUnidade",telefoneExterno:"externaTelefone",emailExterno:"externaEmail",motivoExterno:"externaMotivo",autoridadeSolicitante:"externaAutoridade",responsavelAutorizou:"externaResponsavel"};
    const dados=()=>Object.fromEntries(Object.entries(campos).map(([k,id])=>[k,el(id).value.trim()]));
    async function preencherPolicial(){const matricula=el("externaMatricula").value.trim();if(!matricula)return;try{const p=await window.api.policialExterno.buscarMatricula(matricula);if(!p)return;[["externaNomeCompleto","nomeCompleto"],["externaNomeGuerra","nomeGuerra"],["externaGraduacao","graduacao"],["externaUnidade","unidadeOrigem"],["externaTelefone","telefone"],["externaEmail","email"]].forEach(([id,c])=>el(id).value=p[c]||"");}catch(e){console.error(e);}}
    function abrirSenha(){const d=dados(),opcionais=new Set(["emailExterno","autoridadeSolicitante","responsavelAutorizou"]),obrigatorios=Object.entries(campos).filter(([k])=>!opcionais.has(k)),faltando=obrigatorios.find(([k])=>!d[k]);if(faltando)return alert(`Preencha: ${el(faltando[1]).previousElementSibling.textContent.replace(" *","")}.`);if(!totaisSelecionados().size)return alert("Selecione pelo menos um equipamento.");el("senhaArmeiroExterna").value="";el("erroSenhaExterna").textContent="";el("modalSenhaExterna").classList.remove("oculto");el("senhaArmeiroExterna").focus();}
    const fechar=()=>el("modalSenhaExterna").classList.add("oculto");
    async function emitir(){const senha=el("senhaArmeiroExterna").value;if(!senha)return el("erroSenhaExterna").textContent="Informe a senha do armeiro.";try{el("confirmarExterna").disabled=true;await window.api.cautela.novaExterna({...dados(),observacao:el("externaObservacao").value.trim(),senhaArmeiro:senha,itens:[...totaisSelecionados()].map(([id,quantidade])=>({id,quantidade}))});fechar();alert("Cautela externa emitida com sucesso.");Object.values(campos).forEach(id=>el(id).value="");el("externaObservacao").value="";selecionados.clear();municoesPorArma.clear();categoriaAberta=null;await carregar();}catch(e){el("erroSenhaExterna").textContent=e.message;}finally{el("confirmarExterna").disabled=false;}}
    let temporizadorMatricula;
    el("externaMatricula").oninput=()=>{clearTimeout(temporizadorMatricula);temporizadorMatricula=setTimeout(preencherPolicial,350);};el("externaMatricula").onblur=preencherPolicial;el("externaMatricula").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();preencherPolicial();}};el("pesquisaEquipamentoExterno").oninput=desenhar;el("btnEmitirExterna").onclick=abrirSenha;el("fecharSenhaExterna").onclick=fechar;el("cancelarSenhaExterna").onclick=fechar;el("confirmarExterna").onclick=emitir;el("senhaArmeiroExterna").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();emitir();}};carregar().catch(e=>alert(e.message));
})();
