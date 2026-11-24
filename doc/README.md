# Login com Google — documento para validação da Ecos

**Projeto:** Casa Ecos — EcoAgenda  
**Assunto:** inclusão da opção “Entrar com Google”  
**Data da análise:** 09/11/2026  
**Status:** proposta para análise da Ecos; o login com Google não está implementado no projeto atual.

> Este documento apoia a decisão da Ecos e não substitui uma análise jurídica, de
> proteção de dados ou contábil feita por profissional responsável.

## 1. Objetivo

Permitir que pessoas previamente autorizadas pela Coordenação entrem no EcoAgenda
usando uma Conta Google, sem precisar digitar ou memorizar outra senha.

A proposta **não permite cadastro automático**. Ter uma conta Google não concede acesso
ao EcoAgenda. A pessoa continua precisando estar cadastrada em
**Configurações → Acessos**, com papel e permissões definidos pela Coordenação.

O login atual por e-mail e senha será mantido como alternativa durante a implantação.

## 2. Decisão recomendada

Recomenda-se aprovar o login com Google com as seguintes regras:

1. somente contas previamente autorizadas pela Coordenação podem entrar;
2. o e-mail confirmado pelo Google deve corresponder ao e-mail cadastrado em Acessos;
3. nenhum usuário, pessoa ou papel é criado automaticamente;
4. o login tradicional por senha permanece disponível;
5. o projeto Google Cloud deve pertencer à Ecos, preferencialmente usando uma conta
   institucional e com pelo menos duas pessoas administradoras;
6. não devem ser ativados serviços pagos, teste gratuito ou faturamento sem uma nova
   autorização da Ecos.

## 3. Como funciona

Fluxo resumido:

```text
Pessoa seleciona “Entrar com Google”
        ↓
Google confirma a identidade e devolve um ID token
        ↓
API do Casa Ecos valida assinatura, destinatário e validade do token
        ↓
API verifica se o e-mail já está autorizado em Configurações → Acessos
        ↓
No primeiro acesso, vincula o identificador estável da Conta Google
        ↓
Casa Ecos cria sua própria sessão e aplica o papel/permissões já cadastrados
```

O Google autentica a identidade. O Casa Ecos continua responsável por decidir quais
telas, casas e operações essa pessoa pode acessar.

## 4. Informações recebidas e armazenadas

Para este recurso, o Casa Ecos utiliza somente:

- e-mail confirmado da Conta Google;
- indicação de que o e-mail foi verificado;
- identificador estável da conta no Google (`sub`);
- data e hora do último acesso, que já era registrada pelo sistema.

O Casa Ecos **não recebe nem armazena a senha do Gmail**.

Mesmo que o token do Google possa conter outras informações básicas de perfil, como nome
ou foto, a implementação proposta não utilizará esses campos para cadastro ou autorização.

Esta integração não solicita acesso a:

- mensagens do Gmail;
- arquivos do Google Drive;
- Google Agenda;
- contatos;
- fotos;
- senha da Conta Google.

Se futuramente a Ecos desejar usar algum desses serviços, será necessária outra análise,
uma nova solicitação de permissões e nova validação institucional.

## 5. Controle de acesso

O modelo adotado é uma **lista prévia de pessoas autorizadas**:

- a Coordenação cadastra a pessoa e concede acesso;
- o e-mail cadastrado deve ser o mesmo da Conta Google usada no login;
- a API rejeita uma Conta Google válida cujo e-mail não esteja autorizado;
- o papel cadastrado no Casa Ecos continua definindo as permissões;
- remover a credencial no Casa Ecos impede novos acessos, mesmo que a Conta Google
  continue ativa;
- alterar ou suspender a Conta Google também impede a autenticação por esse método.

No primeiro login válido, o sistema vincula o identificador do Google à credencial do
Casa Ecos. Nos logins seguintes, esse vínculo estável protege contra ambiguidades caso o
endereço da Conta Google seja alterado.

## 6. Segurança aplicada

A implementação proposta deverá prever:

- botão oficial do Google Identity Services;
- uso do fluxo atual baseado em FedCM quando suportado pelo navegador;
- validação do ID token exclusivamente na API, nunca apenas no navegador;
- conferência da assinatura criptográfica e das chaves rotativas do Google;
- conferência do Client ID destinatário (`audience`), emissor e expiração;
- exigência de e-mail verificado;
- rejeição de contas que não estejam previamente autorizadas;
- vínculo único entre uma Conta Google e uma credencial do Casa Ecos;
- limitação de tentativas nas rotas de login;
- manutenção do JWT interno e do controle de permissões existente.

Em produção, a aplicação deve usar HTTPS. O Client ID é público, mas o controle do
projeto Google Cloud e das demais credenciais deve ficar restrito às pessoas responsáveis.

## 7. Custos

Para o fluxo proposto — Google Identity Services apenas para autenticação — não há
cobrança por login prevista para a Ecos.

Criar o projeto e o Client ID não significa contratar hospedagem no Google Cloud. O Casa
Ecos pode continuar hospedado onde a equipe decidir.

Podem existir custos somente se alguém, em etapa separada:

- ativar faturamento;
- contratar ou usar serviços pagos do Google Cloud;
- fizer upgrade para uma conta paga;
- habilitar APIs com cobrança própria.

Recomendação operacional: não cadastrar cartão, não iniciar teste gratuito e não ativar
faturamento para esta integração, salvo aprovação expressa da Ecos.

## 8. O que significa aceitar os termos do Google Cloud

Para criar o projeto e as credenciais, uma pessoa autorizada precisa aceitar os Termos de
Serviço do Google Cloud. Em resumo, quem aceita declara que:

- possui autorização para criar e administrar a conta/projeto;
- é responsável pela segurança da conta, chaves e credenciais;
- usará os serviços conforme os termos, políticas e legislação aplicáveis;
- observará termos adicionais de APIs ou serviços que vier a habilitar;
- será responsável por valores somente se ativar e utilizar recursos sujeitos a cobrança;
- fornecerá os avisos e consentimentos de privacidade aplicáveis ao uso dos dados.

O aceite geral mostrado no primeiro acesso ao Google Cloud não é, isoladamente, uma
compra nem uma autorização automática de cobrança. Oferta de teste gratuito, cadastro de
cartão, criação de conta de faturamento ou upgrade são etapas separadas e não são
necessárias para o Client ID desta integração.

Como o projeto atende uma organização, recomenda-se que o aceite e a propriedade do
projeto sejam associados à Ecos, e não dependam permanentemente da conta pessoal de um
integrante da equipe de desenvolvimento.

## 9. Privacidade e LGPD

O e-mail, o identificador Google e o histórico de acesso são dados pessoais. Antes da
ativação em produção, a Ecos deve:

- definir e documentar a finalidade e a base legal do tratamento;
- informar às pessoas usuárias que o Google será usado como provedor de identidade;
- atualizar o aviso de privacidade do sistema, se aplicável;
- definir prazo de retenção para credenciais e registros de acesso;
- manter processo para revogar acessos de pessoas desligadas ou que mudaram de função;
- verificar as responsabilidades da Ecos e dos fornecedores envolvidos;
- registrar quem administra o projeto Google Cloud;
- orientar as pessoas a protegerem suas Contas Google, preferencialmente com verificação
  em duas etapas.

O recurso é destinado às contas da equipe que utiliza o sistema. Não se propõe login de
crianças ou adolescentes acolhidos.

## 10. Propriedade e administração recomendadas

Antes de ativar, a Ecos deve definir:

- conta institucional proprietária do projeto Google Cloud;
- ao menos duas pessoas administradoras para evitar perda de acesso;
- e-mail de suporte exibido na tela de consentimento;
- pessoa responsável por revisar acessos e remover administradores antigos;
- domínio oficial que será autorizado em produção;
- local seguro para registrar decisões e dados do projeto.

O Client ID pode constar na configuração da aplicação porque é público. Um eventual
Client Secret nunca deve ser colocado no frontend ou enviado por mensagens comuns.

## 11. Configuração necessária

No Google Cloud/Google Auth Platform:

1. criar ou selecionar um projeto pertencente à Ecos;
2. preencher nome do aplicativo, e-mail de suporte e informações de contato;
3. definir o público adequado;
4. durante os testes, cadastrar as Contas Google autorizadas como usuários de teste;
5. criar um cliente OAuth 2.0 do tipo **Aplicativo da Web**;
6. adicionar `http://localhost:5173` como origem JavaScript para desenvolvimento;
7. adicionar o domínio HTTPS oficial quando existir ambiente de produção;
8. copiar o Client ID terminado em `.apps.googleusercontent.com`.

No `.env` do Casa Ecos, o mesmo Client ID público deve ser informado nas duas variáveis:

```dotenv
GOOGLE_CLIENT_ID=numero-identificador.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=numero-identificador.apps.googleusercontent.com
```

Depois da alteração, API e interface precisam ser reiniciadas.

## 12. Roteiro de teste para homologação

### Preparação

1. configurar o Client ID;
2. cadastrar a Conta Google como usuário de teste no Google Cloud;
3. cadastrar o mesmo e-mail em **Configurações → Acessos**;
4. manter uma conta coordenadora por senha para contingência.

### Casos que devem funcionar

- o botão oficial “Entrar com Google” aparece na tela de login;
- uma pessoa autorizada seleciona sua Conta Google e entra;
- o nome, papel e permissões exibidos são os cadastrados no Casa Ecos;
- o último acesso é atualizado;
- o segundo login funciona pelo vínculo já criado;
- o login tradicional por senha continua funcionando;
- sair encerra a sessão do Casa Ecos.

### Casos que devem ser bloqueados

- Conta Google válida, mas não cadastrada em Acessos;
- token adulterado, expirado ou criado para outro Client ID;
- e-mail não verificado;
- tentativa de vincular uma Conta Google já associada a outra credencial;
- pessoa cuja credencial foi removida do Casa Ecos.

### Navegadores

Testar pelo menos nas versões atuais de Chrome e Edge em computador e celular. O
comportamento visual da seleção de conta pode variar conforme o suporte do navegador ao
FedCM, sem alterar a regra de autorização do Casa Ecos.

## 13. Situação técnica atual

O login com Google **não está implementado nem ativo no repositório atual**. O Casa Ecos
continua usando somente o login por e-mail e senha.

Se a proposta for aprovada, o trabalho técnico previsto inclui:

- botão oficial do Google condicionado à configuração do Client ID;
- endpoint `POST /auth/google`;
- validação do ID token na API;
- exigência de e-mail verificado e previamente autorizado;
- vínculo único pelo identificador Google;
- migração da tabela `user_account`;
- manutenção do login por senha;
- testes automatizados da API, frontend e fluxo de sessão;
- documentação das variáveis de ambiente.

Nenhum Client ID do Google está configurado e nenhuma Conta Google pode entrar no sistema
neste momento. A implementação somente deverá começar após a aprovação da Ecos e a
definição da conta institucional responsável pelo projeto Google Cloud.

## 14. Decisões para aprovação da Ecos

| Decisão                                             | Recomendação                    | Aprovação/observação |
| --------------------------------------------------- | ------------------------------- | -------------------- |
| Adicionar “Entrar com Google”                       | Aprovar                         |                      |
| Manter login por senha                              | Sim, como contingência          |                      |
| Permitir cadastro automático por Google             | Não                             |                      |
| Exigir cadastro prévio em Acessos                   | Sim                             |                      |
| Conta proprietária do projeto                       | Institucional da Ecos           |                      |
| Ter duas pessoas administradoras                    | Sim                             |                      |
| Ativar faturamento/teste gratuito                   | Não para esta integração        |                      |
| Acessar Gmail, Drive, Agenda ou contatos            | Não                             |                      |
| Atualizar aviso de privacidade                      | Avaliar com responsável da Ecos |                      |
| Exigir verificação em duas etapas nas Contas Google | Recomendado                     |                      |
| Data autorizada para ativação                       | A definir                       |                      |

## 15. Plano de retorno

Caso o recurso seja implementado e a Ecos decida não utilizá-lo, ou ocorra algum problema
na homologação:

- o Client ID pode ser removido do `.env`;
- o botão deixa de aparecer;
- o login por senha continua disponível;
- os papéis e permissões não são alterados;
- o campo de vínculo Google pode permanecer sem impacto ou ser removido em migração
  posterior, se necessário.

## 16. Referências oficiais

- [Visão geral do Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview)
- [Configuração do Client ID](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Validação de ID token no backend](https://developers.google.com/identity/sign-in/web/backend-auth)
- [Referência do botão e FedCM](https://developers.google.com/identity/gsi/web/reference/js-reference)
- [Termos de Serviço do Google Cloud](https://cloud.google.com/terms)
- [Perguntas frequentes sobre teste gratuito e faturamento](https://cloud.google.com/signup-faqs)

---

**Aprovação pela Ecos**

- Responsável:
- Função:
- Decisão: ( ) Aprovado ( ) Aprovado com ressalvas ( ) Não aprovado
- Observações:
- Data:
