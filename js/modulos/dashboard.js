/****************************************************************
DASHBOARD
****************************************************************/

async function iniciarDashboard(){

    if(!document.getElementById("totalArmasLongas")) return;

    try{

        const dados =
        await window.api.dashboard.carregar();

        preencherCards(dados);

        preencherTabelaCautelas(

            dados.cautelasAbertas

        );

        preencherAtividades(

            dados.ultimasMovimentacoes

        );

        configurarRankingArmamentos(dados.rankingArmamentos || {});

        const botaoNovaCautela = document.getElementById("btnNovaCautelaDashboard");

        if(botaoNovaCautela){

            botaoNovaCautela.onclick = () => abrirTela("cautelaNova");

        }
        const botaoVerCautelas = document.getElementById("btnVerCautelasAbertas");
        if(botaoVerCautelas){
            botaoVerCautelas.onclick = () => abrirTela("cautelasAbertas");
        }

        const categorias = ["ARMA_LONGA","ARMA_CURTA","MUNICAO","RADIO","COLETE","OUTROS"];
        document.querySelectorAll(".cardDashboard button").forEach((botao, indice) => {
            botao.onclick = () => mostrarDetalhesCategoria(categorias[indice]);
        });

    }catch(erro){

        console.error(

            "Erro ao carregar Dashboard:",

            erro

        );

    }

}

function configurarRankingArmamentos(ranking){
    let dimensao="categoria";
    const seguro=valor=>String(valor??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    const desenharLista=(id,lista,icone)=>{
        const destino=document.getElementById(id);
        if(!destino) return;
        const maior=Math.max(...(lista||[]).map(item=>Number(item.total||0)),1);
        destino.innerHTML=(lista||[]).map((item,indice)=>`<article class="itemRankingArmamento"><span class="posicaoRankingArmamento">${indice+1}</span><span class="iconeRankingArmamento"><i class="fa-solid ${icone}"></i></span><div><strong>${seguro(item.nome)}</strong>${dimensao==="individual"?`<small>${seguro(item.modelo)} · ${item.categoria==="ARMA_LONGA"?"Arma longa":"Arma curta"}</small>`:""}<span class="barraRankingArmamento"><i style="width:${Math.max(8,Number(item.total||0)/maior*100)}%"></i></span></div><b>${item.total}</b></article>`).join("")||'<div class="rankingArmamentoVazio"><i class="fa-solid fa-chart-simple"></i><span>Nenhum registro encontrado.</span></div>';
    };
    const desenhar=()=>{
        desenharLista("rankingArmamentosCautelados",ranking.cautelas?.[dimensao],"fa-shield-halved");
        desenharLista("rankingArmamentosBaixados",ranking.baixas?.[dimensao],"fa-box-archive");
        document.querySelectorAll("[data-ranking-dimensao]").forEach(botao=>botao.classList.toggle("ativo",botao.dataset.rankingDimensao===dimensao));
    };
    document.querySelectorAll("[data-ranking-dimensao]").forEach(botao=>botao.onclick=()=>{dimensao=botao.dataset.rankingDimensao;desenhar();});
    desenhar();
}

async function mostrarDetalhesCategoria(categoria){
    const equipamentos = await window.api.equipamento.listarDisponiveis();
    const resumo = equipamentos.filter(item => item.categoria === categoria).reduce((acumulado,item) => {
        const chave = categoria === "MUNICAO"
            ? item.calibre || "Calibre não informado"
            : item.modelo || "Modelo não informado";
        acumulado[chave] = (acumulado[chave] || 0) + Number(item.saldoDisponivel || 0);
        return acumulado;
    }, {});
    let painel = document.getElementById("detalhesDashboard");
    if(!painel){ painel=document.createElement("section"); painel.id="detalhesDashboard"; painel.className="painel"; document.querySelector(".painelDashboard").before(painel); }
    const identificador = categoria === "MUNICAO" ? "calibre" : "modelo";
    painel.innerHTML = `<div class="tituloPainel"><h2>${categoria.replaceAll("_"," ")} disponíveis por ${identificador}</h2><button id="fecharDetalhesDashboard">Fechar</button></div><table class="tabela"><thead><tr><th>${identificador.charAt(0).toUpperCase() + identificador.slice(1)}</th><th>Quantidade disponível</th></tr></thead><tbody>${Object.entries(resumo).map(([modelo,quantidade])=>`<tr><td>${modelo}</td><td>${quantidade}</td></tr>`).join("") || "<tr><td colspan='2'>Nenhum equipamento disponível.</td></tr>"}</tbody></table>`;
    painel.querySelector("#fecharDetalhesDashboard").onclick=()=>painel.remove();
    painel.scrollIntoView({behavior:"smooth",block:"start"});
}

/****************************************************************
CARDS
****************************************************************/

function preencherCards(dados){

    document.getElementById("totalArmasLongas").innerText =
        dados.resumoEquipamentos.ARMA_LONGA;

    document.getElementById("totalArmasCurtas").innerText =
        dados.resumoEquipamentos.ARMA_CURTA;

    document.getElementById("totalMunicoes").innerText =
        dados.resumoEquipamentos.MUNICAO;

    document.getElementById("totalRadios").innerText =
        dados.resumoEquipamentos.RADIO;

    document.getElementById("totalColetes").innerText =
        dados.resumoEquipamentos.COLETE;

    document.getElementById("totalOutros").innerText =
        dados.resumoEquipamentos.OUTROS;

}


if(!window.__dashboardAtualizacaoConfigurada){
    window.addEventListener("dashboardAtualizar", () => {
        if(document.getElementById("totalArmasLongas")) iniciarDashboard();
    });
    window.__dashboardAtualizacaoConfigurada = true;
}

iniciarDashboard();
