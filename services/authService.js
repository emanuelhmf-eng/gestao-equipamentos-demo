class AuthService {

    podeAcessar(perfil, recurso){

        const permissoes={

            ADMINISTRADOR:[

                "dashboard",

                "usuarios",

                "equipamentos",

                "cautelas",

                "devolucao",

                "historico",

                "relatorios",

                "configuracoes"

            ],

            ARMEIRO:[

                "dashboard",

                "equipamentos",

                "cautelas",

                "devolucao",

                "historico"

            ],

            COMANDANTE:[

                "dashboard",

                "historico",

                "relatorios"

            ],

            CONSULTA:[

                "dashboard",

                "historico"

            ],

            SEM_ACESSO:[]

        };

        if(!permissoes[perfil])
            return false;

        return permissoes[perfil].includes(recurso);

    }

}

module.exports = new AuthService();
