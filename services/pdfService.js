const { jsPDF } = require("jspdf");
const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const configuracaoRepository = require("../repositories/configuracaoRepository");

class PDFService {
    limparTextoRelatorio(valor){
        return String(valor || "").replace(/,\s*descontada\(s\) do estoque e dos indicadores\.?/gi,".");
    }

    async obterIdentidade(){
        const configuracao = await configuracaoRepository.obter().catch(() => ({}));
        const logoPadrao = path.join(__dirname,"..","assets","demo-logo.svg");
        const logo = /^data:image\/(png|jpeg);base64,/.test(configuracao?.brasao || "") ? configuracao.brasao : null;
        return {
            logo,
            orgaoSeguranca:configuracao?.orgaoSeguranca || "ORGANIZAÇÃO DEMONSTRATIVA",
            nomeUnidadeRelatorios:configuracao?.nomeUnidadeRelatorios || "UNIDADE DEMONSTRATIVA — SEM VALIDADE OFICIAL"
        };
    }

    adicionarLogo(pdf,logo,x=15,y=10,w=25,h=25){
        if(!logo) return;
        const formato=String(logo).startsWith("data:image/jpeg") ? "JPEG" : "PNG";
        pdf.addImage(logo,formato,x,y,w,h);
    }

    async gerarPDF(cautela){
        if(["EQUIPAMENTOS","POLICIAIS"].includes(cautela?.tipoRelatorio)){
            return this.gerarPDFListagem(cautela.tipoRelatorio,cautela.registros || []);
        }
        if(Array.isArray(cautela?.registros)){
            return this.gerarPDFConsolidado(cautela.registros);
        }
        const pdf = new jsPDF();
        const identidade = await this.obterIdentidade();
        this.adicionarLogo(pdf,identidade.logo);

        pdf.setTextColor(70,57,39);
        pdf.setFont("helvetica","bold");
        pdf.setFontSize(11);
        pdf.text("DEMONSTRAÇÃO — SEM VALIDADE OFICIAL",105,14,{align:"center"});
        pdf.setFontSize(9);
        pdf.text(String(identidade.orgaoSeguranca).toUpperCase(),105,20,{align:"center",maxWidth:145});
        pdf.text(String(identidade.nomeUnidadeRelatorios).toUpperCase(),105,26,{align:"center",maxWidth:145});
        pdf.setDrawColor(126,105,72);
        pdf.line(15,38,195,38);

        pdf.setFontSize(14);
        pdf.text("RELATÓRIO DE CAUTELA",105,48,{align:"center"});
        pdf.setFont("helvetica","normal");
        pdf.setTextColor(30,30,30);
        pdf.setFontSize(10);

        const nome = `${cautela.graduacao || ""} ${cautela.nomeGuerra || cautela.nome || ""}`.trim();
        const linhas = [
            `Policial: ${nome}`,
            `Tipo: ${cautela.tipo === "EXTERNA" ? "Cautela externa" : cautela.tipo === "PERMANENTE" ? "Cautela permanente" : "Cautela temporária"}`,
            `Matrícula: ${cautela.matricula || "Não informada"}`,
            `Data de devolução: ${this.formatarData(cautela.dataDevolucao)}`,
            `Data de abertura: ${this.formatarData(cautela.dataRetirada)}`,
            `Situação da cautela: ${cautela.status === "FECHADA" ? "FECHADO" : "ABERTO"}`,
            `Armeiro: ${cautela.armeiroNome || "Não informado"}`
        ];
        if(cautela.tipo === "EXTERNA") linhas.push(
            `Unidade: ${cautela.unidadeOrigem || "Não informada"}`,
            `Telefone: ${cautela.telefoneExterno || "Não informado"}`,
            `Motivo: ${cautela.motivoExterno || "Não informado"}`,
            `Autoridade solicitante: ${cautela.autoridadeSolicitante || "Não informada"}`,
            `Responsável que autorizou: ${cautela.responsavelAutorizou || "Não informado"}`
        );
        linhas.forEach((linha,indice) => pdf.text(linha,15,58+(indice*6)));

        let y = 58 + (linhas.length * 6) + 8;
        if(cautela.observacao){
            const linhasObservacao = pdf.splitTextToSize(`Observação: ${cautela.observacao}`,180);
            pdf.text(linhasObservacao,15,102);
            y += Math.max(0,linhasObservacao.length - 1) * 4;
        }
        pdf.setFont("helvetica","bold");
        pdf.text("EQUIPAMENTOS",15,y);
        y += 7;
        pdf.setFillColor(126,105,72);
        pdf.setTextColor(255,255,255);
        pdf.rect(15,y-5,180,8,"F");
        pdf.setFontSize(8);
        pdf.text("Categoria",17,y);
        pdf.text("Equipamento",50,y);
        pdf.text("Patrimônio",112,y);
        pdf.text("Qtd.",178,y);
        y += 7;

        pdf.setFont("helvetica","normal");
        pdf.setTextColor(25,25,25);
        for(const item of cautela.itens || []){
            if(y > 275){
                pdf.addPage();
                y = 20;
            }
            const equipamento = item.categoria === "MUNICAO" ? item.calibre : item.modelo;
            pdf.text(String(item.categoria || ""),17,y);
            pdf.text(String(equipamento || ""),50,y);
            pdf.text(String(item.patrimonio || "—"),112,y);
            pdf.text(String(item.quantidade || 1),180,y);
            pdf.setDrawColor(225,218,205);
            pdf.line(15,y+2,195,y+2);
            y += 7;
        }

        const movimentacoes = cautela.movimentacoes || [];
        if(movimentacoes.length){
            y += 5;
            if(y > 265){
                pdf.addPage();
                y = 20;
            }
            pdf.setFont("helvetica","bold");
            pdf.setFontSize(10);
            pdf.text("MOVIMENTAÇÕES E EDIÇÕES",15,y);
            y += 7;
            pdf.setFont("helvetica","normal");
            pdf.setFontSize(8);
            for(const movimentacao of movimentacoes){
                if(y > 278){
                    pdf.addPage();
                    y = 20;
                }
                let resumo = movimentacao.observacao || "";
                try{
                    const dados = JSON.parse(movimentacao.observacao || "");
                    resumo = [dados.resumo,dados.observacaoCautela &&
                        `Observação da edição: ${dados.observacaoCautela}`].filter(Boolean).join(" ");
                }catch{ /* Registros antigos usam observação em texto. */ }
                resumo = this.limparTextoRelatorio(resumo);
                const operacao = String(movimentacao.operacao || "").replaceAll("_"," ");
                const linha = `${this.formatarData(movimentacao.dataHora)} | ${operacao} | ${resumo || "Sem descrição"}`;
                const linhasMovimentacao = pdf.splitTextToSize(linha,178);
                pdf.text(linhasMovimentacao,17,y);
                y += (linhasMovimentacao.length * 4) + 3;
            }
        }

        pdf.setFontSize(8);
        pdf.setTextColor(100,90,75);
        pdf.text(`Documento gerado em ${new Date().toLocaleString("pt-BR")}`,15,288);

        const pasta = path.join(app.getPath("documents"),"Cautela Demo - Relatórios");
        fs.mkdirSync(pasta,{recursive:true});
        const arquivo = path.join(pasta,`relatorio_cautela_${cautela.id || Date.now()}.pdf`);
        fs.writeFileSync(arquivo,Buffer.from(pdf.output("arraybuffer")));
        return {arquivo};
    }

    async gerarPDFListagem(tipo,registros){
        const pdf = new jsPDF({orientation:"landscape"});
        const identidade = await this.obterIdentidade();
        this.adicionarLogo(pdf,identidade.logo,14,8,22,22);
        const titulo = tipo === "EQUIPAMENTOS" ? "RELATÓRIO DE EQUIPAMENTOS" : "RELATÓRIO DE POLICIAIS";
        pdf.setFont("helvetica","bold");
        pdf.setFontSize(11);
        pdf.text("DEMONSTRAÇÃO — SEM VALIDADE OFICIAL",148,12,{align:"center"});
        pdf.setFontSize(9);
        pdf.text(String(identidade.orgaoSeguranca).toUpperCase(),148,18,{align:"center",maxWidth:205});
        pdf.text(String(identidade.nomeUnidadeRelatorios).toUpperCase(),148,24,{align:"center",maxWidth:205});
        pdf.setFontSize(14);
        pdf.text(titulo,148,35,{align:"center"});
        pdf.setFont("helvetica","normal");
        pdf.setFontSize(8);
        let y = 46;
        for(const item of registros){
            if(y > 192){ pdf.addPage(); y = 15; }
            const operacaoEquipamento = {
                CADASTRO_EQUIPAMENTO:"Cadastro de equipamentos",
                EXCLUSAO_EQUIPAMENTO:"Exclusão de equipamentos",
                EDICAO_EQUIPAMENTO:"Edição de equipamentos",
                MANUTENCAO:"Manutenção",
                BAIXADO:"Baixado"
            }[item.operacao] || String(item.operacao || "").replaceAll("_"," ");
            const linha = tipo === "EQUIPAMENTOS"
                ? `${this.formatarData(item.dataHora)} | ${operacaoEquipamento} | ${item.categoria || "—"} | ${item.calibre || item.modelo || "—"} | Patrimônio: ${item.patrimonio || "—"} | Prefixo / série: ${[item.prefixo,item.numeroSerie].filter(Boolean).join(" / ") || "—"} | Qtd.: ${["MUNICAO","OUTROS"].includes(item.categoria) ? item.quantidade : 1} | ${item.observacao || "Sem observações"}`
                : `${this.formatarData(item.dataHora)} | ${String(item.operacao || "CADASTRO_POLICIAL").replaceAll("_"," ")} | Matrícula: ${item.matricula || "—"} | ${item.graduacao || ""} ${item.nomeGuerra || item.nome || "—"} | Modificações: ${item.observacao || "Sem detalhes"}`;
            const linhas = pdf.splitTextToSize(linha,270);
            pdf.text(linhas,14,y);
            y += linhas.length * 4 + 4;
            pdf.line(14,y-2,283,y-2);
        }
        const pasta = path.join(app.getPath("documents"),"Cautela Demo - Relatórios");
        fs.mkdirSync(pasta,{recursive:true});
        const arquivo = path.join(pasta,`relatorio_${tipo.toLowerCase()}_${Date.now()}.pdf`);
        fs.writeFileSync(arquivo,Buffer.from(pdf.output("arraybuffer")));
        return {arquivo};
    }

    async gerarPDFConsolidado(registros){
        if(!registros.length) throw new Error("Selecione ao menos um registro.");

        const pdf = new jsPDF();
        const identidade = await this.obterIdentidade();

        const cabecalho = (titulo,indice) => {
            if(indice > 0) pdf.addPage();
            this.adicionarLogo(pdf,identidade.logo);
            pdf.setTextColor(70,57,39);
            pdf.setFont("helvetica","bold");
            pdf.setFontSize(11);
            pdf.text("DEMONSTRAÇÃO — SEM VALIDADE OFICIAL",105,14,{align:"center"});
            pdf.setFontSize(9);
            pdf.text(String(identidade.orgaoSeguranca).toUpperCase(),105,20,{align:"center",maxWidth:145});
            pdf.text(String(identidade.nomeUnidadeRelatorios).toUpperCase(),105,26,{align:"center",maxWidth:145});
            pdf.setDrawColor(126,105,72);
            pdf.line(15,38,195,38);
            pdf.setFontSize(14);
            pdf.text(titulo,105,48,{align:"center"});
        };

        const variosRelatorios = registros.length > 1;
        const tituloRelatorio = variosRelatorios ? "RELATÓRIOS DE CAUTELAS" : "RELATÓRIO DE CAUTELA";
        registros.forEach((cautela,indice) => {
            cabecalho(tituloRelatorio,indice);
            pdf.setFont("helvetica","normal");
            pdf.setTextColor(30,30,30);
            pdf.setFontSize(9);
            const nome = `${cautela.graduacao || ""} ${cautela.nomeGuerra || cautela.nome || ""}`.trim();
            const dados = [
                ...(variosRelatorios ? [`${indice + 1}. RELATÓRIO`] : []),
                `Policial: ${nome || "Não informado"}`,
                `Tipo: ${cautela.tipo === "EXTERNA" ? "Cautela externa" : cautela.tipo === "PERMANENTE" ? "Cautela permanente" : "Cautela temporária"}`,
                `Matrícula: ${cautela.matricula || "Não informada"}`,
                `Devolução: ${this.formatarData(cautela.dataDevolucao)}`,
                `Abertura: ${this.formatarData(cautela.dataRetirada)}`,
                `Situação da cautela: ${cautela.status === "FECHADA" ? "FECHADO" : "ABERTO"}`,
                `Armeiro: ${cautela.armeiroNome || "Não informado"}`
            ];
            if(cautela.tipo === "EXTERNA") dados.push(
                `Unidade: ${cautela.unidadeOrigem || "Não informada"}`,
                `Telefone: ${cautela.telefoneExterno || "Não informado"}`,
                `Motivo: ${cautela.motivoExterno || "Não informado"}`,
                `Autoridade solicitante: ${cautela.autoridadeSolicitante || "Não informada"}`,
                `Responsável que autorizou: ${cautela.responsavelAutorizou || "Não informado"}`
            );
            dados.forEach((linha,posicao) => pdf.text(linha,15,58+(posicao*6)));

            let y = 58 + (dados.length * 6) + 8;
            if(cautela.observacao){
                const observacao = pdf.splitTextToSize(`Observação: ${cautela.observacao}`,180);
                pdf.text(observacao,15,y);
                y += (observacao.length * 4) + 5;
            }
            pdf.setFont("helvetica","bold");
            pdf.setFillColor(126,105,72);
            pdf.setTextColor(255,255,255);
            pdf.rect(15,y-5,180,8,"F");
            pdf.setFontSize(8);
            pdf.text("Categoria",17,y);
            pdf.text("Equipamento",50,y);
            pdf.text("Patrimônio",112,y);
            pdf.text("Qtd.",178,y);
            y += 7;
            pdf.setFont("helvetica","normal");
            pdf.setTextColor(25,25,25);

            for(const item of cautela.itens || []){
                if(y > 270){
                    pdf.addPage();
                    y = 20;
                }
                const equipamento = item.categoria === "MUNICAO" ? item.calibre : item.modelo;
                pdf.text(String(item.categoria || ""),17,y);
                pdf.text(String(equipamento || "").slice(0,34),50,y);
                pdf.text(String(item.patrimonio || "—"),112,y);
                pdf.text(String(item.quantidade || 1),180,y);
                pdf.setDrawColor(225,218,205);
                pdf.line(15,y+2,195,y+2);
                y += 7;
            }

            const movimentacoes = cautela.movimentacoes || [];
            if(movimentacoes.length){
                y += 5;
                pdf.setFont("helvetica","bold");
                pdf.setFontSize(9);
                pdf.text("MOVIMENTAÇÕES E EDIÇÕES",15,y);
                y += 6;
                pdf.setFont("helvetica","normal");
                pdf.setFontSize(8);
                for(const movimentacao of movimentacoes){
                    if(y > 275){
                        pdf.addPage();
                        y = 20;
                    }
                    let resumo = movimentacao.observacao || "";
                    try{
                        const dados = JSON.parse(resumo);
                        resumo = [dados.resumo,dados.observacaoCautela &&
                            `Observação da edição: ${dados.observacaoCautela}`].filter(Boolean).join(" ");
                    }catch{ /* texto legado */ }
                    resumo = this.limparTextoRelatorio(resumo);
                    const operacao = String(movimentacao.operacao || "").replaceAll("_"," ");
                    const linhas = pdf.splitTextToSize(`${this.formatarData(movimentacao.dataHora)} | ${operacao} | ${resumo || "Sem descrição"}`,178);
                    pdf.text(linhas,17,y);
                    y += (linhas.length * 4) + 3;
                }
            }
        });

        const totalPaginas = pdf.getNumberOfPages();
        for(let pagina = 1; pagina <= totalPaginas; pagina++){
            pdf.setPage(pagina);
            pdf.setFontSize(8);
            pdf.setTextColor(100,90,75);
            pdf.text(`Relatório consolidado • Página ${pagina} de ${totalPaginas}`,15,288);
        }

        const pasta = path.join(app.getPath("documents"),"Cautela Demo - Relatórios");
        fs.mkdirSync(pasta,{recursive:true});
        const arquivo = path.join(pasta,`relatorio_cautelas_selecionadas_${Date.now()}.pdf`);
        fs.writeFileSync(arquivo,Buffer.from(pdf.output("arraybuffer")));
        return {arquivo};
    }

    formatarData(valor){
        return valor ? new Date(valor).toLocaleString("pt-BR") : "—";
    }
}

module.exports = new PDFService();
