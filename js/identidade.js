(() => {
    const PADRAO = {
        batalhao:"CAUTELA DEMO",
        nomeUnidade:"Demonstra??o com dados fict?cios",
        orgaoSeguranca:"ORGANIZA??O FICT?CIA",
        nomeUnidadeRelatorios:"UNIDADE DEMONSTRATIVA ? SEM VALIDADE OFICIAL",
        brasao:"../assets/demo-logo.svg",
        corPrimaria:"#168557",
        corBarra:"#8b7b5d",
        corTitulos:"#756343",
        corSecundaria:"#756343",
        corMenu:"#1d1c18",
        corFundo:"#f5f6f8"
    };

    const valorCor = (valor,padrao) => /^#[0-9a-f]{6}$/i.test(String(valor || "")) ? valor : padrao;
    const normalizar = dados => ({
        ...PADRAO,
        ...(dados || {}),
        brasao:dados?.brasao || PADRAO.brasao,
        nomeUnidade:dados?.nomeUnidade || PADRAO.nomeUnidade,
        orgaoSeguranca:dados?.orgaoSeguranca || PADRAO.orgaoSeguranca,
        nomeUnidadeRelatorios:dados?.nomeUnidadeRelatorios || PADRAO.nomeUnidadeRelatorios
    });

    function aplicar(dados){
        const identidade = normalizar(dados);
        window.identidadeSistema = identidade;
        const raiz = document.documentElement;
        raiz.style.setProperty("--verde",valorCor(identidade.corPrimaria,PADRAO.corPrimaria));
        raiz.style.setProperty("--cor-barra",valorCor(identidade.corBarra,PADRAO.corBarra));
        raiz.style.setProperty("--cor-titulos",valorCor(identidade.corTitulos,PADRAO.corTitulos));
        raiz.style.setProperty("--verde-escuro",valorCor(identidade.corPrimaria,PADRAO.corPrimaria));
        raiz.style.setProperty("--caqui-escuro",valorCor(identidade.corSecundaria,PADRAO.corSecundaria));
        raiz.style.setProperty("--caqui",valorCor(identidade.corSecundaria,PADRAO.corSecundaria));
        raiz.style.setProperty("--grafite",valorCor(identidade.corMenu,PADRAO.corMenu));
        raiz.style.setProperty("--grafite-2",valorCor(identidade.corMenu,PADRAO.corMenu));
        raiz.style.setProperty("--fundo",valorCor(identidade.corFundo,PADRAO.corFundo));
        document.querySelectorAll("[data-logo-sistema],#logoSistema,.login-logo").forEach(img => img.src=identidade.brasao);
        document.querySelectorAll("[data-sigla-sistema],.login-box h1").forEach(campo => campo.textContent=identidade.batalhao || PADRAO.batalhao);
        document.querySelectorAll("[data-unidade-sistema]").forEach(campo => campo.textContent=identidade.nomeUnidade);
        return identidade;
    }

    async function carregar(forcar=false){
        if(window.identidadeSistema && !forcar) return aplicar(window.identidadeSistema);
        try { return aplicar(await window.api.configuracao.obter()); }
        catch(erro){ console.error("Não foi possível carregar a identidade visual:",erro); return aplicar(PADRAO); }
    }

    window.aplicarIdentidadeVisual = aplicar;
    window.carregarIdentidadeVisual = carregar;
    window.identidadeVisualPadrao = PADRAO;
    window.addEventListener("DOMContentLoaded",()=>carregar());
})();
