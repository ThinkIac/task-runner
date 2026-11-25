# Task Runner

Executor externo de tarefas de workspaces npm para Lógos. Migração para [LógosType](https://github.com/ThinkIac/LogosType), preservando a API CommonJS, CLI, grafo, cache e cancelamento. Não é um agendador periódico.

## Instalação

```sh
npm install ThinkIac/task-runner#main
npx logos-tasks --help
```

Para instalações reproduzíveis, substitua `main` por um commit. O pacote mantém o nome `@thinkiac/module-task-runner`. A instalação via Git executa `prepare`, compilando os fontes com o compilador fixado no manifest e lockfile. Artefatos npm incluem `dist/`; executar o pacote compilado não requer o compilador.

Node.js >=18 e npm disponíveis no PATH. O módulo ainda utiliza APIs Node de arquivos, processos, readline e criptografia. Esta migração não implementa um barramento de eventos ou suporte a QuickJS/ESP32.

## Uso

Na raiz do projeto:

```json
{
  "private": true,
  "workspaces": ["packages/*"]
}
```

Crie `logos.tasks.json`:

```json
{
  "version": 1,
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "cache": true
    },
    "test": {
      "dependsOn": [{"task": "build", "optional": true}],
      "cache": false
    },
    "dev": {"persistent": true, "cache": false}
  }
}
```

```sh
npx logos-tasks run build --dry-run
npx logos-tasks run build --filter meu-pacote --concurrency 4
npx logos-tasks run test --no-cache
npx logos-tasks install --ci
```

Integração com o CLI Lógos existente:

```json
{"logos":{"cli":{"tasks":"@thinkiac/module-task-runner/cli.cjs"}}}
```

API JavaScript:

```js
const { findRoot, plan, run } = require('@thinkiac/module-task-runner');
async function build() {
  const root = findRoot();
  const graph = plan(root, ['build'], { filters: ['meu-pacote'] });
  const result = await run(graph, { concurrency: 4, log: console.log });
  console.log(result);
}
build().catch(error => { console.error(error); process.exitCode = 1; });
```

## Fluxo

```text
package.json + logos.tasks.json
  -> descoberta de workspaces
  -> validação e grafo topológico
  -> dependências concluídas
  -> cache válido ou npm run <tarefa>
  -> resultados executed / cached / virtual
```

Falha interrompe o grafo e cancela processos ativos. O cache verifica arquivos existentes; não restaura artefatos.

## Estrutura e validação

- `src/index.type`: API e execução.
- `src/cli.type`: argumentos, comandos e sinais.
- `index.cjs`, `cli.cjs`: entradas de compatibilidade.
- `dist/`: CommonJS gerado no build, não versionado.
- `test/fixtures/original/`: implementação anterior, somente referência de testes.
- [Contratos](docs/contracts.md), [migração e métricas](docs/migration.md).
- [Documentação histórica](docs/original.md): contexto do monorepo, não instruções para esta distribuição.

```sh
npm ci
npm test
npm run test:isolated
```

22 testes locais aprovados: 17 herdados e cinco de comparação, incluindo 272 comparações de configuração/planos, CLI, descoberta, registries e cache compartilhado entre versões. Essa cobertura não prova equivalência para toda entrada possível. CI fornecida para Linux/macOS em Node 18/22. Nenhuma substituição automática é feita em /code/think.

Licença MIT.
