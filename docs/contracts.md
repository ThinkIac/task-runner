# Contratos preservados

## API CommonJS

| Export | Contrato |
| --- | --- |
| DEFAULT_REGISTRY | https://registry.npmjs.org |
| findRoot(start?) | Sobe até um package.json com workspaces; lança erro na raiz sem workspace. |
| discover(root) | Map nome -> {name, dir, manifest}, ordenado por diretório. |
| configuration(root) | Lê logos.tasks.json e valida campos, versão e regras. |
| plan(root, taskNames, {filters}?) | Retorna {root, config, packages, nodes}; não executa scripts. |
| run(graph, options?) | Promise de [{id, status}]; status executed, cached ou virtual. |
| registry(value?) | Valida URL HTTP(S), sem credenciais, query ou fragmento. |
| startProcess(command, args, {cwd, env, log, id}) | Retorna {child, done}; logs prefixados, shell false. |
| killTree(child, signal) | Sinaliza grupo POSIX ou filho direto no Windows; ignora ESRCH. |

run aceita concurrency (inteiro >=1, padrão 4), signal (AbortSignal), log (padrão console.log) e cache (padrão true). Preserva também a distinção entre undefined e null nos padrões da API.

## Descoberta e grafo

workspaces aceita array ou {packages: []}; segmentos literais e * são suportados. **, !, {}, ?, barra invertida, caminhos absolutos e .. são rejeitados. Diretórios ocultos e node_modules são ignorados. Isso preserva a descoberta do executor npm, não é o scanner recursivo de pacotes do kernel Lógos.

Identidade vem de package.json.name; duplicatas falham. Filtros são nomes ou caminhos relativos exatos. O plano usa identidade pacote#tarefa. Regras específicas pacote#tarefa substituem integralmente regras gerais.

dependsOn aceita tarefa local, ^tarefa nas dependências locais (produção/dev/opcionais), pacote#tarefa ou {task, optional}. Scripts ausentes em dependências transitivas podem formar nós virtuais. Ausência em dependência explícita obrigatória falha. Ciclos, tarefas indefinidas e seleção vazia falham antes de executar. Tarefas persistentes não podem ser pré-requisitos.

## Execução e cancelamento

Executa npm run tarefa no diretório do pacote, herdando o ambiente e sem stdin interativo. Respeita a concorrência e a conclusão das dependências. Falha interrompe o grafo. Cancelamento envia TERM e depois KILL (1500 ms) aos processos ativos. Em POSIX usa grupos; no Windows somente o filho direto. Não coordena execuções concorrentes independentes do mesmo workspace.

## Cache

Opt-in por regra (cache: true), exige outputs e não aceita tarefas persistentes. Saídas usam somente diretorio/**; proíbe caminhos inseguros e diretórios reservados. A chave inclui SHA-256 de entradas do workspace, saídas transitivas, identidade/script/configuração, ambiente e versão/plataforma/arquitetura Node.

Exclui node_modules, .git, .turbo, .logos-task-cache e saídas declaradas. Lockfiles são entradas. Symlinks, arquivos especiais, mais de 100000 entradas ou 64 MiB por árvore desabilitam cache, mantendo execução. Hashes do ambiente não expõem valores nos recibos.

O hit exige saídas atuais idênticas ao recibo, com ao menos uma existente. Recibos são gravados por arquivo temporário e rename. Não há restauração nem cache remoto. Entradas externas, rede e relógio exigem --no-cache conforme o projeto.

## CLI

main(argv?, {root}?) retorna Promise de código. Opções: --root, --filter repetível, --concurrency, --dry-run, --no-cache; install aceita somente --root, --ci e --registry. SIGINT retorna 130, SIGTERM 143; erro na entrada executável retorna 1.

install delega ao npm e herda sua configuração. Prioridade de registry: flag > logos.tasks.json.registry > configuração normal do npm. Não altera o registry do ambiente das tarefas, não copia tokens e não resolve logosDependencies do Runtime.
