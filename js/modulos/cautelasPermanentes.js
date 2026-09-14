(() => {
const formatarDataCautela = valor => valor ? new Date(valor).toLocaleString("pt-BR") : "—";
async function carregarHistoricoCautelas(){
    const cautelas = await window.api.cautela.listarHistorico();
    document.getElementById("listaHistoricoCautelas").innerHTML = cautelas.map(c => `<tr><td>${c.id}</td><td>${c.nome ?? ""}</td><td>${c.graduacao ?? ""}</td><td>${formatarDataCautela(c.dataRetirada)}</td><td>${formatarDataCautela(c.dataDevolucao)}</td><td>${c.status}</td></tr>`).join("") || "<tr><td colspan='6'>Nenhum registro encontrado.</td></tr>";
}
carregarHistoricoCautelas().catch(erro => alert(erro.message));
})();
