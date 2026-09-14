const db = require("../database");

class UsuarioRepository {

    listar(){

        return new Promise((resolve,reject)=>{

            db.all(

                `
                SELECT u.*,
                    (SELECT h.operacao FROM historico h
                     WHERE h.usuarioId=u.id
                       AND h.operacao IN ('CADASTRO_POLICIAL','EDICAO_POLICIAL','ALTERACAO_SENHA_USUARIO')
                     ORDER BY h.id DESC LIMIT 1) ultimaOperacao

                FROM usuarios u

                ORDER BY graduacao,nome
                `,

                [],

                (erro,linhas)=>{

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(linhas);

                    }

                }

            );

        });

    }

    buscar(id){

        return new Promise((resolve,reject)=>{

            db.get(

                `
                SELECT *

                FROM usuarios

                WHERE id=?
                `,

                [id],

                (erro,linha)=>{

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(linha);

                    }

                }

            );

        });

    }

    buscarMatricula(matricula){

        return new Promise((resolve,reject)=>{

            db.get(

                `
                SELECT *

                FROM usuarios

                WHERE matricula=?
                `,

                [matricula],

                (erro,linha)=>{

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(linha);

                    }

                }

            );

        });

    }

    buscarPorMatricula(matricula){

        return new Promise((resolve,reject)=>{

            db.get(

                `
                SELECT *

                FROM usuarios

                WHERE

                    matricula=?

                    AND

                    ativo=1
                `,

                [

                    matricula

                ],

                (erro,linha)=>{

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(linha);

                    }

                }

            );

        });

    }

    pesquisar(texto){

        return new Promise((resolve,reject)=>{

            db.all(

                `
                SELECT *

                FROM usuarios

                WHERE

                    nome LIKE ?

                    OR

                    matricula LIKE ?

                ORDER BY nome
                `,

                [

                    `%${texto}%`,

                    `%${texto}%`

                ],

                (erro,linhas)=>{

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(linhas);

                    }

                }

            );

        });

    }
    salvar(usuario){

        return new Promise((resolve,reject)=>{

            db.run(

                `

                INSERT INTO usuarios(

                    matricula,

                    nome,

                    nomeGuerra,

                    graduacao,

                    pelotao,

                    funcao,

                    telefone,

                    email,

                    perfil,

                    senhaHash,

                    foto,

                    observacao,

                    ativo,

                    dataCadastro

                )

                VALUES(

                    ?,?,?,?,?,?,?,?,?,?,?,?,?,?

                )

                `,

                [

                    usuario.matricula,

                    usuario.nome,

                    usuario.nomeGuerra,

                    usuario.graduacao,

                    usuario.pelotao,

                    usuario.funcao,

                    usuario.telefone,

                    usuario.email,

                    usuario.perfil,

                    usuario.senhaHash,

                    usuario.foto,

                    usuario.observacao,

                    usuario.ativo ?? 1,

                    usuario.dataCadastro

                ],

                function(erro){

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(this.lastID);

                    }

                }

            );

        });

    }

    editar(usuario) {

        return new Promise((resolve, reject) => {

            db.run(

                `
                UPDATE usuarios

                SET
                    nome = ?,
                    nomeGuerra = ?,
                    graduacao = ?,
                    pelotao = ?,
                    funcao = ?,
                    telefone = ?,
                    email = ?,
                    perfil = ?,
                    foto = ?,
                    observacao = ?,

                    senhaHash =
                        COALESCE(
                            ?,
                            senhaHash
                        )

                WHERE id = ?
                `,

                [

                    usuario.nome,

                    usuario.nomeGuerra,

                    usuario.graduacao,

                    usuario.pelotao,

                    usuario.funcao,

                    usuario.telefone,

                    usuario.email,

                    usuario.perfil,

                    usuario.foto || null,

                    usuario.observacao,

                    usuario.senhaHash || null,

                    Number(usuario.id)

                ],

                function (erro) {

                    if (erro) {

                        reject(erro);
                        return;

                    }

                    if (this.changes === 0) {

                        reject(
                            new Error(
                                "Usuário não encontrado."
                            )
                        );

                        return;

                    }

                    resolve(true);

                }

            );

        });

    }

    ativar(id){

        return new Promise((resolve,reject)=>{

            db.run(

                `
                UPDATE usuarios

                SET ativo=1

                WHERE id=?
                `,

                [id],

                function(erro){

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(true);

                    }

                }

            );

        });

    }

    desativar(id){

        return new Promise((resolve,reject)=>{

            db.run(

                `
                UPDATE usuarios

                SET ativo=0

                WHERE id=?
                `,

                [id],

                function(erro){

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(true);

                    }

                }

            );

        });

    }

    buscarSessao(){

        return new Promise((resolve,reject)=>{

            db.get(

                `
                SELECT *

                FROM sessao

                LIMIT 1
                `,

                [],

                (erro,linha)=>{

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(linha);

                    }

                }

            );

        });

    }

    salvarSessao(usuario){

        return new Promise((resolve,reject)=>{

            db.run(

                `DELETE FROM sessao`,

                [],

                ()=>{

                    db.run(

                        `

                        INSERT INTO sessao(

                            id,

                            usuarioId,

                            nome,

                            graduacao,

                            perfil,

                            dataLogin

                        )

                        VALUES(1,?,?,?,?,?)

                        `,

                        [

                            usuario.id,

                            usuario.nome,

                            usuario.graduacao,

                            usuario.perfil,

                            new Date().toISOString()

                        ],

                        function(erro){

                            if(erro){

                                reject(erro);

                            }else{

                                resolve(true);

                            }

                        }

                    );

                }

            );

        });

    }

    encerrarSessao(){

        return new Promise((resolve,reject)=>{

            db.run("DELETE FROM sessao", [], erro=>{

                if(erro) reject(erro);
                else resolve(true);

            });

        });

    }

    contar(){

        return new Promise((resolve,reject)=>{

            db.get(

                `
                SELECT COUNT(*) total
                FROM usuarios
                WHERE ativo=1
                `,

                [],

                (erro,linha)=>{

                    if(erro){

                        reject(erro);

                    }else{

                        resolve(linha.total);

                    }

                }

            );

        });

    }



}


module.exports =
new UsuarioRepository();
