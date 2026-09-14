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

}