# CLAUDE.md — CasaEcos

Contexto para o Claude Code. Leia isto antes de qualquer tarefa neste repositório.

## O que é o projeto

**CasaEcos** (nome técnico do sistema: EcoAgenda) é um sistema de gestão para a
**Associação Ecos da Esperança**, uma ONG que acolhe crianças e adolescentes em
situação de vulnerabilidade, distribuídos em casas de acolhimento.

É um TCC do curso de Análise e Desenvolvimento de Sistemas (Senac Joinville),
seguindo a metodologia acadêmica **Design Science Research (DSR)**. Não é um
exercício descartável — vira sistema real usado pela ONG.

O sistema é desenhado para, no futuro, atender **outras ONGs** que cuidam de
pessoas vulneráveis (por isso o schema tem `organization` no topo).

## Problema que resolve

A ONG opera com informações fragmentadas, espalhadas por pessoas e sem registro
estruturado. Isso sobrecarrega a secretária, cria risco no controle de
medicamentos e dificulta a prestação de contas à prefeitura.

## Módulos (Epics no Jira, projeto ECOS)

1. **Gestão de Medicamentos** (ECOS-1) — maior risco operacional, prioridade máxima
2. **Prestação de Contas** (ECOS-2) — relatórios financeiros para a prefeitura
3. **Relatórios de Acompanhamento** (ECOS-3) — relatórios mensais dos acolhidos
4. **Organização de Agendas** (ECOS-4) — **módulo em desenvolvimento agora**

> O módulo em foco atual é o **4 (Agenda)**. Protótipo Figma e modelo físico do
> banco já estão prontos. Estamos iniciando o desenvolvimento.

## Stack

- **Backend:** Node.js + Express + TypeScript
- **ORM:** Prisma (Postgres)
- **Banco:** PostgreSQL
- **Frontend:** React + TypeScript (Vite)
- **Testes:** Vitest
- **Lint/formatação:** typescript-eslint (strict-type-checked) + Prettier, ESLint 10 (flat config)
- **Futuro (fase 2):** Bot WhatsApp via Evolution API ou Baileys (a validar)

## Princípios do produto

- **Simplicidade acima de tudo** — se a cuidadora precisar de treinamento longo, falhou
- **Mobile-first** — toda interface pensada primeiro para celular
- **Onde as pessoas já estão** — WhatsApp como porta de entrada (fase 2)
- **Custo zero para a ONG** — sustentabilidade é requisito, não desejo

## Paradigma e organização de código

- **OOP como paradigma principal.** A complexidade do domínio justifica orientação
  a objetos; funções puras ficam reservadas a utilitários.
- **Estrutura feature-first (por módulo), não layer-first.** Cada módulo é
  autocontido nas duas pontas (api e web). Isso isola o trabalho por dupla,
  facilita adicionar/remover módulos e prepara o reaproveitamento por outras ONGs.

### Estrutura de pastas

```
casaecos/
├── apps/
│   ├── api/                          # Backend Node + Express + Prisma
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── agenda/
│   │   │   │   │   ├── domain/        # entidades/classes de domínio (OOP)
│   │   │   │   │   ├── repositories/  # acesso a dados via Prisma
│   │   │   │   │   ├── services/      # regras de negócio
│   │   │   │   │   ├── controllers/
│   │   │   │   │   └── routes/
│   │   │   │   ├── medicamentos/
│   │   │   │   ├── prestacao-contas/
│   │   │   │   ├── relatorios/
│   │   │   │   └── shared/            # cross-módulo
│   │   │   │       ├── person/        # person + role
│   │   │   │       └── auth/          # user_account, login, JWT, middlewares de acesso
│   │   │   ├── config/                # env.ts (zod) e prisma.ts (client singleton)
│   │   │   ├── middlewares/           # error-handler, HttpError, RequestValidator
│   │   │   ├── shared/                # utilitários cross-módulo (prisma-error, optional-text, text-schemas, pagination)
│   │   │   ├── test/                  # helpers de teste (ex: fake-authentication)
│   │   │   ├── generated/prisma/      # client gerado — fora do versionamento
│   │   │   ├── routes.ts              # monta os routers de cada módulo
│   │   │   ├── app.ts                 # cria o Express (sem subir o servidor)
│   │   │   └── server.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── prisma7.config.ts          # datasource url (Prisma 7) + .env da raiz
│   │   └── package.json
│   └── web/                          # Frontend React (Vite)
│       ├── index.html
│       ├── vite.config.ts            # envDir aponta para o .env da raiz
│       ├── src/
│       │   ├── config/               # env.ts (VITE_API_URL obrigatória)
│       │   ├── shared/http/          # HttpClient, ApiRequestError e o apiClient
│       │   ├── modules/              # mesmos módulos + shared
│       │   │   ├── agenda/           # services/EventService, pages/AgendaPage (placeholder)
│       │   │   └── shared/auth/      # SessionStore, AuthService, AuthProvider/useAuth,
│       │   │                         # pages/LoginPage, routes/ProtectedRoute
│       │   ├── App.tsx
│       │   └── main.tsx
│       └── package.json
├── packages/
│   └── shared-types/                 # DTOs/enums compartilhados entre api e web
├── docker-compose.yml                # Postgres local
├── package.json                      # workspace raiz (npm workspaces)
├── tsconfig.base.json
├── .env.example
├── eslint.config.js                  # flat config
├── .prettierrc
├── .gitignore
├── CLAUDE.md
└── README.md
```

## Modelo de dados (entidades principais)

Modelagem física finalizada e **já implementada** em `apps/api/prisma/schema.prisma`
(migração `20260906232840_init`, ECOS-5). Entidades centrais:

- `organization` — a ONG. Toda `home` pertence a uma organization (FK not null).
- `home` — casa de acolhimento.
- `person` — qualquer pessoa (acolhidos, cuidadoras, equipe). Nem toda person autentica.
- `role` — papel/função (tabela de lookup).
- `home_person` — vínculo pessoa ↔ casa.
- `user_account` — **tabela separada** para autenticação (não colunas nulas em person).
  Guarda email, password_hash, last_login_at; FK unique para person.
- `event` — compromisso/evento da agenda.
- `event_type` — tipo do evento (tabela de lookup).
- `person_event` — vínculo pessoa ↔ evento.
- `participation_type` — papel da pessoa no evento (tabela de lookup).

### Convenções de modelagem já decididas

- **Tabelas de lookup separadas** em vez de enum inline (ex: `role`,
  `event_type`, `participation_type`). Favorece extensibilidade.
- `user_account` é separada de `person` por segurança e porque acolhidos não logam.
- **Models em PascalCase, tabelas e colunas em snake_case** via `@@map`/`@map`.
- **Todo timestamp é `timestamptz`** (`@db.Timestamptz(6)`), inclusive
  `start_date`/`end_date` do evento.
- **A sessão do banco roda em UTC** (`options: '-c timezone=UTC'` no `PrismaPg`, em
  `config/prisma.ts`, decisão #80). Com a sessão em outro fuso, o `@prisma/adapter-pg`
  descarta o offset do `timestamptz` e toda data grava, lê e filtra deslocada. Não
  tire essa opção, nem ao trocar de banco ou de hospedagem.
- **`created_at`/`updated_at` nas entidades principais** (person, home, event,
  organization). Lookups e tabelas de junção não têm.
- **Delete em cascata** nas junções (`home_person`, `person_event`) e em
  `user_account`; FKs para lookups ficam restritas, para não órfanar eventos.
- `event.end_date` é opcional de propósito — evento sem hora de término é caso real.
- **`event` tem exclusão lógica** (`deleted_at`, ECOS-6): toda leitura filtra
  `deletedAt: null`. As demais entidades seguem com exclusão física.

### Banco local

```
npm run db:up       # sobe o Postgres do docker-compose
npm run db:migrate  # prisma migrate dev
npm run db:seed     # popula role, event_type e participation_type
npm run db:seed:admin  # cria o primeiro Coordenador com credencial (lê ADMIN_* do .env)
```

O comando de seed fica em `apps/api/prisma7.config.ts` (`migrations.seed`), não no
`package.json` — o Prisma 7 não lê mais o bloco `prisma > seed` de lá.

## Convenções de código

- **TypeScript em tudo**, backend e frontend.
- **OOP**: domínio modelado em classes; camadas controller → service → repository.
- Repositórios encapsulam o Prisma — regras de negócio ficam nos services, não nos controllers.
- Nomes de entidades de domínio e tabelas em **inglês** (organization, person, event) —
  ver "Padrão de idioma" abaixo.
- `strict-type-checked` do typescript-eslint está ligado — respeite tipagem estrita,
  nada de `any` solto.
- **Nomes explícitos**: variáveis, funções e classes devem falar por si. Nome que
  revela a intenção vale mais que comentário explicando o nome.
- **Um nível de abstração por função.** Se um método mistura parsing de string com
  regra de negócio, extraia — foi o que gerou `readBearerToken` no `authenticate`.
- **Comentário só onde for necessário** — para o que o código não diz sozinho
  (motivo, restrição, decisão). Curto e direto. Nada de comentário que repete o nome.
- **Comentário em inglês** (decisão #52). Só o texto que o usuário final lê fica em
  português — e, no módulo `auth`, esse texto está reunido em `auth-messages.ts`.
- **Sem código morto**: campo que ninguém lê, export que ninguém importa e sobra de
  versão anterior saem no mesmo commit que os descobre.
- Prettier cuida da formatação; não brigue manualmente com estilo.

### Contrato da API

> Decisões #42 a #44 no Notion.

- **Sucesso devolve o payload cru** — o recurso direto no corpo, ou `Paginated<T>`
  em listagens. Sem envelope `{ data }`: o status HTTP já separa sucesso de erro.
- **Erro devolve sempre `ApiError`** (`{ message, details? }`), em qualquer 4xx/5xx.
  `message` é texto para o usuário final, em português.
- **Validação de entrada** por rota com `RequestValidator` (zod). O `ZodError` sobe
  para o `errorHandler`, que responde 400 com as issues em `details` — não capture
  o erro no controller.
- **Campo opcional no schema é `.exactOptional()`** (decisão #67), não `.optional()` nem
  `.partial()`: sob `exactOptionalPropertyTypes` só ele gera `campo?: T` sem
  `| undefined`, que é o que os DTOs de `shared-types` aceitam. Assim o dado do
  validador vai direto ao service, sem remontar objeto campo a campo e sem cast.
- **Erro do Prisma vira `HttpError`** em `shared/prisma-error.ts` (P2002 → 409,
  P2003 → 400, P2025 e P2017 → 404). Código sem tradução cai em 500 com log: erro
  sem tradução é defeito nosso, não do usuário.

### Autenticação (ECOS-13)

> Decisões #45 a #51 no Notion.

- **`POST /auth/login`** — e-mail + senha, devolve `{ token, expiresInSeconds, user }`.
  Falha sempre com 401 e a mesma mensagem (`E-mail ou senha inválidos`), para não
  revelar quais e-mails existem. Rate limit por IP na rota.
- **`POST /auth/accounts`** — cria credencial para uma `person` existente. Exige
  token **e** papel Coordenador.
- **`GET /auth/me`** — devolve o usuário do token; é o que a tela usa para restaurar
  a sessão ao recarregar a página.
- **Token**: JWT HS256 via `jose`, 8h de validade, sem refresh token. Carrega
  `sub` (= `person_id`), `email` e `roleId`. **Escopo por casa fica fora do token**
  de propósito: vínculo muda e token não se atualiza.
- **Senha**: hash `bcryptjs` com 12 rounds. Limite de 72 bytes validado na entrada,
  porque bcrypt trunca em silêncio o que passa disso.
- **Middleware**: `authenticate.handle` relê a conta no banco a cada requisição —
  sem refresh token não há revogação, então desligar um usuário ou trocar seu papel
  precisa valer na hora. O usuário vai para `request.user`; leia com `currentUser(req)`.
- **Permissão na rota**: `authorize('account:manage')` — ver "Autorização" abaixo.
- **Primeiro usuário**: `npm run db:seed:admin` cria o coordenador inicial a partir de
  `ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env`. Existe porque `POST
/auth/accounts` exige Coordenador — sem ele não haveria como criar o primeiro.
  É idempotente: se já houver conta com o e-mail, não mexe na senha.

### Integração frontend-API (ECOS-16)

> Decisões #68 a #72 no Notion.

- **Toda chamada à API passa pelo `apiClient`** (`src/shared/http/api-client.ts`),
  sempre por um service do módulo (ex: `AuthService`). Componente não chama `fetch`.
- **`HttpClient` é um wrapper de `fetch`**, sem axios: injeta o `Bearer`, devolve o
  payload cru e tipa a resposta com os DTOs de `shared-types`, sem validar em runtime.
- **Erro vira `ApiRequestError`** (`status`, `message` em PT, `details`). Servidor
  fora do ar dá `status: null`; corpo que não é `ApiError` cai em mensagem genérica.
- **401 encerra a sessão via `apiClient.onUnauthorized`**, que o `AuthProvider`
  escuta. Chamada anterior à sessão (o login) passa `{ authenticated: false }`: sem
  token, e o 401 dela é senha errada. 403 e 429 não derrubam a sessão.
- **Sessão**: `SessionStore` guarda só token + expiração no `localStorage`; token
  vencido é descartado sem ir à API. O usuário não é guardado — volta do
  `GET /auth/me` ao recarregar. Leia o estado com `useAuth()`
  (`restoring | anonymous | authenticated`).
- **O cliente não conhece o router.** Redirecionar para o login é da rota protegida,
  que reage ao estado `anonymous`.
- **`VITE_API_URL` vem do `.env` da raiz** (`envDir: '../..'`) e é obrigatória: sem
  ela o app não sobe. Nos testes o valor é fixo em `http://api.test`.

### Login e rotas (ECOS-17)

> Decisões #87 a #91 no Notion.

- **Roteamento com `react-router` 7** (o pacote canônico, não `react-router-dom`),
  em modo declarativo: `BrowserRouter` no `main.tsx`, rotas no `App.tsx`. `/login` é
  pública; `/agenda` fica atrás do `ProtectedRoute`; qualquer outra vai para
  `/agenda`. O v8 exige Node 22.22+, por isso ficou no 7.
- **`ProtectedRoute` reage ao `useAuth().status`**: `restoring` mostra o
  `SessionRestoring` (não redireciona antes do `GET /auth/me` responder),
  `anonymous` vai para `/login` guardando a rota pedida em `state.from`.
- **`LoginPage`** volta para a rota pedida (ou `/agenda`) quando o status vira
  `authenticated`. Valida só o formato do e-mail antes de chamar a API; o erro
  exibido é o `ApiRequestError.message` (401, 429 e servidor fora do ar já chegam em
  português, #69).
- **Visual**: segue o frame `login-desktop` do Figma (nodeId `77:450`), com a marca
  "Casa Ecos" e a tagline "Cuidando de quem cuida.". O link "Esqueceu a senha?" do
  Figma ficou de fora: não existe fluxo de recuperação. Tokens em inglês
  (`--color-*`) no `index.css`, com o verde `#186949` do Figma.

### Agenda — compromissos (ECOS-6)

> Decisões #73 a #78 no Notion.

- **Rotas em `/agenda/events`**, no `agendaRouter` do módulo: `POST /`, `GET /:id`,
  `PUT`/`PATCH /:id` (ambos edição parcial, #56) e `DELETE /:id`. Listagem com
  filtros e `/agenda/event-types` vieram na ECOS-15, participantes na ECOS-7
  (abaixo).
- **Permissão**: `event:read` no `GET`, `event:write` no resto. Escopo pelo
  `AccessScope`: `assertCanAccessEvent` no registro carregado e `assertCanAccessHome`
  na casa de destino ao criar ou mover.
- **Compromisso inexistente**: 404 só para quem tem escopo irrestrito. Cuidador e
  motorista recebem o mesmo 403 de fora do escopo (`scope.eventNotFoundError()`),
  para não revelar quais ids existem em outras casas (#61). O padrão da classe base
  é o 403 — escopo novo nasce fechado.
- **Datas**: ISO 8601 com fuso obrigatório (`z.iso.datetime({ offset: true })`).
  `endDate` é opcional, mas se vier precisa ser depois de `startDate`; na edição a
  regra vale contra a data já gravada. O erro é 400 com `details` no formato de issue
  do zod (`path: ['endDate']`), para o formulário marcar o campo. Data passada é
  aceita (registro retroativo).
- **Resposta** (`EventResponse`): tipo `{ id, name }`, casa resumida
  (`HomeSummaryResponse`) e `participants` (ECOS-7, abaixo).
- **Exclusão lógica** (`event.deleted_at`, migração `20260930200000_event_soft_delete`):
  o `DELETE` só marca a data, e o registro e seus `person_event` ficam para relatório
  e prestação de contas. **Toda leitura de `event` filtra `deletedAt: null`** — a
  listagem da ECOS-15, a ECOS-7 e os relatórios também. Update e remoção usam o mesmo
  filtro no `where`, então mexer num compromisso já removido dá 404. Como a linha
  continua lá, casa ou pessoa com histórico de compromissos segue sem poder ser
  excluída.
- **Texto opcional**: `normalizeOptionalText` (`src/shared/optional-text.ts`) apara e
  troca vazio por `null`; o schema usa `nullableText` (`src/shared/text-schemas.ts`).
  Os dois saíram do módulo `person` para serem reusados.

### Agenda — listagem (ECOS-15)

> Decisões #79 a #81 no Notion.

- **`GET /agenda/events`** com `event:read`: filtros `homeId`, `personId` (ECOS-7),
  `eventTypeId`, `from` e `to`, mais `page`/`pageSize`. Devolve
  `Paginated<EventResponse>` (padrão 50, máximo 200 — `src/shared/pagination.ts`),
  ordenado por `startDate` e depois `id`. O contrato é o `ListEventsQuery` de
  `shared-types`; no web, `eventService.list()`.
- **Período pelo início**: entra o compromisso com `from <= startDate < to`
  (semiaberto, então mês seguido de mês não repete nada). `from`/`to` com fuso
  obrigatório, como as datas do evento, e `to` depois de `from` (400 em `path: ['to']`).
  Compromisso que começou antes do `from` não aparece, mesmo que ainda esteja rolando.
- **Query estrita**: parâmetro desconhecido é 400. Filtro com nome errado (`start=`)
  não pode virar listagem sem filtro.
- **Filtro estreita o escopo, nunca o substitui**: o repositório combina
  `eventFilter()` (os 3 kinds, `switch` exaustivo) e os filtros num `AND`. `homeId`
  fora do escopo devolve página vazia, não 403 — o motorista não tem casa própria e
  precisa filtrar por casa entre os eventos em que participa.
- **Sem `$transaction` na página + total**: dentro de uma, o Prisma carrega as relações
  em paralelo no mesmo client do `pg`, que o `pg` já marca como depreciado. É
  `Promise.all`; um total que perde uma escrita concorrente não faz mal.
- **`GET /agenda/event-types`** com `event:read`: array cru do lookup, ordenado por id
  (mantém "Outro" no fim). No web, `eventService.listEventTypes()`.

### Agenda — participantes (ECOS-7)

> Decisões #82 a #86 no Notion.

- **Rotas aninhadas no compromisso** (#55): `POST`, `PUT`/`PATCH` e `DELETE` em
  `/agenda/events/:id/participants/:personId`, com `event:write`. `POST`, `PUT` e
  `PATCH` recebem `{ participationTypeId }` (`EventParticipantRequest`); `PUT` e `PATCH`
  trocam o tipo de participação. Todas devolvem `ApiMessage` (201 no `POST`), como o
  `home_person`. Não há `GET .../participants`: os participantes vêm no
  `EventResponse`. `GET /agenda/participation-types` (lookup cru, por id) tem
  `event:read`.
- **Regras**: compromisso inexistente ou removido segue o `eventNotFoundError()`
  (404/403); pessoa inexistente é 404 (está no path); tipo de participação
  inexistente é 400; vínculo duplicado é 409 (pré-checagem + P2002, #54); trocar ou
  remover quem não participa é 404. Qualquer pessoa pode participar, sem exigir
  `home_person` com a casa do compromisso (o motorista não tem casa), e compromisso
  passado aceita participante.
- **A escrita passa pelo `event`**: o repositório faz `event.update` com
  `deletedAt: null` no `where` e o `person_event` aninhado, então um compromisso removido
  depois da checagem dá 404, não um vínculo órfão. O `updatedAt` vai **à mão** nesse
  update: o Prisma não mexe no `@updatedAt` quando só a relação aninhada muda.
- **Contrato**: `EventResponse.participants` é
  `{ person: PersonSummaryResponse, participationType }[]`, ordenado pelo nome da
  pessoa. `PersonSummaryResponse` é só `{ id, name }` — nada de CPF ou telefone de
  acolhido na agenda. No domínio, `Event.participants` e o `participantIds` que o
  `AccessScope` lê é derivado dele; o motorista vê os compromissos em que participa
  com qualquer tipo de participação.
- **A outra direção da #55** é o filtro `personId` da listagem: `GET
/agenda/events?personId=` reaproveita período, paginação e escopo (`AND`, #81), e
  pessoa fora do escopo dá página vazia. Não existe `GET /people/:id/events`.
- **Web**: `eventService.addParticipant()`, `updateParticipant()`,
  `removeParticipant()`, `listParticipationTypes()` e `personId` no `list()`.

### Autorização (ECOS-14)

> Decisões #58 a #66 no Notion.

- **Duas camadas**: papel na rota (`authorize('recurso:ação')`) e escopo no service
  (`AccessScope`). Ambas em `modules/shared/auth/domain/`; nada de `if` de papel em
  controller.
- **Política num arquivo só** (`permissions.ts`): o mapa papel → permissão
  (`account:manage`, `person:read|write`, `home:read|write`, `event:read|write`) e o
  papel → tipo de escopo (`scopeKindForRole`). O que não está no mapa é negado; papel
  sem escopo próprio cai no escopo por casa.
- **Matriz**: Coordenador pode tudo; Secretário pode tudo menos mexer no acesso de quem
  usa o sistema; Cuidador só lê (casas e eventos das casas dele); Motorista só lê os
  eventos em que está no `person_event`; Acolhido não tem acesso.
- **Acesso de usuários** (`account:manage`, só Coordenador): criar credencial,
  cadastrar ou promover alguém a Coordenador, trocar o papel de quem tem credencial e
  excluir pessoa com credencial. As três últimas são checadas no `PersonService`.
- **Escopo** (`AccessScope`, em `currentUser(req).scope`): irrestrito (coordenação e
  secretaria), por casa (cuidador, via `home_person`) ou por participação (motorista).
  As casas vêm na mesma consulta do `authenticate`, não no token (decisão #48).
- **Uso no service**: `scope.assertCanAccessHome(id)` / `scope.assertCanAccessEvent(evento)`
  respondem 403; em listagens, `scope.accessibleHomeIds()` e `scope.eventFilter()`
  viram filtro no repositório. `eventFilter()` é união discriminada por `kind`
  (`all` | `homes` | `participant`): trate cada caso, nunca "sem campo = sem filtro".
  Fora do escopo é 403, checado antes da existência.
- **Rotas protegidas**: `/homes`, `/people`, `/roles` e `/agenda` exigem login e
  permissão. Eventos, listagem e participantes (ECOS-6/15/7) usam `authorize('event:*')`
  e o `AccessScope`.
- **Testes de rota** simulam o login com `src/test/fake-authentication.ts`
  (`vi.mock` do `authenticate`).

## Padrão de idioma

- **Código e identificadores em inglês**: variáveis, funções, classes, métodos,
  tipos, arquivos e pastas. Ex: `createEvent`, `EventService`, `findById`,
  `UserAccount`. Mantém coerência com o schema do banco (entidades já em inglês:
  organization, person, event) e com as bibliotecas/framework.
- **Mensagens de commit em inglês.**
- **Texto voltado ao usuário final em português**: labels da UI, mensagens de erro
  exibidas ao usuário, conteúdo de relatórios. O usuário final (cuidadoras,
  secretária) é brasileiro e a interface é em português.
- **Comentários de código em inglês** (decisão #52, que revisa a #26). A documentação
  do time segue em português (CLAUDE.md, Notion, docs internas, descrições de teste).
- **Português no código é acentuado normalmente**, nas strings voltadas ao usuário.
  Arquivos em UTF-8.
- **Termos de domínio sem equivalente claro em inglês podem permanecer em português**
  quando traduzir perderia precisão (ex: um conceito específico da ONG ou da
  prefeitura). Nesses casos, manter o termo em PT é preferível a uma tradução que engana.

## Gestão do projeto

- **Jira** (projeto ECOS) para épicos e stories. Integração via Atlassian Rovo MCP.
- **Notion** é a fonte da verdade para decisões e requisitos. O registro de
  decisões (com justificativa numerada) vive lá — ao tomar uma decisão técnica
  relevante, ela deve ser registrada nesse formato.
- **Figma** para o protótipo das telas. Acesso via Figma MCP (ver abaixo).

### Ao fechar uma task: atualizar Jira e Notion

**Toda task concluída termina com Jira e Notion atualizados** — código entregue sem
isso é task pela metade. Não é opcional nem precisa ser pedido a cada vez.

O que significa na prática, avaliando caso a caso o que faz sentido:

- **Jira** — mover o card para o status certo, atribuir o responsável e comentar o
  que foi entregue: o que mudou, o hash do commit e o que ficou de fora. Se a
  descrição da story virou mentira, corrigir a descrição.
- **Notion** — registrar em Decisões e Direcionamentos toda decisão técnica que a
  task produziu, no formato numerado da tabela (# | Decisão | Justificativa | Data
  | Status), e atualizar o rodapé de versão. Fechar no checklist de "Decisões ainda
  em aberto" o que a task resolveu.
- **CLAUDE.md** — se a task mudou convenção, estado do projeto ou pendência, ajustar
  aqui também. As três fontes precisam contar a mesma história.

Antes de escrever que algo está pendente, **conferir no Notion** — ele é a fonte da
verdade e costuma estar à frente deste arquivo.

### Acessos (para retomar em qualquer sessão)

**Jira** — via Atlassian Rovo MCP, com leitura e escrita
(`read:jira-work`, `write:jira-work`).

- Site: `diegosilveira.atlassian.net`
- `cloudId`: `7770c8f6-39b8-4a88-90ab-4db17bdee2ed`
- Projeto: **ECOS** ("Casa Ecos", id `10000`)
- Fluxo do board: Tarefas pendentes → Em andamento → Em análise → Concluído
- Épicos: ECOS-1 (Medicamentos), ECOS-2 (Prestação de Contas), ECOS-3 (Relatórios),
  ECOS-4 (Agenda). Stories da Agenda: ECOS-5 a ECOS-9, mais ECOS-11 (casas) e
  ECOS-12 (pessoas), base compartilhada do módulo.

**Notion** — espaço **Ecos da Esperança**, com leitura e escrita.

- [Decisões e Direcionamentos](https://app.notion.com/p/3281b5b5a8558028984df510b6cef572)
  — o registro numerado. Page id `3281b5b5-a855-8028-984d-f510b6cef572`.
- Páginas irmãs: Requisitos, Contexto do projeto, Arquitetura e Técnico,
  Documentações, Reuniões e Atas, Prestação de Contas — Análise do Documento.

**Figma** — ver a seção abaixo.

## Protótipo Figma

**Arquivo:** [Protótipo Ecos](https://www.figma.com/design/tC73sILOTujQPnjAe5NNmP/Prot%C3%B3tipo-Ecos?node-id=0-1)

- `fileKey`: `tC73sILOTujQPnjAe5NNmP`
- Página única: `0:1` ("Page 1") — passe esse nodeId nas ferramentas do Figma MCP.
- Conta: `diego.silveira@alunos.sc.senac.br` (times Senac, assento Full).

### O que tem dentro (levantado em 06/09/2026)

O canvas tem **duas versões da mesma tela de agenda, lado a lado**:

- **Esquerda** — o protótipo editável. Camadas soltas (`Rectangle 101`, `image 13`…),
  sem componentes, sem auto-layout e sem variáveis/tokens do Figma. É um wireframe
  de alta fidelidade, não um design system.
- **Direita** (nodeId `22:5`, "image 11") — **é um PNG achatado de 1536×1024**, não
  design em camadas. Provavelmente a exploração feita no Stitch (decisão #12 no
  Notion). Serve de referência visual; não dá para extrair token nenhum dela.

Estrutura da tela: sidebar de navegação (Agenda, Medicamentos, Relatórios, Prestação
de Contas, Configurações, Ajuda) + seletor de organização ("Núcleo Esperança"),
header com usuário e papel ("Maria Silva / Secretária"), barra de ações (Filtros,
Exportar, + Novo Compromisso), grade mensal com troca de visão (Mês/Semana/Dia) e
painel lateral "Próximos Compromissos". Na versão da direita os compromissos
aparecem como chips coloridos por tipo, com hora, título e pessoa.

### Valores já extraídos

| O quê                                       | Valor no Figma                         |
| ------------------------------------------- | -------------------------------------- |
| Verde primário (botão "+ Novo Compromisso") | `#186949`                              |
| Título de página ("Agenda")                 | Google Sans Flex SemiBold, 32px, preto |
| Largura da sidebar                          | 228px                                  |
| Canvas                                      | 1440×1024 (desktop)                    |

O arquivo também tem o frame `login-desktop` (nodeId `77:450`, base da ECOS-17) e
os frames de criação e edição de compromisso.

### Divergências a resolver antes da ECOS-8

1. ~~O verde não bate.~~ Resolvido na ECOS-17: `--color-primary: #186949` no
   `index.css`, igual ao Figma (decisão #89).
2. **O protótipo é só desktop.** Não existe frame mobile no arquivo, o que contraria
   o princípio mobile-first do projeto. A tela de agenda precisa de uma decisão de
   layout para celular — ou um frame no Figma, ou definida direto no código.
3. **Tokens não existem no Figma.** Nenhuma variável está definida no arquivo, então
   a fonte da verdade dos tokens vai ser o CSS do `apps/web`, não o Figma. Ao
   importar uma tela, extrair os valores e nomeá-los no código.
4. ~~Tagline em aberto.~~ Definida na ECOS-17: "Cuidando de quem cuida." (decisão
   #90). O texto da sidebar do protótipo da agenda precisa ser trocado no Figma.

## Estado atual / próximos passos

- **Scaffold do monorepo concluído em 06/09/2026**: workspaces npm, API Express 5 +
  Prisma 7, Web Vite + React 19, `packages/shared-types`, ESLint 10 flat +
  Prettier, Vitest nas duas pontas, docker-compose com Postgres 16.
- **ECOS-5 concluída em 06/09/2026**: schema Prisma das 10 tabelas, migração
  inicial aplicada e seed idempotente dos lookups.
- **ECOS-10 concluída em 07/09/2026**: `RequestValidator` (zod), tradução dos erros
  do Prisma para `HttpError` e contrato de resposta definido (payload cru no
  sucesso, `ApiError` no erro).
- **ECOS-12 implementada em 22/09/2026**: CRUD de pessoas em `/people`, filtros
  por papel e nome, lookup em `/roles`, telefone opcional e único e bloqueio da
  exclusão de pessoas vinculadas a casas ou eventos.
- **ECOS-13 concluída em 23/09/2026**: autenticação em `/auth` — login com JWT
  (`jose`, HS256, 8h), senha em hash `bcryptjs` (12 rounds), criação de credencial
  restrita a Coordenador, middleware que injeta o usuário na requisição e rate
  limit na rota de login.
- **ECOS-22 concluída em 23/09/2026**: o módulo `person` passou a validar com
  `RequestValidator` nas rotas, como o `auth`, e os opcionais passaram a
  `.exactOptional()` (decisão #67).
- Módulo 4 (Agenda) quebrado em stories no Jira: ECOS-5 a ECOS-21.
- Ordem de desenvolvimento: schema Prisma → infra da API → API → telas React.
- **ECOS-14 implementada em 25/09/2026**: autorização por permissão (`authorize`) +
  escopo por casa/participação (`AccessScope`); `/homes`, `/people` e `/roles`
  passaram a exigir login; índice em `home_person(person_id)` (migração
  `20260925220000_home_person_person_id_index`).
- **ECOS-11 implementada em 23/09/2026**: CRUD de casas em `/homes`, filtro por
  organização, validação de organização e responsável, vínculo `home_person`,
  consultas nas duas direções e bloqueio da exclusão de casas com eventos.
- **ECOS-16 implementada em 29/09/2026**: camada de integração do `apps/web` —
  `HttpClient` sobre `fetch`, `ApiRequestError`, sessão no `localStorage` com
  restauração via `/auth/me`, `AuthProvider`/`useAuth` e 401 encerrando a sessão.
  O serviço de eventos do front ficou para a ECOS-6, que cria o contrato em
  `shared-types`.
- **ECOS-6 implementada em 30/09/2026**: CRUD de compromissos em `/agenda/events`
  (sem listagem, que é da ECOS-15), com `authorize('event:*')` e `AccessScope`,
  datas com fuso obrigatório e término depois do início, exclusão lógica
  (`deleted_at`), contrato `event.ts` em `shared-types` e `EventService` no `apps/web`.
- **ECOS-15 implementada em 30/09/2026**: listagem em `GET /agenda/events` com filtro
  por casa, tipo e período (pelo início, com fuso), paginada com `Paginated<T>` e
  recortada pelo `AccessScope`; lookup em `GET /agenda/event-types`; `list()` e
  `listEventTypes()` no `EventService` do web. Junto, a correção do fuso da sessão do
  banco (decisão #80), que deslocava as datas quando o Postgres não estava em UTC.
- **ECOS-7 implementada em 30/09/2026**: participantes em
  `/agenda/events/:id/participants/:personId` (`POST`, `PUT`/`PATCH`, `DELETE`),
  lookup em `GET /agenda/participation-types`, `participants` no `EventResponse`,
  filtro `personId` na listagem e os métodos do `EventService` do web. Junto, o P2017
  do Prisma traduzido para 404.
- **ECOS-17 implementada em 30/09/2026**: tela de login (branch do Gustavo, de 08/09)
  mergeada com a `main` e adaptada à ECOS-16 — `react-router`, `ProtectedRoute` que
  espera a restauração da sessão, erro vindo do `ApiRequestError` e placeholder em
  `/agenda` até a ECOS-8. O backend de auth paralelo da branch foi descartado em favor
  da ECOS-13.
- Módulo 4 (Agenda) quebrado em stories no Jira: ECOS-5 a ECOS-9, com ECOS-11 e
  ECOS-12 como base compartilhada (casas e pessoas).
- Ordem de desenvolvimento: schema Prisma → API → telas React.
  - ECOS-5: Schema Prisma e migração inicial — ✅ concluída
  - ECOS-10: Infraestrutura base da API — ✅ concluída
  - ECOS-12: API de pessoas e papéis — ✅ implementada
  - ECOS-13: Autenticação e login (JWT) — ✅ concluída
  - ECOS-6: API CRUD de eventos — ✅ implementada (com `event.ts` em `shared-types`
    e o `EventService` do web)
  - ECOS-15: API de listagem de eventos com filtros (data, casa, tipo) — ✅ implementada
  - ECOS-7: API de associação de pessoas a eventos (person_event) — ✅ implementada
  - ECOS-11: API de casas (home, home_person)
  - ECOS-14: autorização (RBAC + escopo por casa) — ✅ implementada (aplicada nos
    eventos na ECOS-6)
  - ECOS-16: camada de integração frontend-API — ✅ implementada
  - ECOS-17: tela de login — ✅ implementada (tela do Gustavo adaptada à ECOS-16)
  - ECOS-8: Tela de visualização da agenda
  - ECOS-9: Formulário de criação/edição de evento
  - ECOS-18: testes automatizados do módulo
  - ECOS-19/20: telas de design no Figma (formulário de compromisso, login)
  - ECOS-21: exportar agenda — adiada (decisão #38)

## Pendências que afetam o desenvolvimento

- **Permissões: implementadas na ECOS-14** (ver "Autorização") e aplicadas nos
  eventos (ECOS-6), na listagem (ECOS-15) e nos participantes (ECOS-7); a tela
  (ECOS-8) ainda precisa esconder o que o papel não pode fazer.
- **Dívida: `POST /agenda/events` dispara o aviso de depreciação do `pg`** ("client
  is already executing a query"). O `event.create` com `select` de relações roda numa
  transação implícita e o Prisma carrega as relações em paralelo no mesmo client — o
  mesmo problema da #79. Vem desde a ECOS-6 (reproduzido na `main`) e não quebra nada
  hoje, mas vira erro no `pg@9`. Saída provável: criar devolvendo só o `id` e ler com
  `findById`.
- Vínculo org-wide para pessoal não ligado a uma casa específica (ex:
  `person_organization`) só será modelado se surgir uma segunda ONG.
- **Dívida: `home.controller.ts` (ECOS-11) valida com `schema.parse()` dentro do
  controller** e remonta os opcionais campo a campo — o mesmo caso que a ECOS-22
  resolveu no `person`. Alinhar ao `RequestValidator` com `.exactOptional()`.
- **Sem refresh token** (decisão da própria ECOS-13). Se 8h virar atrito na prática,
  aí sim vira card.
- **Recuperação de senha e troca de senha pelo próprio usuário não existem.** Hoje só
  o Coordenador cria credencial; redefinir senha ainda não tem fluxo. Por isso o login
  não mostra o "Esqueceu a senha?" do Figma (decisão #91).

> O RF-31 (estrutura de `participation_type`) foi resolvido: lookup separado com
> FK not null em `person_event`, seguindo a decisão #11. Já está no schema.
