let devolucoes=[];

document.addEventListener(

"DOMContentLoaded",

carregar

);

async function carregar(){

devolucoes=

await window.api.cautela.abertas();

atualizar();

}

function atualizar(){

let html="";

devolucoes.forEach(item=>{

html+=`

<tr>

<td>

${item.graduacao} ${item.nome}

</td>

<td>

${item.modelo}

</td>

<td>

${item.patrimonio}

</td>

<td>

<button

onclick="receber(${item.id},${item.equipamentoId})">

Receber

</button>

</td>

</tr>

`;

});

document

.getElementById(

"listaDevolucao"

)

.innerHTML=html;

}

async function receber(id,equipamentoId){

if(

!confirm(

"Confirmar devolução?"

)

)

return;

await window.api.cautela.devolver({

id,

equipamentoId

});

carregar();

}