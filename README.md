# Dashboard Financeiro Geral

Este projeto é uma landing page em estilo fintech para exibir KPIs financeiros principais de uma empresa.

## Como abrir localmente

Basta abrir o arquivo index.html em um navegador, ou servir a pasta com um servidor simples.

Exemplo:

```bash
python -m http.server 3000
```

Depois acesse: http://localhost:3000

## Conexão com planilha

O dashboard lê dados de um arquivo CSV chamado `data.csv` por padrão.

Também é possível editar os dados diretamente no painel, usando o botão `Editar dados`. O painel permite:

- upload de um arquivo CSV com os dados da planilha;
- importação por URL pública CSV / Google Sheets;
- exportar uma planilha padrão para preencher e importar novamente;
- usar o arquivo `template.csv` que está incluído no projeto.

O conteúdo também pode ser salvo localmente no navegador, então você não precisa fazer GitHub + push para cada alteração.

Para usar o Google Sheets, publique a planilha como CSV e abra a página com o parâmetro `sheet`:

```text
http://localhost:3000/?sheet=https://docs.google.com/spreadsheets/d/SEU_ID/export?format=csv&gid=0
```

## Deploy no Vercel

1. Envie este projeto para o GitHub.
2. Acesse o Vercel e importe o repositório.
3. O deploy será feito automaticamente.
