(async () => {
    const el = id => document.getElementById(id);
    const padrao = window.identidadeVisualPadrao || {brasao:"../assets/demo-logo.svg",corPrimaria:"#168557",corBarra:"#8b7b5d",corTitulos:"#756343",corSecundaria:"#756343",corMenu:"#1d1c18",corFundo:"#f5f6f8"};
    let logo = "";
    const dados = await window.api.configuracao.obter() || {};
    let videoAbertura = dados.videoAbertura || "";
    const campos = {batalhao:"cfgBatalhao",nomeUnidade:"cfgNomeUnidade",orgaoSeguranca:"cfgOrgaoSeguranca",nomeUnidadeRelatorios:"cfgNomeUnidadeRelatorios",cidade:"cfgCidade",estado:"cfgEstado",comandante:"cfgComandante",subcomandante:"cfgSubcomandante",corPrimaria:"cfgCorPrimaria",corBarra:"cfgCorBarra",corTitulos:"cfgCorTitulos",corSecundaria:"cfgCorSecundaria",corMenu:"cfgCorMenu",corFundo:"cfgCorFundo"};
    Object.entries(campos).forEach(([chave,id]) => el(id).value = dados[chave] || padrao[chave] || "");
    logo = dados.brasao || "";
    el("previewCfgLogo").src = logo || padrao.brasao;
    const atualizarVideo = (caminho=videoAbertura,nome="") => {
        videoAbertura = caminho || "";
        const preview = el("previewCfgVideo");
        const nomeArquivo = nome || String(videoAbertura).split(/[\\/]/).pop();
        el("nomeCfgVideo").textContent = videoAbertura ? nomeArquivo : "Nenhum vídeo configurado";
        preview.src = videoAbertura ? encodeURI(`file:///${String(videoAbertura).replaceAll("\\","/")}`) : "";
        preview.classList.toggle("semVideo", !videoAbertura);
    };
    atualizarVideo();
    el("btnEscolherVideo").onclick=async()=>{try{const escolhido=await window.api.configuracao.selecionarVideo();if(escolhido)atualizarVideo(escolhido.caminho,escolhido.nome);}catch(erro){alert(erro.message);}};
    el("btnRemoverVideo").onclick=()=>atualizarVideo("");
    el("cfgArquivoLogo").onchange = evento => { const arquivo=evento.target.files[0]; if(!arquivo)return; if(!["image/png","image/jpeg"].includes(arquivo.type))return alert("Selecione uma imagem PNG ou JPEG."); if(arquivo.size>2*1024*1024)return alert("A imagem deve ter no máximo 2 MB."); const leitor=new FileReader(); leitor.onload=()=>{logo=leitor.result;el("previewCfgLogo").src=logo;}; leitor.readAsDataURL(arquivo); };
    el("btnRestaurarLogo").onclick=()=>{logo="";el("cfgArquivoLogo").value="";el("previewCfgLogo").src=padrao.brasao;};
    el("btnRestaurarTema").onclick=()=>["corPrimaria","corBarra","corTitulos","corSecundaria","corMenu","corFundo"].forEach(chave=>el(campos[chave]).value=padrao[chave]);
    el("btnSalvarConfiguracoes").onclick=async()=>{const botao=el("btnSalvarConfiguracoes"),envio=Object.fromEntries(Object.entries(campos).map(([chave,id])=>[chave,el(id).value.trim()]));envio.brasao=logo;envio.videoAbertura=videoAbertura;if(!envio.batalhao||!envio.nomeUnidade||!envio.orgaoSeguranca||!envio.nomeUnidadeRelatorios)return alert("Informe a sigla, os nomes da unidade e o órgão de segurança pública.");try{botao.disabled=true;await window.api.configuracao.salvar(envio);window.aplicarIdentidadeVisual({...envio,brasao:logo||padrao.brasao});alert("Configurações salvas e aplicadas em todo o sistema.");}catch(erro){alert(erro.message);}finally{botao.disabled=false;}};
})().catch(erro=>alert(erro.message));
