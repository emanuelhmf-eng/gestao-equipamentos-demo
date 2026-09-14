const bcrypt = require('bcrypt');

module.exports = async function seed(db) {
    const run = (sql, args = []) => new Promise((resolve, reject) => db.run(sql, args, function (e) { e ? reject(e) : resolve(this.lastID); }));
    const get = sql => new Promise((resolve, reject) => db.get(sql, (e, row) => e ? reject(e) : resolve(row)));
    await run('CREATE TABLE IF NOT EXISTS demo_metadata (versao INTEGER)');
    if (await get('SELECT versao FROM demo_metadata LIMIT 1')) return;
    if ((await get('SELECT COUNT(*) AS total FROM usuarios')).total) throw new Error('O banco demonstrativo deve iniciar vazio.');
    const hash = await bcrypt.hash('Demo123!', 10);
    const date = days => new Date(Date.now() + days * 86400000).toISOString();
    await run('BEGIN IMMEDIATE');
    try {
        const names = ['Administrador Demo', 'Operador Aurora', 'Comandante Horizonte', 'Visitante Demo', 'Agente Luar', 'Agente Sol', 'Agente Brisa', 'Agente Nuvem'];
        const profiles = ['ADMINISTRADOR', 'ARMEIRO', 'COMANDANTE', 'CONSULTA'];
        for (let i = 0; i < names.length; i++) {
            await run(`INSERT INTO usuarios (matricula,nome,nomeGuerra,graduacao,pelotao,funcao,email,perfil,senhaHash,ativo,dataCadastro,observacao)
                VALUES (?,?,?,?,?,?,?,?,?,1,?,?)`, [i === 0 ? 'demo' : `DEMO00${i}`, names[i], names[i], i === 2 ? 'CAP' : 'SD', '1º PELOTÃO', 'Demonstração', `demo${i}@example.invalid`, profiles[i] || 'SEM_ACESSO', hash, date(-30), 'Pessoa inteiramente fictícia']);
        }
        const categories = ['RADIO', 'COLETE', 'ARMA_CURTA', 'ARMA_LONGA', 'OUTROS'];
        for (let i = 1; i <= 20; i++) {
            await run(`INSERT INTO equipamentos (categoria,fabricante,modelo,numeroSerie,patrimonio,quantidade,status,localizacao,observacao,dataCadastro)
                VALUES (?,?,?,?,?,1,?,?,?,?)`, [categories[(i - 1) % 5], 'Fabricante fictício', `Modelo Demo ${i}`, `DEMO-SERIE-${i}`, `DEMO-PAT-${i}`, i <= 3 ? 'CAUTELADO' : 'DISPONIVEL', 'Depósito demonstrativo', 'Item fictício, sem vínculo com inventário real', date(-25)]);
        }
        for (let i = 1; i <= 9; i++) {
            const closed = i > 3;
            const type = i === 2 ? 'PERMANENTE' : i === 3 ? 'EXTERNA' : 'TEMPORARIA';
            const id = await run(`INSERT INTO cautelas (usuarioId,armeiroId,dataRetirada,dataPrevista,dataDevolucao,status,tipo,observacao,
                matriculaExterna,nomeCompletoExterno,nomeGuerraExterno,graduacaoExterna,unidadeOrigem,telefoneExterno)
                VALUES (?,2,?,?,?,?,?,?,?,?,?,?,?,?)`, [type === 'EXTERNA' ? null : 5 + i % 4, date(-i), date(i === 1 ? -0.5 : 7), closed ? date(-i + 1) : null, closed ? 'FECHADA' : 'ABERTA', type, 'Cenário fictício para demonstração', type === 'EXTERNA' ? 'EXT-DEMO' : null, 'Agente Estrela (fictício)', 'Estrela Demo', 'SD', 'Unidade Exemplo', '00000000000']);
            await run('INSERT INTO cautela_itens (cautelaId,equipamentoId,quantidade,devolvido,dataDevolucao) VALUES (?,?,1,?,?)', [id, i, closed ? 1 : 0, closed ? date(-i + 1) : null]);
            await run(`INSERT INTO historico (cautelaId,usuarioId,armeiroId,equipamentoId,operacao,dataHora,computador,observacao) VALUES (?,?,2,?,'RETIRADA',?,'DEMO-PC','Registro fictício')`, [id, type === 'EXTERNA' ? null : 5 + i % 4, i, date(-i)]);
            if (closed) await run(`INSERT INTO historico (cautelaId,usuarioId,armeiroId,equipamentoId,operacao,dataHora,computador,observacao) VALUES (?,?,2,?,'DEVOLUCAO',?,'DEMO-PC','Devolução fictícia')`, [id, 5 + i % 4, i, date(-i + 1)]);
        }
        await run(`INSERT INTO policiais_externos (matricula,nomeCompleto,nomeGuerra,graduacao,unidadeOrigem,telefone,email,dataCadastro) VALUES ('EXT-DEMO','Agente Estrela (fictício)','Estrela Demo','SD','Unidade Exemplo','00000000000','externo@example.invalid',?)`, [date(-3)]);
        await run(`UPDATE configuracoes SET batalhao='CAUTELA DEMO',nomeUnidade='Demonstração com dados fictícios',orgaoSeguranca='ORGANIZAÇÃO FICTÍCIA',nomeUnidadeRelatorios='UNIDADE DEMONSTRATIVA — SEM VALIDADE OFICIAL',cidade='Cidade Exemplo',estado='XX',comandante='Comandante Horizonte (fictício)',subcomandante='Subcomandante Demo',brasao='../assets/demo-logo.svg',videoAbertura='' WHERE id=1`);
        await run('INSERT INTO demo_metadata VALUES (1)');
        await run('COMMIT');
    } catch (error) {
        await run('ROLLBACK');
        throw error;
    }
};
