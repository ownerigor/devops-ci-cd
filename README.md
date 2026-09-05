# Do Git ao deploy: entendendo DevOps na prática

API REST `devops-tasks-api` para uma palestra na ETEC. O objetivo é acompanhar uma alteração desde o código até a publicação usando Git, GitHub, testes, GitHub Actions e Docker.

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
│   └── deploy.yml            # preparação do CD após CI aprovado
├── .dockerignore             # exclui arquivos desnecessários do contexto Docker
├── .gitignore                # exclui dependências, logs e arquivos de ambiente
├── .nvmrc                    # versão do Node para gerenciadores compatíveis
├── Dockerfile                # receita da imagem de produção
├── package.json              # metadados, versões, scripts e dependências
├── package-lock.json         # versões exatas da árvore de dependências
└── README.md                 # roteiro da palestra e instruções
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
   Deploy (integração pendente da escolha de hospedagem)
     │
     ▼
Aplicação no ar
```

- **Git:** controle de versão e histórico das alterações.
- **GitHub:** repositório remoto e colaboração.
- **CI (Continuous Integration):** valida automaticamente cada alteração.
- **CD (Continuous Deployment):** publica automaticamente uma alteração aprovada quando houver integração com a hospedagem.
- **Docker:** empacota aplicação e ambiente para execução consistente.

### CI: `.github/workflows/ci.yml`

Executa em `push` na `main` e em `pull_request` com destino à `main`:

```text
Checkout → Configurar Node → Configurar npm → npm ci → Testes → Build Docker → CI aprovado ✅
```

Uma etapa que falha impede as seguintes. Esse workflow não publica a aplicação nem envia a imagem a um registry.

### CD: `.github/workflows/deploy.yml`

O evento `workflow_run` aguarda o término do workflow chamado `CI`. O job só executa se o resultado for `success`, a origem for `push` na `main` e o repositório de origem for o próprio repositório. Um CI de pull request não dispara a preparação de entrega. CI vermelho deixa o job de CD ignorado.

O checkout usa `head_sha` do CI, garantindo o mesmo commit validado. O workflow precisa estar na branch padrão do GitHub (`main`). Hoje ele apenas apresenta um aviso e um resumo de **integração pendente**; um resultado verde nesse job não significa deploy realizado.

## O que falta para publicar

Nenhuma hospedagem foi identificada no diretório. Nenhum serviço pago foi criado. Precisamos definir:

1. Plataforma (Render, Railway, Fly.io, VPS com Docker ou outra) e aplicação/serviço de destino.
2. Forma de entrega: imagem em registry ou build pela plataforma, sempre do commit aprovado.
3. Credenciais específicas dessa integração em **Settings → Secrets and variables → Actions**. Atualmente nenhum secret de deploy é necessário; os nomes exatos serão definidos com a plataforma. Tokens, chaves SSH e senhas nunca devem entrar nos arquivos.
4. Comando de publicação no `deploy.yml` e URL pública para verificar `/health`, com tentativas limitadas enquanto a aplicação inicia.
5. Caso a plataforma tenha deploy automático a cada push, desativá-lo ou condicioná-lo ao CI para impedir publicação quando os testes falharem.

A demonstração completa de deploy depende dessas configurações. Até lá é possível demonstrar API, Git, testes, CI e Docker.

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

## Roteiro da palestra: verde → vermelho → verde

1. Execute `npm test`, inicie a aplicação e mostre `/health`. Após conectar o remoto, faça push e abra a aba **Actions**. Mostre as etapas do CI e, quando a hospedagem estiver integrada, a API pública.
2. Em `src/app.js`, troque somente `status: 'ok'` por `status: 'quebrado'`. Mantenha o teste intacto. Execute `npm test`: o teste de saúde deve falhar.
3. Faça commit dessa alteração e push na `main` do repositório didático. Mostre CI vermelho, build ignorado e job de CD ignorado. Uma implantação anterior pode continuar no ar; o commit quebrado não é publicado.
4. Restaure `status: 'ok'`, rode `npm test`, faça novo commit e push. Mostre CI verde e CD liberado.

Se a branch estiver protegida, use uma branch de demonstração e pull request: a falha aparecerá no CI do PR e o CD só poderá executar após uma alteração aprovada chegar à `main`.

## Referências

- [Validação no Fastify](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).
- [Evento workflow_run no GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run).
