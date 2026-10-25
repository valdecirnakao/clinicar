# CliniCar

Sistema web desenvolvido como Trabalho de Conclusão de Curso para apoiar a gestão de oficinas mecânicas. Reúne cadastros, estoque, agendamentos, atendimentos, histórico veicular e alertas com controle de acesso e autenticação em duas etapas.

Esta versão incorpora a migração para Angular 21 LTS e melhorias de funcionalidade, segurança, desempenho e responsividade. As melhorias implementadas e as etapas ainda em andamento estão em [Modernização do projeto](documentacao/modernizacao-profissional.md).

A área de trabalho do colaborador e sua matriz de permissões estão descritas em [Acesso do colaborador](documentacao/acesso-colaborador.md).

## Funcionalidades

| Módulo | Recursos principais |
| --- | --- |
| Painel operacional | Indicadores de agendamentos, atendimentos, estoque e notificações; retomada de cadastros pendentes. |
| Usuários | Administradores, colaboradores e clientes; validação de CPF/CNPJ e e-mail; gestão de acesso, reset de 2FA com justificativa e suspensão temporária. |
| Veículos | Associação ao proprietário, validação de placa duplicada e acesso ao histórico veicular. |
| Fornecedores | Identificação, contato e endereço; validação de CNPJ e e-mail; continuidade para peças ou serviços. |
| Peças e insumos | Classificação técnica, unidades de medida, atributos de óleos de motor e validação de duplicidade. |
| Serviços e fornecimentos | Serviços, fornecedores e condições comerciais; prevenção de vínculos duplicados. |
| Estoque | Controle por peça e local, reservas, custo médio, entradas, saídas, ajustes e devoluções vinculadas à movimentação de origem. |
| Agendamentos e atendimentos | Cliente, veículo, responsáveis, peças e serviços; continuidade entre agendamento e atendimento. |
| Manutenção e alertas | Regras preventivas, configurações por destinatário e alertas de reposição com responsável pelo estoque. |
| Auditoria | Consulta administrativa, filtros, paginação, detalhes e exportação CSV. |

Os fluxos integrados permitem selecionar registros existentes ou cadastrar novos itens preservando a associação de origem, como fornecedor → peça → fornecimento → estoque e usuário → veículo → configuração de alertas.

A interface utiliza paginação, filtros, indicadores e modais com orientação geral e ajuda por campo ou guia. Há adaptações para tablet e celular e proteção para formulários não salvos. O botão **Encerrar** faz logoff e retorna ao login.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | Angular 21 LTS, TypeScript 5.9, RxJS, Bootstrap 5 e Bootstrap Icons. |
| Backend | Java 23, Spring Boot 3.5.5, Spring Data JPA, Hibernate e Maven Wrapper. |
| Banco | MySQL 8.0.42 na imagem local; migrações versionadas com Flyway. |
| Infraestrutura | Docker Compose, Nginx e Mailpit para captura local de e-mails. |
| Testes | JUnit, Mockito, integração com MySQL, Jasmine/Karma e Playwright. |

O frontend usa Node.js 22.14.0 para instalação e compilação. As páginas administrativas são carregadas sob demanda, e as listas principais consultam páginas, filtros e ordenação no servidor.

## Execução local com Docker

Requisitos: Docker Desktop em execução e Docker Compose disponível. Pelo procedimento abaixo, não é necessário instalar Java, Maven, Node.js ou MySQL na máquina.

```powershell
git clone --branch desenvolvimento-pos-entrega https://github.com/valdecirnakao/clinicar.git
cd clinicar
```

Em uma instalação nova, crie o arquivo de configuração:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Edite o `.env` e configure `MYSQL_ROOT_PASSWORD`, `MYSQL_APP_PASSWORD` e `MFA_ENCRYPTION_KEY`. A chave MFA deve conter 32 bytes aleatórios codificados em Base64. Configure também o servidor de e-mail. Para demonstração local com Mailpit, use `MAIL_HOST=mailpit`, `MAIL_PORT=1025`, `MAIL_AUTH=false`, `MAIL_STARTTLS=false` e `MAIL_STARTTLS_REQUIRED=false`.

Em uma instalação existente, preserve o `.env`, a chave MFA e o volume MySQL. Alterar as senhas no arquivo não redefine as contas de um banco já inicializado. Faça backup antes de atualizar. Veja [Recuperação do ambiente](documentacao/recuperacao-ambiente.md).

Compile o código desta branch e inicie os serviços:

```powershell
docker compose --env-file .env -f compose.yaml -f compose.dev.yaml up -d --build
```

Use os dois arquivos Compose para compilar as alterações locais; o arquivo principal sozinho referencia imagens publicadas. Aguarde a inicialização e confira:

```powershell
docker compose --env-file .env -f compose.yaml -f compose.dev.yaml ps
```

O backend e o MySQL devem apresentar saúde `healthy`; frontend e Mailpit devem estar em execução. As migrações são aplicadas na inicialização e o backend valida o esquema do banco.

| Serviço | Endereço local |
| --- | --- |
| Aplicação | [http://localhost](http://localhost) |
| Caixa de e-mails do Mailpit | [http://localhost:8025](http://localhost:8025) |
| Verificação de saúde | [http://localhost/api/infra/health](http://localhost/api/infra/health) |

Para parar os serviços preservando os dados:

```powershell
docker compose --env-file .env -f compose.yaml -f compose.dev.yaml stop
```

Para iniciá-los novamente:

```powershell
docker compose --env-file .env -f compose.yaml -f compose.dev.yaml up -d
```

O botão **Encerrar** encerra somente a sessão do usuário. A administração dos serviços é feita pelo Docker Compose.

## Primeiro acesso

1. Abra a aplicação e selecione **Primeiro acesso?**.
2. Cadastre o administrador inicial.
3. Abra o e-mail de ativação no servidor configurado ou no Mailpit.
4. Acesse o link de ativação e defina a senha.
5. Faça login com e-mail e senha.
6. Configure o aplicativo autenticador TOTP e informe o código solicitado.

Nos próximos acessos, use a senha e o código do aplicativo já configurado. O QR Code não é reapresentado a cada login. Links de ativação e recuperação têm validade e uso único.

## Notificações e alertas

Orçamentos de atendimento enviados para aprovação são versionados. O cliente aceita ou recusa a versão pendente em **Meus atendimentos**; mudanças de escopo ou valor exigem revisão e novo aceite. Operação, cópias externas, monitoramento e roteiro de validação estão em [Orçamentos, operação e validação](documentacao/orcamentos-operacao-validacao.md).

E-mails e mensagens de WhatsApp são enfileirados para processamento em segundo plano. Acompanhe estados e falhas pelo Painel operacional. A aceitação do envio pelo provedor é diferente da confirmação de entrega ou leitura.

Para WhatsApp, configure `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_ACCESS_TOKEN`, habilite `CLINICAR_WHATSAPP_ENABLED` e utilize templates aprovados na Meta. Template e idioma são configurações técnicas do servidor.

Em **Alertas → Colaboradores**, o administrador seleciona um colaborador ativo para receber alertas de estoque em nível de atenção e um administrador ativo para os níveis crítico e zerado. Ambos precisam ter telefone cadastrado. Os alertas de manutenção dependem das regras, das configurações do destinatário e das opções de habilitação do agendador e do envio no `.env`.

Para receber confirmações da Meta, configure o webhook em uma URL pública acessível ao provedor e defina `WHATSAPP_WEBHOOK_APP_SECRET` e `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. O backend valida a assinatura dos retornos.

Consulte [Alertas de estoque](documentacao/alertas-estoque-whatsapp.md), [Alertas de manutenção](documentacao/alerta-manutencao-whatsapp.md) e [Notificação de exclusão de veículo](documentacao/notificacao-exclusao-veiculo.md).

## Segurança e integridade

- Senhas protegidas com BCrypt, sessões no backend, cookies HttpOnly, perfis de acesso e autenticação TOTP.
- Segredos MFA criptografados e tokens com expiração e consumo único.
- Proteção CSRF e limitação de tentativas nos fluxos de autenticação.
- Verificação de duplicidades durante o preenchimento e no servidor.
- Proteção contra repetição de operações e alterações concorrentes em registros.
- Auditoria administrativa e movimentações de estoque com identificação do responsável.

Não versione o `.env`, credenciais, tokens ou backups. Em produção, utilize HTTPS, segredos próprios, configuração adequada dos cookies, SMTP real e políticas de acesso e rede compatíveis com a implantação.

## Testes e desenvolvimento

Para desenvolvimento fora do Docker, utilize Java 23 e Node.js 22.14.0, além das configurações locais necessárias ao backend.

Backend, a partir da pasta `backend`:

```powershell
./mvnw.cmd -B test
```

Frontend, a partir da pasta `frontend/clinicar`:

```powershell
npm ci
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
npx playwright test
```

Os testes de navegador utilizam respostas simuladas da API para não alterar cadastros nem enviar notificações reais. Localmente, o Playwright está configurado para Google Chrome; no CI, utiliza Chromium.

Os testes `ModernizacaoMySqlIT` exigem um banco MySQL descartável, configurado por `CLINICAR_TEST_MYSQL_URL` e `CLINICAR_TEST_MYSQL_PASSWORD`. Execute-os com `./mvnw.cmd -B -Dtest=ModernizacaoMySqlIT test`. Nunca utilize o banco operacional nesses testes.

O workflow de qualidade executa testes, compilação, validação de migrações, configuração do Nginx e testes de navegador. É acionado em pushes e pull requests para `main`, ou manualmente. A publicação de imagens depende dos checks e das credenciais configuradas no GitHub.

## Documentação

- [Orientações permanentes para o Codex](AGENTS.md).
- [Ponto de retomada do desenvolvimento](documentacao/retomada-modernizacao.md).
- [Fluxo de trabalho com Codex e organização das etapas](documentacao/fluxo-trabalho-codex.md).
- [Modernização e pendências do projeto](documentacao/modernizacao-profissional.md).
- [Validação dos seletores e medições de desempenho](documentacao/validacao-seletores-20261012.md).
- [Histórico de movimentações paginado e preservação de saldos](documentacao/historico-movimentacoes-paginado.md).
- [Responsividade visual](documentacao/responsividade-visual.md).
- [Auditoria](documentacao/auditoria.md).
- [Validação de duplicidades](documentacao/validacao-duplicidade-cadastros.md).
- [Continuidade do cadastro de fornecedor](documentacao/continuidade-cadastro-fornecedor.md).
- [Continuidade entre fornecimento e estoque](documentacao/continuidade-fornecimento-estoque.md).
- [Fluxo de usuário, veículo e alertas](documentacao/fluxo-usuario-veiculo-alertas.md).

**CliniCar — Sistema de gestão para oficina mecânica. Trabalho de Conclusão de Curso.**
