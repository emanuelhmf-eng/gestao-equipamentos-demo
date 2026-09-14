const equipamentoRepository =
require("../repositories/equipamentoRepository");

const cautelaRepository =
require("../repositories/cautelaRepository");

const historicoRepository =
require("../repositories/historicoRepository");

class DashboardController {

    async carregar() {

        try {

            const [
                resumoEquipamentos,
                cautelasAbertas,
                ultimasMovimentacoes,
                armamentosRanking
            ] = await Promise.all([

                equipamentoRepository.obterResumoCategorias(),

                cautelaRepository.listarResumoDashboard(),

                historicoRepository.ultimosRegistros(),

                equipamentoRepository.rankingArmamentos()

            ]);

            return {

                resumoEquipamentos:
                    resumoEquipamentos || [],

                cautelasAbertas:
                    cautelasAbertas || [],

                ultimasMovimentacoes:
                    ultimasMovimentacoes || [],

                rankingArmamentos:this.montarRanking(armamentosRanking || [])

            };

        } catch (erro) {

            console.error(
                "Erro ao carregar dashboard:",
                erro
            );

            throw new Error(
                erro.message ||
                "Não foi possível carregar o dashboard."
            );

        }

    }

    montarRanking(armamentos){
        const agrupar=campoTotal=>{
            const dimensoes={categoria:new Map(),modelo:new Map(),individual:new Map()};
            armamentos.forEach(item=>{
                const total=Number(item[campoTotal]||0);
                if(!total) return;
                const categoria=item.categoria==="ARMA_LONGA"?"Armas longas":"Armas curtas";
                const modelo=[item.fabricante,item.modelo].filter(Boolean).join(" ") || "Modelo não informado";
                const identificacao=[item.prefixo,item.numeroSerie].filter(Boolean).join(" / ");
                const individual=[identificacao&&`Prefixo / série ${identificacao}`,item.patrimonio&&`Patrimônio ${item.patrimonio}`].filter(Boolean).join(" · ") || `${modelo} #${item.id}`;
                [["categoria",categoria],["modelo",modelo],["individual",individual]].forEach(([dimensao,chave])=>{
                    const atual=dimensoes[dimensao].get(chave)||{nome:chave,total:0,categoria:item.categoria,modelo};
                    atual.total+=total;
                    dimensoes[dimensao].set(chave,atual);
                });
            });
            return Object.fromEntries(Object.entries(dimensoes).map(([chave,mapa])=>[chave,[...mapa.values()].sort((a,b)=>b.total-a.total||a.nome.localeCompare(b.nome,"pt-BR")).slice(0,10)]));
        };
        return {cautelas:agrupar("totalCautelas"),baixas:agrupar("totalBaixas")};
    }

}

module.exports =
new DashboardController();
