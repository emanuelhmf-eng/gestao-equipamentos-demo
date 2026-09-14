(() => {
    let usuarios = [], usuariosExternos = [], externoEditando = null;
    let editando = null;
    const campos = ["matricula","nome","nomeGuerra","graduacao","pelotao","funcao","telefone","email","perfil","observacao"];
    const el = id => document.getElementById(id);
    const seguro = valor => String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    })[caractere]);
    const nomePerfil = perfil => perfil === "SEM_ACESSO" ? "SEM ACESSO" : perfil;

    async function iniciar(){
        const rolagemPoliciais=document.querySelector(".listagemUsuarios:not(.listagemUsuariosExternos) .tabelaUsuariosResponsiva");
        const rolagemExternos=document.querySelector(".listagemUsuariosExternos .tabelaUsuariosResponsiva");
        if(rolagemPoliciais){rolagemPoliciais.tabIndex=0;rolagemPoliciais.setAttribute("aria-label","Tabela de policiais cadastrados com rolagem própria");}
        if(rolagemExternos){rolagemExternos.tabIndex=0;rolagemExternos.setAttribute("aria-label","Tabela de policiais de outras unidades com rolagem própria");}
        el("btnSalvarUsuario").onclick = salvar;
        el("btnNovoUsuario").onclick = abrirNovoUsuario;
        el("btnCancelarUsuario").onclick = fecharModalUsuario;
        el("btnFecharUsuario").onclick = fecharModalUsuario;
        el("modalUsuario").onclick = evento => {
            if(evento.target === el("modalUsuario")) fecharModalUsuario();
        };
        el("pesquisaUsuario").oninput = filtrar;
        el("pesquisaUsuarioExterno").oninput = filtrarExternos;
        el("fecharUsuarioExterno").onclick = fecharExterno;
        el("cancelarUsuarioExterno").onclick = fecharExterno;
        el("salvarUsuarioExterno").onclick = salvarExterno;
        await carregar();
    }

    async function carregar(){
        [usuarios,usuariosExternos] = await Promise.all([window.api.usuario.listar(),window.api.policialExterno.listar()]);
        el("totalUsuarios").innerHTML = `<i class="fa-solid fa-users"></i> ${usuarios.length} ${usuarios.length === 1 ? "policial" : "policiais"}`;
        desenhar(usuarios);
        desenharExternos(usuariosExternos);
    }

    function desenharExternos(lista){
        el("tabelaUsuariosExternos").innerHTML=lista.map(usuario=>`<tr><td><div class="identidadeUsuarioTabela"><span class="avatarUsuarioTabela">${seguro((usuario.nomeGuerra||usuario.nomeCompleto||"?").slice(0,2).toUpperCase())}</span><div><strong>${seguro(usuario.nomeGuerra)}</strong><small>${seguro(usuario.nomeCompleto)}</small></div></div></td><td>${seguro(usuario.matricula)}</td><td>${seguro(usuario.graduacao)||"—"}</td><td>${seguro(usuario.unidadeOrigem)||"—"}</td><td><div class="dadosAgrupadosUsuario"><strong>${seguro(usuario.telefone)||"Sem telefone"}</strong><small>${seguro(usuario.email)||"E-mail não informado"}</small></div></td><td><button class="btnEditarUsuario" data-editar-externo="${usuario.id}" type="button"><i class="fa-solid fa-pen"></i> Editar</button></td></tr>`).join("")||"<tr><td colspan='6' class='estadoVazioUsuarios'><strong>Nenhum policial externo cadastrado</strong></td></tr>";
        el("tabelaUsuariosExternos").querySelectorAll("[data-editar-externo]").forEach(b=>b.onclick=()=>abrirEdicaoExterno(Number(b.dataset.editarExterno)));
    }
    function filtrarExternos(){const termo=el("pesquisaUsuarioExterno").value.toLowerCase().trim();desenharExternos(usuariosExternos.filter(u=>[u.matricula,u.nomeCompleto,u.nomeGuerra,u.graduacao,u.unidadeOrigem,u.telefone,u.email].some(v=>String(v||"").toLowerCase().includes(termo))));}
    function abrirEdicaoExterno(id){const u=usuariosExternos.find(item=>item.id===id);if(!u)return;externoEditando=id;el("externoEditarMatricula").value=u.matricula||"";el("externoEditarNomeCompleto").value=u.nomeCompleto||"";el("externoEditarNomeGuerra").value=u.nomeGuerra||"";el("externoEditarGraduacao").value=u.graduacao||"";el("externoEditarUnidade").value=u.unidadeOrigem||"";el("externoEditarTelefone").value=u.telefone||"";el("externoEditarEmail").value=u.email||"";el("modalUsuarioExterno").classList.remove("oculto");}
    function fecharExterno(){externoEditando=null;el("modalUsuarioExterno").classList.add("oculto");}
    async function salvarExterno(){if(!externoEditando)return;const dados={id:externoEditando,nomeCompleto:el("externoEditarNomeCompleto").value.trim(),nomeGuerra:el("externoEditarNomeGuerra").value.trim(),graduacao:el("externoEditarGraduacao").value.trim(),unidadeOrigem:el("externoEditarUnidade").value.trim(),telefone:el("externoEditarTelefone").value.trim(),email:el("externoEditarEmail").value.trim()};if(!dados.nomeCompleto||!dados.nomeGuerra||!dados.graduacao||!dados.unidadeOrigem||!dados.telefone)return alert("Preencha todos os campos obrigatórios.");try{el("salvarUsuarioExterno").disabled=true;await window.api.policialExterno.editar(dados);fecharExterno();await carregar();alert("Policial externo atualizado.");}catch(e){alert(e.message);}finally{el("salvarUsuarioExterno").disabled=false;}}

    function iniciais(usuario){
        const nome = usuario.nomeGuerra || usuario.nome || "?";
        return nome.split(/\s+/).slice(0,2).map(parte => parte[0]).join("").toUpperCase();
    }

    function desenhar(lista){
        el("tabelaUsuarios").innerHTML = lista.map(usuario => `<tr>
            <td><div class="identidadeUsuarioTabela"><span class="avatarUsuarioTabela">${seguro(iniciais(usuario))}</span><div><strong>${seguro(usuario.nomeGuerra || usuario.nome)}</strong><small>${seguro(usuario.nomeGuerra ? usuario.nome : "")}</small><span class="matriculaUsuario">${seguro(usuario.matricula)}</span></div></div></td>
            <td>${seguro(usuario.graduacao) || "—"}</td>
            <td><div class="dadosAgrupadosUsuario"><strong>${seguro(usuario.pelotao) || "Sem pelotão"}</strong><small>${seguro(usuario.funcao) || "Função não informada"}</small></div></td>
            <td><div class="dadosAgrupadosUsuario"><strong>${seguro(usuario.telefone) || "Sem telefone"}</strong><small>${seguro(usuario.email) || "E-mail não informado"}</small></div></td>
            <td><span class="perfilUsuario perfil${seguro(usuario.perfil)}">${seguro(nomePerfil(usuario.perfil))}</span></td>
            <td><span class="statusUsuario ${usuario.ativo ? "usuarioAtivo" : "usuarioInativo"}"><i class="fa-solid fa-circle"></i>${usuario.ativo ? "Ativo" : "Inativo"}</span></td>
            <td><button class="btnEditarUsuario" data-editar="${usuario.id}" type="button"><i class="fa-solid fa-pen"></i> Editar</button></td>
        </tr>`).join("") || "<tr><td colspan='7' class='estadoVazioUsuarios'><i class='fa-solid fa-user-slash'></i><strong>Nenhum policial encontrado</strong><span>Ajuste a pesquisa ou cadastre um novo policial.</span></td></tr>";
        el("tabelaUsuarios").querySelectorAll("[data-editar]").forEach(botao => {
            botao.onclick = () => editar(Number(botao.dataset.editar));
        });
    }

    function filtrar(){
        const termo = el("pesquisaUsuario").value.toLowerCase().trim();
        desenhar(usuarios.filter(usuario => [usuario.nome,usuario.nomeGuerra,usuario.matricula,usuario.graduacao,usuario.pelotao,usuario.funcao]
            .some(valor => String(valor ?? "").toLowerCase().includes(termo))));
    }

    function abrirNovoUsuario(){
        limpar();
        el("modalUsuario").classList.remove("oculto");
        setTimeout(() => el("matricula").focus(),0);
    }

    function fecharModalUsuario(){
        el("modalUsuario").classList.add("oculto");
        limpar();
    }

    function editar(id){
        const usuario = usuarios.find(item => item.id === id);
        if(!usuario) return;
        editando = id;
        campos.forEach(campo => el(campo).value = usuario[campo] ?? "");
        el("matricula").disabled = true;
        el("senha").value = "";
        el("senha").placeholder ="Deixe vazio para manter a senha atual";
        el("tituloFormUsuario").textContent = "Editar policial";
        el("btnSalvarUsuario").innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar alterações';
        el("btnCancelarUsuario").innerHTML = '<i class="fa-solid fa-xmark"></i> Cancelar edição';
        el("modalUsuario").classList.remove("oculto");
    }

    function limpar(){
        editando = null;
        campos.forEach(campo => el(campo).value = "");
        el("perfil").selectedIndex = 0;
        el("senha").value = "";
        el("senha").placeholder = "Defina uma senha";
        el("matricula").disabled = false;
        el("tituloFormUsuario").textContent = "Cadastrar novo policial";
        el("btnSalvarUsuario").innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar policial';
        el("btnCancelarUsuario").innerHTML = '<i class="fa-solid fa-xmark"></i> Cancelar';
    }

    async function salvar(){
        const botao = el("btnSalvarUsuario");
        try{
            const dados = Object.fromEntries(campos.map(campo => [campo,el(campo).value.trim()]));
            dados.senha = el("senha").value;
            botao.disabled = true;
            if(editando){
                dados.id = editando;
                await window.api.usuario.editar(dados);
            }else{
                await window.api.usuario.salvar(dados);
            }
            alert(editando ? "Usuário atualizado." : "Usuário salvo.");
            fecharModalUsuario();
            await carregar();
        }catch(erro){
            alert(erro.message);
        }finally{
            botao.disabled = false;
        }
    }

    iniciar().catch(erro => alert(erro.message));
})();
