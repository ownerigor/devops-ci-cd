# Do Git ao deploy: entendendo DevOps na prática

Repositório direcionado a execução de demonstração sobre um ciclo inteiro de DevOps utilizando a API REST `devops-tasks-api` para deploy. O objetivo é acompanhar uma alteração desde o código até a publicação usando Git, GitHub, testes, GitHub Actions e Docker.

As tarefas ficam em memória: reiniciar o processo apaga os dados. Instâncias diferentes não compartilham tarefas. A API é didática, sem autenticação; use somente dados de demonstração.

## Requisitos

- Node.js **24.19.0** e npm **11.17.0**.
- Git, GitHub CLI autenticado e Docker Desktop com engine Linux em execução.
- Conta GitHub para executar os workflows após conectar um repositório remoto.

```bash
node --version
npm --version
git --version
gh --version
gh auth status
docker version
```

## Executando localmente

```bash
npm install
npm start
```

Abra `http://localhost:3000/health`. Resposta esperada:

```json
{"status":"ok","application":"devops-tasks-api"}
```

O servidor escuta em `0.0.0.0`, porta `3000` por padrão. Para outra porta no PowerShell:

```powershell
$env:PORT = '3001'
npm start
```

Use `npm run dev` para reiniciar automaticamente ao salvar alterações e `Ctrl+C` para parar. Em instalações reproduzíveis e no CI, use `npm ci`, que respeita o `package-lock.json`.

## Endpoints

| Método | Rota | Resultado |
| --- | --- | --- |
| GET | `/health` | Saúde e nome da aplicação (200) |
| GET | `/tasks` | Lista de tarefas (200) |
| GET | `/tasks/:id` | Uma tarefa (200 ou 404) |
| POST | `/tasks` | Cria uma tarefa (201 e cabeçalho Location) |
| PUT | `/tasks/:id` | Substitui título e estado (200 ou 404) |
| DELETE | `/tasks/:id` | Exclui uma tarefa (204 ou 404) |

POST exige `title` e aceita `completed` (padrão `false`). PUT exige os dois campos. Títulos devem ter entre 1 e 200 caracteres e não podem conter somente espaços. Tipos inválidos, campos extras e IDs inválidos retornam 400.

### Demonstração no PowerShell

```powershell
Invoke-RestMethod http://localhost:3000/health
Invoke-RestMethod -Method Post -Uri http://localhost:3000/tasks -ContentType 'application/json' -Body '{"title":"Estudar DevOps"}'
Invoke-RestMethod http://localhost:3000/tasks
Invoke-RestMethod http://localhost:3000/tasks/1
Invoke-RestMethod -Method Put -Uri http://localhost:3000/tasks/1 -ContentType 'application/json' -Body '{"title":"Estudar DevOps","completed":true}'
Invoke-RestMethod -Method Delete -Uri http://localhost:3000/tasks/1
```

## Executando os testes

### Postman

Importe `postman/devops-tasks-api.postman_collection.json` no Postman. Inicie a API com `npm start` e execute a collection na ordem pelo **Collection Runner**.

A variável `baseUrl` começa em `http://localhost:3000` e pode ser alterada para a URL pública da API, sem barra final. A criação salva `taskId` automaticamente para consulta, atualização e exclusão. Para usar requisições individualmente, execute primeiro **Criar tarefa e salvar ID**.

A collection contém os seis endpoints, verificações das respostas e cenários de erro (400 e 404). O fluxo completo exclui a tarefa criada ao final e pode ser repetido sem depender de uma lista inicialmente vazia.

### Testes automatizados com Node.js

```bash
npm test
```

Usamos `node:test`, `node:assert/strict` e `Fastify.inject`: os testes não precisam abrir uma porta. Há cobertura de saúde, listagem, criação, consulta, atualização, exclusão, validação e tarefas ausentes. Cada teste usa uma instância isolada.

## Executando com Docker

Pare a aplicação local para liberar a porta 3000.

```bash
docker build -t devops-tasks-api .
docker run --rm -p 3000:3000 devops-tasks-api
```

Em outro terminal:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

A imagem oficial `node:24.19.0-alpine` usa npm 11.17.0, instala dependências com `npm ci --omit=dev` e executa como usuário `node`. O comando de início é `npm start`.

Se o PowerShell não encontrar `docker`, reabra o terminal após a instalação. Nesta máquina o executável foi localizado em `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe`. Para disponibilizá-lo apenas na sessão atual:

```powershell
$env:Path += ";$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin"
docker version
```

## Estrutura e responsabilidade dos arquivos

```text
devops-tasks-api/               # conteúdo na raiz deste diretório de trabalho
├── src/
│   ├── app.js                 # instancia Fastify e registra saúde e rotas
│   ├── server.js              # abre porta e trata encerramento
│   └── routes/
│       └── tasks.js           # CRUD, validação e armazenamento em memória
├── test/
│   └── tasks.test.js          # testes automatizados
├── .github/workflows/
│   ├── ci.yml                # dependências, testes e build Docker
│   └── deploy.yml            # CD no runner Windows após CI aprovado
├── scripts/
│   ├── deploy-local.ps1      # build, substituição do contêiner e teste de saúde
│   └── start-runner.ps1      # inicia o runner na máquina local
├── postman/
│   └── devops-tasks-api.postman_collection.json
├── .dockerignore             # exclui arquivos desnecessários do contexto Docker
├── .gitignore                # exclui dependências, logs e arquivos de ambiente
├── .nvmrc                    # versão do Node para gerenciadores compatíveis
├── Dockerfile                # receita da imagem de produção
├── package.json              # metadados, versões, scripts e dependências
├── package-lock.json         # versões exatas da árvore de dependências
└── README.md                 # como executar o projeto
```

Não há compilação de JavaScript: o **build** demonstrado é a construção da imagem Docker.

## Fluxo DevOps

```text
Desenvolvedor
     │
     │ git push
     ▼
   GitHub
     │
     ▼
GitHub Actions
     │
     ├── Instala dependências
     ├── Executa testes
     ├── Gera imagem Docker
     │
     ▼
   Runner Windows → Docker local
     │
     ▼
Aplicação no ar em localhost:3000
```

- **Git:** controle de versão e histórico das alterações.
- **GitHub:** repositório remoto e colaboração.
- **CI (Continuous Integration):** valida automaticamente cada alteração.
- **CD (Continuous Deployment):** publica automaticamente uma alteração aprovada no Docker da máquina local.
- **Docker:** empacota aplicação e ambiente para execução consistente.

### CI: `.github/workflows/ci.yml`

Executa em `push` na `main` e em `pull_request` com destino à `main`:

```text
Checkout → Configurar Node → Configurar npm → npm ci → Testes → Build Docker → CI aprovado ✅
```

Uma etapa que falha impede as seguintes. Esse workflow não publica a aplicação nem envia a imagem a um registry.

### CD: `.github/workflows/deploy.yml`

O evento `workflow_run` aguarda o término do workflow chamado `CI`. O job só executa se o resultado for `success`, a origem for `push` na `main` e o repositório de origem for o próprio repositório. Um CI de pull request não dispara a preparação de entrega. CI vermelho deixa o job de CD ignorado.

O checkout usa `head_sha` do CI, garantindo o mesmo commit validado. O workflow precisa estar na branch padrão do GitHub (`main`). O CI executa na infraestrutura do GitHub; o CD executa no runner Windows com o rótulo `etec-local`, na máquina da apresentação na ETEC de Fernandópolis.

## Deploy na máquina local

O runner `etec-fernandopolis-local` está instalado em `C:\Users\igorq\actions-runner-etec`, fora do repositório e do OneDrive. O CD executa `scripts/deploy-local.ps1`, que:

1. Verifica o Docker e constrói `devops-tasks-api:<SHA do commit aprovado>`.
2. Para e remove somente o contêiner `devops-tasks-api`, se existir.
3. Inicia a nova versão na porta `127.0.0.1:3000`, com reinício automático pelo Docker.
4. Consulta `/health` com tentativas limitadas e falha o job se a API não estiver saudável.

O CI valida o build na nuvem; o CD reconstrói localmente o mesmo commit. Não há registry ou hospedagem externa. Nenhum secret adicional de deploy é necessário: a autenticação do runner fica na instalação local, e o checkout usa o token automático do GitHub com leitura do conteúdo. Nunca copie a pasta do runner para o repositório.

O build ocorre antes de parar a versão anterior. A troca tem uma breve indisponibilidade e apaga as tarefas em memória. Não há rollback automático se a nova versão falhar ao iniciar. O script não encerra processos Node que ocupem a porta: pare qualquer `npm start` local antes do deploy.

### Antes da apresentação

1. Abra o Docker Desktop e aguarde o engine Linux ficar pronto.
2. Mantenha o Windows ligado, conectado à internet e sem suspensão durante a apresentação.
3. Confira em **Settings → Actions → Runners** se `etec-fernandopolis-local` está **Idle** (online). A instalação inicial foi iniciada em segundo plano. Após reiniciar o Windows, se estiver offline, execute na raiz do projeto:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-runner.ps1
```

Mantenha esse terminal aberto; `Ctrl+C` encerra o runner. Ele não foi instalado como serviço nem configurado para iniciar com o Windows. Não inicie uma segunda instância se já estiver online. Logs da inicialização em segundo plano ficam em `C:\Users\igorq\actions-runner-etec\runner-output.log`; os logs detalhados ficam em `_diag` nessa instalação.

4. Faça commit e push e acompanhe **CI → CD — deploy local** na aba Actions.
5. No Postman, mantenha `baseUrl` em `http://localhost:3000` e rode a collection.

```powershell
docker ps
docker logs devops-tasks-api
Invoke-RestMethod http://localhost:3000/health
```

Runner offline deixa o CD aguardando; Docker parado faz o job falhar. Depois de corrigir, use **Re-run failed jobs** na execução do CD. A API continua funcionando sem o runner enquanto o Docker e o contêiner estiverem ativos.

O repositório é privado. O runner executa código com as permissões do usuário Windows; mantenha o acesso ao repositório restrito a colaboradores confiáveis. O CD não executa para pull requests.

## Git e GitHub

O Git local foi preservado e a branch principal configurada como `main`. O repositório remoto deste projeto é [ownerigor/devops-ci-cd](https://github.com/ownerigor/devops-ci-cd).

Para conferir o repositório conectado:

```bash
git status
git remote -v
gh repo view
```

Para enviar novas alterações:

```bash
git add .
git commit -m "Atualiza API didática"
git push -u origin main
```

A branch padrão é `main`. Acompanhe a execução após cada push na aba [Actions](https://github.com/ownerigor/devops-ci-cd/actions); os workflows locais não representam uma execução na nuvem.
