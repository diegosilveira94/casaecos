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
│   │   │   ├── shared/                # utilitários cross-módulo (ex: prisma-error)
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
│       ├── vite.config.ts
│       ├── src/
│       │   ├── modules/              # mesmos módulos + shared
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
- **`created_at`/`updated_at` nas entidades principais** (person, home, event,
  organization). Lookups e tabelas de junção não têm.
- **Delete em cascata** nas junções (`home_person`, `person_event`) e em
  `user_account`; FKs para lookups ficam restritas, para não órfanar eventos.
- `event.end_date` é opcional de propósito — evento sem hora de término é caso real.

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
- **Erro do Prisma vira `HttpError`** em `shared/prisma-error.ts` (P2002 → 409,
  P2003 → 400, P2025 → 404). Código sem tradução cai em 500 com log: erro sem
  tradução é defeito nosso, não do usuário.

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
- **Gate por papel**: `authorizeRoles(ROLE_IDS.coordinator)`. É a semente da ECOS-14;
  o escopo por casa entra lá.
- **Primeiro usuário**: `npm run db:seed:admin` cria o coordenador inicial a partir de
  `ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env`. Existe porque `POST
/auth/accounts` exige Coordenador — sem ele não haveria como criar o primeiro.
  É idempotente: se já houver conta com o e-mail, não mexe na senha.

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

### Divergências a resolver antes da ECOS-8

1. **O verde não bate.** O protótipo usa `#186949`; o `apps/web/src/index.css` usa
   `--cor-primaria: #1f7a5a`. Alinhar antes de espalhar a cor pelas telas.
2. **O protótipo é só desktop.** Não existe frame mobile no arquivo, o que contraria
   o princípio mobile-first do projeto. A tela de agenda precisa de uma decisão de
   layout para celular — ou um frame no Figma, ou definida direto no código.
3. **Tokens não existem no Figma.** Nenhuma variável está definida no arquivo, então
   a fonte da verdade dos tokens vai ser o CSS do `apps/web`, não o Figma. Ao
   importar uma tela, extrair os valores e nomeá-los no código.
4. **A tagline já aparece no protótipo** ("Cuidando de hoje, transformando o
   amanhã."), mas a decisão #16 no Notion ainda marca a tagline como em aberto.

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
- Módulo 4 (Agenda) quebrado em stories no Jira: ECOS-5 a ECOS-21.
- Ordem de desenvolvimento: schema Prisma → infra da API → API → telas React.
- **ECOS-11 implementada em 23/09/2026**: CRUD de casas em `/homes`, filtro por
  organização, validação de organização e responsável, vínculo `home_person`,
  consultas nas duas direções e bloqueio da exclusão de casas com eventos.
- Módulo 4 (Agenda) quebrado em stories no Jira: ECOS-5 a ECOS-9, com ECOS-11 e
  ECOS-12 como base compartilhada (casas e pessoas).
- Ordem de desenvolvimento: schema Prisma → API → telas React.
  - ECOS-5: Schema Prisma e migração inicial — ✅ concluída
  - ECOS-10: Infraestrutura base da API — ✅ concluída
  - ECOS-12: API de pessoas e papéis — ✅ implementada
  - ECOS-13: Autenticação e login (JWT) — ✅ concluída
  - ECOS-6: API CRUD de eventos — **próxima**
  - ECOS-15: API de listagem de eventos com filtros (data, casa, tipo)
  - ECOS-7: API de associação de pessoas a eventos (person_event)
  - ECOS-11: API de casas (home, home_person)
  - ECOS-14: autorização (RBAC + escopo por casa) — o gate por papel já existe em
    `modules/shared/auth/middlewares/authorize.ts`; falta o escopo por casa
  - ECOS-16/17: camada de integração frontend-API e tela de login
  - ECOS-8: Tela de visualização da agenda
  - ECOS-9: Formulário de criação/edição de evento
  - ECOS-18: testes automatizados do módulo
  - ECOS-19/20: telas de design no Figma (formulário de compromisso, login)
  - ECOS-21: exportar agenda — adiada (decisão #38)

## Pendências que afetam o desenvolvimento

- **Permissões: abordagem definida, implementação pendente.** RBAC por papel
  (`role`) + escopo por casa (`home_person`), sem tabela de permissões dedicada
  (decisão #28 no Notion). A lógica vive na aplicação, não no schema — ou seja,
  ela entra nos endpoints (ECOS-6/7) e na tela (ECOS-8). O refinamento fino da
  matriz por ação segue opcional.
- Vínculo org-wide para pessoal não ligado a uma casa específica (ex:
  `person_organization`) só será modelado se surgir uma segunda ONG.
- **Dívida: `person.controller.ts` valida com `schema.parse()` dentro do controller**
  em vez do `RequestValidator` da decisão #44. O módulo `auth` já segue a decisão;
  alinhar o `person` quando alguém mexer nele (card ECOS-22).
- **Sem refresh token** (decisão da própria ECOS-13). Se 8h virar atrito na prática,
  aí sim vira card.
- **Recuperação de senha e troca de senha pelo próprio usuário não existem.** Hoje só
  o Coordenador cria credencial; redefinir senha ainda não tem fluxo.

> O RF-31 (estrutura de `participation_type`) foi resolvido: lookup separado com
> FK not null em `person_event`, seguindo a decisão #11. Já está no schema.
