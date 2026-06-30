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

Para usar o Google Sheets, publique a planilha como CSV e abra a página com o parâmetro `sheet`:

```text
http://localhost:3000/?sheet=https://docs.google.com/spreadsheets/d/SEU_ID/export?format=csv&gid=0
```

## Deploy no Vercel

1. Envie este projeto para o GitHub.
2. Acesse o Vercel e importe o repositório.
3. O deploy será feito automaticamente.
