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
│   │   │   │   └── shared/            # person, role, user_account, auth — cross-módulo
│   │   │   ├── config/               # env.ts (zod) e prisma.ts (client singleton)
│   │   │   ├── middlewares/           # error-handler, HttpError
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
- **Nomes explícitos**: variáveis, funções e classes devem falar por si.
- **Comentário só onde for necessário** — para o que o código não diz sozinho
  (motivo, restrição, decisão). Curto e direto. Nada de comentário que repete o nome.
- Prettier cuida da formatação; não brigue manualmente com estilo.

## Padrão de idioma

- **Código e identificadores em inglês**: variáveis, funções, classes, métodos,
  tipos, arquivos e pastas. Ex: `createEvent`, `EventService`, `findById`,
  `UserAccount`. Mantém coerência com o schema do banco (entidades já em inglês:
  organization, person, event) e com as bibliotecas/framework.
- **Mensagens de commit em inglês.**
- **Texto voltado ao usuário final em português**: labels da UI, mensagens de erro
  exibidas ao usuário, conteúdo de relatórios. O usuário final (cuidadoras,
  secretária) é brasileiro e a interface é em português.
- **Comentários e documentação do time em português** (CLAUDE.md, Notion, docs internas).
- **Português no código é acentuado normalmente**, em comentário e em string. Arquivos em UTF-8.
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
  ECOS-4 (Agenda). Stories da Agenda: ECOS-5 a ECOS-9.

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
- **ECOS-12 implementada em 22/09/2026**: CRUD de pessoas em `/people`, filtros
  por papel e nome, lookup em `/roles`, telefone opcional e único e bloqueio da
  exclusão de pessoas vinculadas a casas ou eventos.
- Módulo 4 (Agenda) quebrado em stories no Jira: ECOS-5 a ECOS-9.
- Ordem de desenvolvimento: schema Prisma → API → telas React.
  - ECOS-5: Schema Prisma e migração inicial — ✅ concluída
  - ECOS-6: API CRUD de eventos — **próxima**
  - ECOS-7: API de associação de pessoas a eventos (person_event)
  - ECOS-8: Tela de visualização da agenda
  - ECOS-9: Formulário de criação/edição de evento

## Pendências que afetam o desenvolvimento

- **Permissões: abordagem definida, implementação pendente.** RBAC por papel
  (`role`) + escopo por casa (`home_person`), sem tabela de permissões dedicada
  (decisão #28 no Notion). A lógica vive na aplicação, não no schema — ou seja,
  ela entra nos endpoints (ECOS-6/7) e na tela (ECOS-8). O refinamento fino da
  matriz por ação segue opcional.
- Vínculo org-wide para pessoal não ligado a uma casa específica (ex:
  `person_organization`) só será modelado se surgir uma segunda ONG.

> O RF-31 (estrutura de `participation_type`) foi resolvido: lookup separado com
> FK not null em `person_event`, seguindo a decisão #11. Já está no schema.
