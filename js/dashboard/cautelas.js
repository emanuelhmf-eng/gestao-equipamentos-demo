function preencherTabelaCautelas(lista){
    const tbody = document.querySelector("#tabelaCautelas tbody");
    const total = document.getElementById("totalCautelasAbertas");
    const cautelas = Array.isArray(lista) ? lista : [];

    if(total) total.textContent = `${cautelas.length} em aberto`;

    if(!cautelas.length){
        tbody.innerHTML = `<tr class="estadoVazioCautelas"><td colspan="3"><i class="fa-solid fa-circle-check"></i><strong>Nenhuma cautela em aberto</strong><span>Todos os itens foram devolvidos.</span></td></tr>`;
        return;
    }

    tbody.innerHTML = cautelas.map(cautela => {
        const nome = cautela.nome || "Usuário não informado";
        const graduacao = cautela.graduacao || "Graduação não informada";
        const quantidade = Number(cautela.quantidade || 0);
        const permanente = cautela.tipo === "PERMANENTE";
        const externa = cautela.tipo === "EXTERNA";
        const etiquetaTipo = externa
            ? '<span class="tipoCautelaDashboard externa"><i class="fa-solid fa-building-shield"></i> Cautela externa</span>'
            : permanente
                ? '<span class="tipoCautelaDashboard"><i class="fa-solid fa-link"></i> Permanente</span>'
                : '<span class="tipoCautelaDashboard temporaria"><i class="fa-regular fa-clock"></i> Temporária</span>';
        const dataRetirada = cautela.dataRetirada
            ? new Date(cautela.dataRetirada)
            : null;
        const data = dataRetirada && !Number.isNaN(dataRetirada.getTime())
            ? `${dataRetirada.toLocaleDateString("pt-BR")} às ${dataRetirada.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
            : "Não informada";
        return `<tr>
            <td><div class="identidadePolicial"><span class="avatarPolicial">${nome.trim().charAt(0).toUpperCase()}</span><div><strong>${nome}</strong><small>${graduacao}</small>${etiquetaTipo}</div></div></td>
                <td><button class="quantidadeCautela" data-detalhes-cautela="${cautela.id}" title="Ver equipamentos"><b>${quantidade}</b> ${quantidade === 1 ? "item" : "itens"}</button></td>
            <td><span class="dataCautela"><i class="fa-regular fa-calendar"></i>${data}</span></td>
        </tr>`;
    }).join("");
    tbody.querySelectorAll("[data-detalhes-cautela]").forEach(botao => {
        botao.addEventListener("click", () => exibirDetalhesCautelaDashboard(Number(botao.dataset.detalhesCautela)));
    });
}

async function exibirDetalhesCautelaDashboard(cautelaId){
    try{
        const cautela = await window.api.cautela.detalhes(cautelaId);
        const existente = document.getElementById("modalDetalhesDashboard");
        if(existente) existente.remove();
        const modal = document.createElement("div");
        modal.id = "modalDetalhesDashboard";
        modal.className = "modal modalCautela";
        modal.innerHTML = `<div class="janelaModal janelaDetalhesCautela">
            <div class="cabecalhoModal"><div><h2>Equipamentos cautelados</h2><p>${cautela.graduacao || ""} ${cautela.nome || ""} · ${cautela.tipo === "EXTERNA" ? "Cautela externa" : cautela.tipo === "PERMANENTE" ? "Cautela permanente" : "Cautela temporária"}</p></div><button data-fechar>&times;</button></div>
            <div class="corpoDetalhesCautela">${cautela.itens.filter(item => !item.devolvido).map(item => {
                const armamento = ["ARMA_LONGA","ARMA_CURTA"].includes(item.categoria);
                const identificacaoArmamento = armamento
                    ? `<span><b>Prefixo / nº de série:</b> ${[item.prefixo,item.numeroSerie].filter(Boolean).join(" / ") || "Não informado"}</span>`
                    : "";
                return `<div class="itemDetalheCautela"><i class="fa-solid ${armamento ? "fa-gun" : "fa-box"}"></i><div><strong>${item.categoria === "MUNICAO" ? item.calibre : item.modelo}</strong><span>${item.patrimonio || "Sem patrimônio"} · ${item.quantidade} ${item.quantidade === 1 ? "unidade" : "unidades"}</span>${identificacaoArmamento}</div></div>`;
            }).join("") || "<p>Nenhum item pendente.</p>"}</div>
        </div>`;
        document.body.appendChild(modal);
        modal.querySelector("[data-fechar]").onclick = () => modal.remove();
        modal.onclick = evento => { if(evento.target === modal) modal.remove(); };
    }catch(erro){ alert(erro.message || "Não foi possível carregar os detalhes."); }
}
