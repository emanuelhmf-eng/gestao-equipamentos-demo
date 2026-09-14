function preencherAtividades(lista){
    const painel = document.getElementById("listaAtividades");

    if(!painel) return;

    painel.innerHTML = "";

    if(!lista.length){
        painel.innerHTML = `
            <div class="atividadeVazia">
                <i class="fa-regular fa-calendar-check"></i>
                <strong>Nenhuma atividade hoje</strong>
                <span>As movimentações do dia aparecerão aqui.</span>
            </div>
        `;
        return;
    }

    lista.forEach(item => {
        const operacao = String(item.operacao || "ATIVIDADE").replaceAll("_", " ");
        const nome = [item.graduacao,item.nome].filter(Boolean).join(" ") || "Usuário";
        const equipamento = [
            item.modelo,
            item.patrimonio ? `Patrimônio ${item.patrimonio}` : ""
        ].filter(Boolean).join(" · ");
        const dataHora = new Date(item.dataHora);
        const horario = Number.isNaN(dataHora.getTime())
            ? "--:--"
            : dataHora.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            });
        const classeOperacao = operacao.includes("DEVOLU")
            ? "devolucao"
            : operacao.includes("CAUTEL")
                ? "cautela"
                : "padrao";

        const atividade = document.createElement("div");
        atividade.className = "atividade";
        atividade.innerHTML = `
            <span class="iconeAtividade ${classeOperacao}">
                <i class="fa-solid ${classeOperacao === "devolucao"
                    ? "fa-rotate-left"
                    : classeOperacao === "cautela"
                        ? "fa-arrow-right-arrow-left"
                        : "fa-box"}"></i>
            </span>
            <div class="conteudoAtividade">
                <div class="linhaAtividade">
                    <strong></strong>
                    <time></time>
                </div>
                <span class="usuarioAtividade"></span>
                <small class="equipamentoAtividade"></small>
            </div>
        `;

        atividade.querySelector(".linhaAtividade strong").textContent = operacao;
        atividade.querySelector("time").textContent = horario;
        atividade.querySelector("time").dateTime = item.dataHora || "";
        atividade.querySelector(".usuarioAtividade").textContent = nome;
        const elementoEquipamento = atividade.querySelector(".equipamentoAtividade");
        if(equipamento) elementoEquipamento.textContent = equipamento;
        else elementoEquipamento.remove();

        painel.appendChild(atividade);
    });
}
