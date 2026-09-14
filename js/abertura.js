(() => {
    const video = document.getElementById("videoAbertura");
    let abriuLogin = false;
    const origem = new URLSearchParams(window.location.search).get("video");

    const abrirLogin = () => {
        if(abriuLogin) return;
        abriuLogin = true;
        window.location.replace("login.html");
    };

    if(!origem){ abrirLogin(); return; }
    video.src = origem;
    video.addEventListener("ended", abrirLogin, {once:true});
    video.addEventListener("error", abrirLogin, {once:true});

    const reproducao = video.play();
    if(reproducao?.catch) reproducao.catch(abrirLogin);

    // Protege a inicialização contra arquivo ausente ou evento de mídia perdido.
    setTimeout(abrirLogin, 6500);
})();
