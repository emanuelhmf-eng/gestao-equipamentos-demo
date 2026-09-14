// Lista positiva: bancos, backups, mídia institucional e arquivos locais nunca entram.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'publicacao', `cautela-demo-${Date.now()}`);
fs.mkdirSync(destination, { recursive: true });
const files = ['package.json', 'package-lock.json', 'main.js', 'preload.js', 'database.js', 'README.md', '.gitignore', 'assets/demo-logo.svg'];
for (const directory of ['controllers', 'repositories', 'models', 'services', 'css', 'js', 'telas', 'demo', 'scripts', 'tests', 'assets/config']) {
    const visit = folder => {
        for (const entry of fs.readdirSync(path.join(root, folder), { withFileTypes: true })) {
            const relative = `${folder}/${entry.name}`;
            if (entry.isDirectory()) visit(relative);
            else if (entry.isFile() && /\.(js|css|html|json)$/.test(entry.name)) files.push(relative);
        }
    };
    visit(directory);
}
for (const file of files) {
    const output = path.join(destination, file);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(path.join(root, file), output);
}
console.log(`Pacote público criado: ${destination}\n${files.length} arquivos; nenhum banco de dados incluído.`);
