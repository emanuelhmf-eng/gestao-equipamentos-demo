const { test } = require('node:test');
const assert = require('node:assert/strict');
const sqlite = require('sqlite3');
const bcrypt = require('bcrypt');
const fs = require('fs');
const vm = require('vm');
const seed = require('../demo/seed');

test('base fictícia consistente, login válido e carga idempotente', async () => {
    // Executa o esquema real em memória, sem ler ou alterar bancos locais.
    const source = fs.readFileSync(require.resolve('../database'), 'utf8');
    const db = new sqlite.Database(':memory:');
    const schema = source.slice(source.indexOf('db.serialize'), source.indexOf('db.ready'));
    vm.runInNewContext(schema, { db, console });
    const get = sql => new Promise((resolve, reject) => db.get(sql, (e, r) => e ? reject(e) : resolve(r)));
    try {
        await get('SELECT 1');
        await seed(db);
        assert.equal((await get('SELECT COUNT(*) n FROM usuarios')).n, 8);
        assert.equal((await get('SELECT COUNT(*) n FROM equipamentos')).n, 20);
        assert.equal((await get('SELECT COUNT(*) n FROM cautelas')).n, 9);
        const admin = await get("SELECT * FROM usuarios WHERE matricula='demo'");
        assert.equal(await bcrypt.compare('Demo123!', admin.senhaHash), true);
        assert.equal((await get(`SELECT COUNT(*) n FROM cautela_itens i JOIN cautelas c ON c.id=i.cautelaId JOIN equipamentos e ON e.id=i.equipamentoId WHERE (c.status='ABERTA' AND (i.devolvido<>0 OR e.status<>'CAUTELADO')) OR (c.status='FECHADA' AND i.devolvido<>1)`)).n, 0);
        await new Promise((resolve, reject) => db.run("UPDATE usuarios SET nome='Alteração demonstrativa' WHERE id=1", e => e ? reject(e) : resolve()));
        await seed(db);
        assert.equal((await get('SELECT COUNT(*) n FROM usuarios')).n, 8);
        assert.equal((await get('SELECT nome FROM usuarios WHERE id=1')).nome, 'Alteração demonstrativa');
        assert.equal((await get('PRAGMA integrity_check')).integrity_check, 'ok');
    } finally { await new Promise(resolve => db.close(resolve)); }
});
