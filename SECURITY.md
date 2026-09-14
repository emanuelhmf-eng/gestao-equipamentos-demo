# Política de segurança da versão demonstrativa

Este repositório contém uma versão preparada exclusivamente para demonstração e portfólio.

## Dados públicos

Todos os registros iniciais são fictícios. As credenciais de demonstração documentadas no README são intencionalmente públicas e não dão acesso a nenhum serviço externo.

## Conteúdo que não deve ser publicado

Não faça commit de:

- `.demo-data/`;
- bancos SQLite (`*.db`, `*.sqlite`, `*.sqlite3`);
- backups;
- arquivos `.env`;
- chaves, tokens ou credenciais privadas;
- logs locais;
- `node_modules/`;
- mídia ou identidade institucional não autorizada.

O script `npm run demo:export` utiliza uma lista positiva de arquivos e deve ser preferido para gerar material de publicação.

## Aviso

Esta demonstração não representa um sistema oficial e não deve receber dados pessoais, institucionais ou operacionais reais.
