/****************************************************************
PAGE LOADER
****************************************************************/

class PageLoader {

    static async carregar(nome){

        const resposta = await fetch(

            `paginas/${nome}.html`,
            {cache:"no-store"}

        );

        if(!resposta.ok){

            throw new Error(

                `Página ${nome} não encontrada.`

            );

        }

        return await resposta.text();

    }

}
