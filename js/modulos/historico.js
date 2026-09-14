(() => {
    let registros = [];
    const seguro = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    const nomeItem = item => item.categoria === "MUNICAO" ? item.calibre : item.modelo;
    const nomeOperacao = operacao => ({CAUTELA:"CAUTELA",DEVOLUCAO:"DEVOLUÇÃO",EDICAO_CAUTELA:"EDIÇÃO DE CAUTELA"})[operacao] || String(operacao || "").replaceAll("_"," ");

    function dadosOperacao(registro){
        let resumo = "";
        let alteracoes = [];
        let observacaoCautela = "";
        try{
            const dados = JSON.parse(registro.observacao || "");
            resumo = dados.resumo || "";
            alteracoes = Array.isArray(dados.alteracoes) ? dados.alteracoes : [];
            observacaoCautela = dados.observacaoCautela || "";
        }catch{ resumo = registro.observacao || ""; }
        if(!alteracoes.length){
            alteracoes = (registro.detalhes || []).flatMap(detalhe => {
                try{
                    const dados = JSON.parse(detalhe.observacao || "");
                    return Array.isArray(dados.alteracoes) ? dados.alteracoes : [];
                }catch{ return detalhe.equipamentoId ? [detalhe] : []; }
            });
        }
        return {resumo,alteracoes,observacaoCautela};
    }

    async function carregarHistorico(){
        const [lista,sessao] = await Promise.all([window.api.historico.listar(),window.api.usuario.sessao()]);
        registros = lista;
        document.getElementById("acoesLimpezaHistorico").hidden=sessao?.perfil!=="ADMINISTRADOR";
        desenharHistorico();
    }

    async function limparHistorico(){
        const dataInicial=document.getElementById("dataInicialLimpezaHistorico").value;
        const dataFinal=document.getElementById("dataFinalLimpezaHistorico").value;
        if(!dataInicial||!dataFinal){alert("Informe a data inicial e a data final da limpeza.");return;}
        if(dataInicial>dataFinal){alert("A data inicial não pode ser posterior à data final.");return;}
        const periodo=`${new Date(`${dataInicial}T12:00:00`).toLocaleDateString("pt-BR")} a ${new Date(`${dataFinal}T12:00:00`).toLocaleDateString("pt-BR")}`;
        const senha=await window.solicitarSenhaAdministrador(`Esta operação excluirá somente os registros do histórico no período de ${periodo}. Digite sua senha para confirmar.`);
        if(senha===null) return;
        if(!senha){ alert("Informe a senha do administrador."); return; }
        try{
            const resultado=await window.api.historico.limpar(senha,dataInicial,dataFinal);
            alert(`${resultado.total} registro(s) removido(s). A operação de limpeza foi registrada.`);
            await carregarHistorico();
        }catch(erro){ alert(erro.message||"Não foi possível limpar o histórico."); }
    }

    function desenharHistorico(){
        const termo = document.getElementById("filtroHistorico").value.toLowerCase().trim();
        const dataInicial = document.getElementById("filtroDataInicialHistorico").value;
        const dataFinal = document.getElementById("filtroDataFinalHistorico").value;
        const filtrados = registros.filter(registro => {
            const instante = registro.dataHora ? new Date(registro.dataHora) : null;
            const dataRegistroFiltro = instante && !Number.isNaN(instante.getTime())
                ? `${instante.getFullYear()}-${String(instante.getMonth() + 1).padStart(2, "0")}-${String(instante.getDate()).padStart(2, "0")}`
                : "";
            if(dataInicial && dataRegistroFiltro < dataInicial) return false;
            if(dataFinal && dataRegistroFiltro > dataFinal) return false;
            if(!termo) return true;
            const dataRegistro = registro.dataHora
                ? new Date(registro.dataHora).toLocaleString("pt-BR")
                : "";
            const {resumo,alteracoes,observacaoCautela} = dadosOperacao(registro);
            const conteudo = [
                nomeOperacao(registro.operacao),
                registro.operacao,
                registro.graduacao,
                registro.nome,
                dataRegistro,
                resumo,
                observacaoCautela,
                ...alteracoes.flatMap(item => [
                    item.tipo,
                    item.categoria,
                    nomeItem(item),
                    item.fabricante,
                    item.patrimonio,
                    item.prefixo,
                    item.numeroSerie,
                    item.observacao
                ])
            ];
            return conteudo.some(valor => String(valor ?? "").toLowerCase().includes(termo));
        });
        const corpo = document.getElementById("listaHistorico");
        corpo.innerHTML = filtrados.map(registro => `<tr>
            <td>${registro.dataHora ? new Date(registro.dataHora).toLocaleString("pt-BR") : "—"}</td>
            <td><span class="operacaoHistorico">${seguro(nomeOperacao(registro.operacao))}</span></td>
            <td>${seguro(registro.graduacao)} ${seguro(registro.nome)}</td>
            <td><button class="btnDetalhesCautela" data-detalhes-historico="${registro.id}"><i class="fa-solid fa-eye"></i> Detalhes</button></td>
        </tr>`).join("") || "<tr><td colspan='4' class='estadoVazioTabela'>Nenhuma movimentação registrada.</td></tr>";
        corpo.querySelectorAll("[data-detalhes-historico]").forEach(botao => {
            botao.onclick = () => abrirDetalhes(Number(botao.dataset.detalhesHistorico));
        });
    }

    function abrirDetalhes(id){
        const registro = registros.find(item => item.id === id);
        const {resumo,alteracoes,observacaoCautela} = dadosOperacao(registro);
        document.getElementById("subtituloHistorico").textContent = `${nomeOperacao(registro.operacao)} · ${new Date(registro.dataHora).toLocaleString("pt-BR")}`;
        document.getElementById("conteudoDetalhesHistorico").innerHTML = `
            <div class="resumoOperacaoHistorico"><strong>Policial:</strong> ${seguro(registro.graduacao)} ${seguro(registro.nome)}${resumo ? `<br><strong>Resumo:</strong> ${seguro(resumo)}` : ""}${observacaoCautela ? `<br><strong>Observação da cautela:</strong> ${seguro(observacaoCautela)}` : ""}</div>
            ${alteracoes.map(item => `<div class="itemDetalheCautela">
                <i class="fa-solid ${item.tipo === "REMOVIDO" ? "fa-minus" : item.tipo === "DEVOLVIDO" ? "fa-rotate-left" : "fa-box"}"></i>
                <div><strong>${seguro(item.tipo || "ITEM")} — ${seguro(nomeItem(item)) || "Equipamento"}</strong>
                <span>${seguro(item.categoria)} · Patrimônio: ${seguro(item.patrimonio) || "—"} · Prefixo / série: ${seguro([item.prefixo,item.numeroSerie].filter(Boolean).join(" / ")) || "—"} · Quantidade: ${item.quantidade || 1}</span>
                ${item.observacao ? `<small>${seguro(item.observacao)}</small>` : ""}</div>
            </div>`).join("") || "<p>Esta operação não possui modificações detalhadas.</p>"}`;
        document.getElementById("modalDetalhesHistorico").classList.remove("oculto");
    }

    document.getElementById("fecharDetalhesHistorico").onclick = () => document.getElementById("modalDetalhesHistorico").classList.add("oculto");
    document.getElementById("modalDetalhesHistorico").onclick = evento => { if(evento.target.id === "modalDetalhesHistorico") evento.target.classList.add("oculto"); };
    document.getElementById("filtroHistorico").addEventListener("input", desenharHistorico);
    document.getElementById("filtroDataInicialHistorico").addEventListener("change", desenharHistorico);
    document.getElementById("filtroDataFinalHistorico").addEventListener("change", desenharHistorico);
    document.getElementById("btnLimparHistorico").addEventListener("click",limparHistorico);
    carregarHistorico().catch(erro => alert(erro.message));
})();
