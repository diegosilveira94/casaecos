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

Modelagem física já finalizada. Entidades centrais:

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

## Estado atual / próximos passos

- **Scaffold do monorepo concluído em 06/09/2026**: workspaces npm, API Express 5 +
  Prisma 7, Web Vite + React 19, `packages/shared-types`, ESLint 10 flat +
  Prettier, Vitest nas duas pontas, docker-compose com Postgres 16.
- Módulo 4 (Agenda) quebrado em stories no Jira: ECOS-5 a ECOS-9.
- Ordem de desenvolvimento: schema Prisma → API → telas React.
  - ECOS-5: Schema Prisma e migração inicial
  - ECOS-6: API CRUD de eventos
  - ECOS-7: API de associação de pessoas a eventos (person_event)
  - ECOS-8: Tela de visualização da agenda
  - ECOS-9: Formulário de criação/edição de evento

## Pendências que afetam o desenvolvimento

- **Matriz de permissões de plantão** ainda não definida. Isso afeta quem vê o quê
  na tela de agenda (ECOS-8) e nos endpoints (ECOS-6/7). Resolver antes de fechar ECOS-8.
- **RF-31** (estrutura de participation_type) ainda em aberto — confirmar antes de
  fechar o schema de person_event.
- Vínculo org-wide para pessoal não ligado a uma casa específica (ex:
  `person_organization`) só será modelado se surgir uma segunda ONG.
