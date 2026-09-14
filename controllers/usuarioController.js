const bcrypt = require("bcrypt");

const usuarioRepository =
require("../repositories/usuarioRepository");
const historicoRepository = require("../repositories/historicoRepository");
const os = require("os");

class UsuarioController {

    async listar(){

        return await usuarioRepository.listar();

    }
    async buscar(id){

        return await usuarioRepository.buscar(id);

    }

    async pesquisar(texto){

        return await usuarioRepository.pesquisar(texto);

    }

    async salvar(usuario){

        if(!usuario.nome)
            throw new Error("Informe o nome.");

        if(!usuario.matricula)
            throw new Error("Informe a matrícula.");

        if(!usuario.senha)
            throw new Error("Informe a senha.");

        const existe=

        await usuarioRepository.buscarMatricula(

            usuario.matricula

        );

        if(existe){

            throw new Error(

                "Matrícula já cadastrada."

            );

        }

        usuario.senhaHash=

        await bcrypt.hash(

            usuario.senha,

            10

        );

        delete usuario.senha;

        usuario.dataCadastro=

        new Date().toISOString();

        const id = await usuarioRepository.salvar(usuario);
        const sessao = await usuarioRepository.buscarSessao();
        await historicoRepository.registrar({
            cautelaId:null, usuarioId:id, armeiroId:sessao?.usuarioId || null,
            equipamentoId:null, operacao:"CADASTRO_POLICIAL",
            dataHora:usuario.dataCadastro, computador:os.hostname(),
            observacao:`Policial ${usuario.graduacao || ""} ${usuario.nomeGuerra || usuario.nome} cadastrado.`
        });
        return id;

    }

    async editar(usuario) {

        usuario.id =
            Number(usuario.id);

        if (
            !Number.isInteger(usuario.id) ||
            usuario.id <= 0
        ) {

            throw new Error(
                "ID do usuário inválido."
            );

        }

        if (
            !usuario.nome ||
            !String(usuario.nome).trim()
        ) {

            throw new Error(
                "Informe o nome."
            );

        }

        const usuarioAtual =
            await usuarioRepository.buscar(
                usuario.id
            );

        if (!usuarioAtual) {

            throw new Error(
                "Usuário não encontrado."
            );

        }

        usuario.nome =
            String(usuario.nome).trim();

        usuario.nomeGuerra =
            String(usuario.nomeGuerra || "").trim();

        usuario.graduacao =
            String(usuario.graduacao || "").trim();

        usuario.pelotao =
            String(usuario.pelotao || "").trim();

        usuario.funcao =
            String(usuario.funcao || "").trim();

        usuario.telefone =
            String(usuario.telefone || "").trim();

        usuario.email =
            String(usuario.email || "").trim();

        usuario.perfil =
            String(usuario.perfil || "SEM_ACESSO")
                .trim();

        usuario.observacao =
            String(usuario.observacao || "")
                .trim()
                .slice(0, 1000);

        const novaSenha =
            String(usuario.senha || "")
                .trim();

        if (novaSenha.trim()) {

            if (novaSenha.length < 4) {

                throw new Error(
                    "A nova senha deve possuir pelo menos 4 caracteres."
                );

            }

            usuario.senhaHash =
                await bcrypt.hash(
                    novaSenha,
                    10
                );

        } else {

            /*
            Quando o campo estiver vazio,
            o repository manterá a senha atual.
            */

            usuario.senhaHash = null;

        }

        delete usuario.senha;

        const resultado =
            await usuarioRepository.editar(
                usuario
            );

        const camposAlterados = [
            ["nome","Nome"], ["nomeGuerra","Nome de guerra"],
            ["graduacao","Graduação"], ["pelotao","Pelotão"],
            ["funcao","Função"], ["telefone","Telefone"],
            ["email","E-mail"], ["perfil","Perfil"],
            ["observacao","Observação"]
        ].filter(([campo]) =>
            String(usuarioAtual[campo] ?? "") !== String(usuario[campo] ?? "")
        ).map(([,rotulo]) => rotulo);

        const sessao =
            await usuarioRepository.buscarSessao();

        await historicoRepository.registrar({

            cautelaId: null,

            usuarioId:
                usuario.id,

            armeiroId:
                sessao?.usuarioId || null,

            equipamentoId: null,

            operacao:
                usuario.senhaHash
                    ? "ALTERACAO_SENHA_USUARIO"
                    : "EDICAO_POLICIAL",

            dataHora:
                new Date().toISOString(),

            computador:
                os.hostname(),

            observacao:
                usuario.senhaHash
                    ? `Senha do policial ${
                        usuario.graduacao || ""
                    } ${
                        usuario.nomeGuerra ||
                        usuario.nome
                    } alterada.`
                    : `${camposAlterados.length
                        ? `Campos alterados: ${camposAlterados.join(", ")}.`
                        : "Registro salvo sem alteração de dados."} Policial ${
                        usuario.graduacao || ""
                    } ${
                        usuario.nomeGuerra ||
                        usuario.nome
                    } atualizados.`

        });

        return resultado;

    }

    async ativar(id){
        const usuario = await usuarioRepository.buscar(id);
        const resultado = await usuarioRepository.ativar(id);
        const sessao = await usuarioRepository.buscarSessao();
        await historicoRepository.registrar({
            cautelaId:null, usuarioId:Number(id), armeiroId:sessao?.usuarioId || null,
            equipamentoId:null, operacao:"ATIVACAO_POLICIAL",
            dataHora:new Date().toISOString(), computador:os.hostname(),
            observacao:`Policial ${usuario?.graduacao || ""} ${usuario?.nomeGuerra || usuario?.nome || ""} ativado.`
        });
        return resultado;

    }

    async desativar(id){
        const usuario = await usuarioRepository.buscar(id);
        const resultado = await usuarioRepository.desativar(id);
        const sessao = await usuarioRepository.buscarSessao();
        await historicoRepository.registrar({
            cautelaId:null, usuarioId:Number(id), armeiroId:sessao?.usuarioId || null,
            equipamentoId:null, operacao:"DESATIVACAO_POLICIAL",
            dataHora:new Date().toISOString(), computador:os.hostname(),
            observacao:`Policial ${usuario?.graduacao || ""} ${usuario?.nomeGuerra || usuario?.nome || ""} desativado.`
        });
        return resultado;

    }

    async validarSenha(id,senha){

        const usuario=

        await usuarioRepository.buscar(id);

        if(!usuario){

            throw new Error(

                "Usuário não encontrado."

            );

        }

        return await bcrypt.compare(

            senha,

            usuario.senhaHash

        );

    }

    async sessao(){

        return await usuarioRepository.buscarSessao();

    }

    async logout(){

        return await usuarioRepository.encerrarSessao();

    }

    async login(matricula,senha){

        const usuario =

        await usuarioRepository

        .buscarPorMatricula(

            matricula

        );

        if(!usuario){

            return{

                sucesso:false,

                mensagem:"Usuário não encontrado."

            };

        }

        if(!usuario.ativo){

            return{
                sucesso:false,
                mensagem:"Usuário inativo."
            };

        }

        if(usuario.perfil === "SEM_ACESSO"){

            return{
                sucesso:false,
                mensagem:"Este usuário não possui acesso ao sistema."
            };

        }

        const ok =

        await bcrypt.compare(

            senha,

            usuario.senhaHash

        );

        if(!ok){

            return{

                sucesso:false,

                mensagem:"Senha incorreta."

            };

        }

        await usuarioRepository

        .salvarSessao({

            id:usuario.id,

            nome:usuario.nome,

            matricula:usuario.matricula,

            graduacao:usuario.graduacao,

            perfil:usuario.perfil

        });

        return{

            sucesso:true,

            usuario:{

                id:usuario.id,

                nome:usuario.nome,

                matricula:usuario.matricula,

                graduacao:usuario.graduacao,

                perfil:usuario.perfil

            }

        };

    }

}


module.exports =
new UsuarioController();
