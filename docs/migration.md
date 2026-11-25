# Migração para LógosType

Somente migração de linguagem e distribuição. Nenhuma capacidade nova, alteração de configuração ou troca automática no Runtime.

API, nome npm, bin logos-tasks e entrada cli.cjs preservados. Os dois arquivos de implementação viram src/index.type e src/cli.type; entradas CommonJS delegam para dist. O compilador é dependência de desenvolvimento fixada por commit. Build e instalação Git usam prepare.

Continuam dependências de Node e npm. Sem portabilidade embarcada nesta etapa. Nenhum @register module foi inventado: este pacote preserva o contrato de biblioteca e extensão CLI que já possuía.

## Evidência e limites

17 testes herdados passaram antes da conversão e depois; o teste de registry substitui somente a leitura da .npmrc do monorepo por uma fixture equivalente. Cinco testes diferenciais adicionais comparam API/registry, descoberta, planos/diagnósticos (272 comparações), CLI e recibos de cache cruzados. Instalação isolada testa API, CLI e uma tarefa npm real sem compilador instalado no consumidor.

As cópias CommonJS em test/fixtures/original são somente oráculos de comparação, não código de execução. Cobertura de compatibilidade não demonstra equivalência universal. CI remota e aceite pelo Runtime são verificações separadas.

## Métrica de fontes

Contagem de caracteres Unicode, incluindo espaços, comentários e quebras de linha. Original: index.cjs + cli.cjs. Migrado: src/*.type. Não inclui documentação, testes, scripts de build ou JS gerado.

| Medida | Caracteres |
| --- | ---: |
| Original .cjs | 18.484 |
| Fontes .type | 17.427 |
| Entradas de compatibilidade .cjs | 324 |

Economia nos fontes: **1.057 caracteres (5,72%)**. Incluindo entradas de compatibilidade: **733 caracteres (3,97%)**. Não mede tamanho instalado, desempenho ou memória.

## Proveniência dos originais

- `index.cjs`: SHA-256 `6804af893519688ef5ed729f0b51c8556b1d2d5ed6092bb326629afd01ae1713`.
- `cli.cjs`: SHA-256 `97fa6169849ec0f39fb728d76973ba42588481676e553f51377be6d1916f8e13`.
