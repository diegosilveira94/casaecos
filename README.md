# CasaEcos — EcoAgenda

Sistema de gestão para a **Associação Ecos da Esperança**, ONG que acolhe crianças e
adolescentes em situação de vulnerabilidade. TCC de Análise e Desenvolvimento de
Sistemas (Senac Joinville), metodologia Design Science Research.

Contexto completo do produto e das convenções: [`CLAUDE.md`](./CLAUDE.md).

## Stack

| Camada  | Tecnologias                                         |
| ------- | --------------------------------------------------- |
| Backend | Node 22, Express 5, TypeScript, Prisma 7 (Postgres) |
| Web     | React 19, TypeScript, Vite                          |
| Testes  | Vitest (+ Supertest na API, Testing Library na web) |
| Estilo  | typescript-eslint strict-type-checked + Prettier    |

Monorepo com npm workspaces: `apps/api`, `apps/web` e `packages/shared-types`.

## Pré-requisitos

- Node.js >= 22
- npm >= 10
- Docker Desktop (para o Postgres local)

## Como rodar

```bash
# 1. dependências (o postinstall já compila o packages/shared-types)
npm install

# 2. variáveis de ambiente
cp .env.example .env

# 3. Postgres local
npm run db:up

# 4. cliente do Prisma + migrações
npm run db:migrate

# 5. api (:3333) + web (:5173) + watch dos tipos compartilhados
npm run dev
```

Para subir só uma ponta: `npm run dev:api` ou `npm run dev:web`.

## Scripts da raiz

| Script               | O que faz                                       |
| -------------------- | ----------------------------------------------- |
| `npm run dev`        | shared-types (watch) + API + Web em paralelo    |
| `npm run build`      | build dos três workspaces, na ordem certa       |
| `npm test`           | Vitest em todos os workspaces                   |
| `npm run typecheck`  | `tsc --noEmit` em todos os workspaces           |
| `npm run lint`       | ESLint no monorepo inteiro                      |
| `npm run format`     | Prettier em tudo                                |
| `npm run db:up/down` | sobe/derruba o Postgres do `docker-compose.yml` |
| `npm run db:migrate` | `prisma migrate dev` na `apps/api`              |
| `npm run db:studio`  | Prisma Studio                                   |

## Estrutura

Organização **feature-first**: cada módulo do produto é autocontido nas duas pontas.

```
apps/api/src/modules/<modulo>/{domain,repositories,services,controllers,routes}
apps/web/src/modules/<modulo>/
packages/shared-types/src/          # DTOs e enums entre api e web
```

Módulos: `agenda` (em desenvolvimento), `medicamentos`, `prestacao-contas`,
`relatorios` e `shared` (person, role, user_account, auth).

## Notas de configuração

- **Prisma 7**: a URL do banco fica em `apps/api/prisma7.config.ts` (lê o `.env` da
  raiz), não no bloco `datasource`. O client é gerado como TypeScript em
  `apps/api/src/generated/prisma` (fora do versionamento) e a conexão usa o driver
  adapter `@prisma/adapter-pg`.
- **Um único `.env`**, na raiz, consumido pela API, pelo Vite e pelo docker compose.
- `apps/api/.claude/skills/` traz as skills oficiais do Prisma, instaladas pelo
  `prisma init`.

## API de pessoas

| Método           | Rota          | Descrição                                  |
| ---------------- | ------------- | ------------------------------------------ |
| `POST`           | `/people`     | Cria uma pessoa                            |
| `GET`            | `/people`     | Lista; aceita os filtros `roleId` e `name` |
| `GET`            | `/people/:id` | Busca uma pessoa por id                    |
| `PUT` ou `PATCH` | `/people/:id` | Edita os campos informados                 |
| `DELETE`         | `/people/:id` | Exclui e confirma uma pessoa sem vínculos  |
| `GET`            | `/roles`      | Lista os papéis disponíveis                |

## API de casas

| Método           | Rota                              | Descrição                               |
| ---------------- | --------------------------------- | --------------------------------------- |
| `POST`           | `/homes`                          | Cria uma casa                           |
| `GET`            | `/homes`                          | Lista; aceita o filtro `organizationId` |
| `GET`            | `/homes/:id`                      | Busca uma casa por id                   |
| `PUT` ou `PATCH` | `/homes/:id`                      | Edita os campos informados              |
| `DELETE`         | `/homes/:id`                      | Exclui uma casa sem eventos vinculados  |
| `GET`            | `/homes/:homeId/people`           | Lista as pessoas vinculadas a uma casa  |
| `POST`           | `/homes/:homeId/people/:personId` | Vincula uma pessoa a uma casa           |
| `DELETE`         | `/homes/:homeId/people/:personId` | Desvincula uma pessoa de uma casa       |
| `GET`            | `/people/:personId/homes`         | Lista as casas vinculadas a uma pessoa  |
