document.addEventListener(

    "DOMContentLoaded",

    carregarDashboard

);

async function carregarDashboard(){

    const equipamentos =
    await window.api.equipamento.listar();

    document
        .getElementById("cardEquipamentos")
        .innerText = equipamentos.length;

}