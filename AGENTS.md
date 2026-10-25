# Orientações para trabalhar no CliniCar

CliniCar é um TCC de Análise e Desenvolvimento de Sistemas: sistema web de gestão de oficinas mecânicas. Comunique-se em português e explique decisões técnicas de modo que o autor possa compreendê-las e defendê-las.

## Contexto e organização

- Consulte `README.md` para instalação e comandos. Ao retomar desenvolvimento, leia `documentacao/retomada-modernizacao.md`; consulte os documentos específicos somente quando relacionados à tarefa.
- Frontend: `frontend/clinicar`, Angular 21, TypeScript 5.9, Bootstrap 5; Node 22.14.0. O `package.json` da raiz não executa a aplicação Angular.
- Backend: `backend`, Java 23, Spring Boot 3.5.5 e Maven Wrapper. Código em `backend/src/main`; testes em `backend/src/test`.
- Banco: MySQL e Flyway; migrações em `backend/src/main/resources/db/migration`.
- Infraestrutura: `compose.yaml`, `compose.dev.yaml`, Dockerfiles e Nginx. Scripts de diagnóstico/recuperação em `scripts`.
- Documentação funcional e evidências em `documentacao`; texto-base acadêmico em `documentacao/CliniCar Base do TCC.md`.

## Implementação

- Inspecione o estado do Git e os arquivos envolvidos antes de editar. Preserve alterações existentes, inclusive arquivos novos; não resete nem sobrescreva trabalho de outras etapas.
- Faça alterações focadas no pedido, seguindo os padrões existentes. Preserve identidade visual, continuidade dos cadastros e proteção dos formulários não salvos.
- Preserve saldos, reservas, histórico de estoque, regras de devolução/correção, concorrência e idempotência. Cálculos completos não podem depender apenas da página exibida.
- Reforce autorização no servidor, considerando perfil, funções e vínculo do registro com o usuário autenticado; ocultar ações na interface é insuficiente.
- Preserve sessão, CSRF, TOTP, proteção de credenciais e auditoria. Consulte a documentação funcional para mudanças nesses fluxos.
- Crie novas migrações sequenciais para evoluir o banco; não reescreva migrações já aplicadas. Confira a última versão existente antes de numerar uma nova.
- Não repita scripts temporários de transformação já aplicados, mencionados no ponto de retomada.

## Dados e ambiente

- Use bancos descartáveis e dados sintéticos nos testes que gravam dados. Confira destino e isolamento antes de executar; nunca use o banco operacional como banco de testes.
- Preserve `.env`, chave MFA, senhas existentes e volumes MySQL. Não exiba segredos em respostas ou logs e não os inclua no Git.
- Não envie e-mails ou WhatsApp reais em testes; use simulações e Mailpit. Não altere serviços Docker de outros projetos, inclusive o projeto professor.
- Para atualizar os serviços locais com código da pasta, siga o README usando os dois arquivos Compose. Antes de executar, confira o projeto/serviços envolvidos e a autorização da tarefa; atualização local pode aplicar migrações.
- Antes de uma atualização do banco ou operação de recuperação, verifique backup e procedimento de reversão. Backups e credenciais devem permanecer fora do versionamento.

## Validação

Execute os comandos na pasta indicada. Instale dependências apenas quando necessário; utilize os lockfiles existentes.

| Finalidade | Pasta | Comando no Windows |
| --- | --- | --- |
| Testes backend | `backend` | `./mvnw.cmd -B test` |
| Verificação backend equivalente ao CI | `backend` | `./mvnw.cmd -B verify` |
| Instalação frontend | `frontend/clinicar` | `npm ci` |
| Testes frontend | `frontend/clinicar` | `npm test -- --watch=false --browsers=ChromeHeadless` |
| Compilação frontend | `frontend/clinicar` | `npm run build` |
| Testes de navegador | `frontend/clinicar` | `npx playwright test` |
| Integração MySQL isolada | `backend` | `./mvnw.cmd -B -Dtest=ModernizacaoMySqlIT test` |

- Integração MySQL requer `CLINICAR_TEST_MYSQL_URL` e `CLINICAR_TEST_MYSQL_PASSWORD` apontando para banco descartável. Não publique seus valores.
- Playwright inicia seu servidor na porta 4301 e usa Google Chrome localmente. Confira os mocks dos cenários relevantes; não substitua a API simulada pelo ambiente operacional.
- Execute testes proporcionais ao comportamento alterado; inclua cenários negativos de autorização, concorrência ou integridade quando pertinentes. Para alterações apenas documentais, confira comandos, links e consistência; não execute a aplicação sem necessidade.
- Registre resultados realmente observados, data, escopo e limitações. Testes antigos não comprovam a versão atual; não invente contagens, ganhos de desempenho ou resultados.
- O CI em `.github/workflows/docker-build.yml` roda em pushes/PRs para `main` e por acionamento manual. Não assuma execução automática na branch de desenvolvimento.

## Continuidade e entrega

- Ao concluir uma etapa de desenvolvimento, atualize o ponto de retomada com estado atual, validações, pendências e próximo passo. Mantenha-o curto; coloque detalhes em documentos específicos e histórico separado.
- Relacione mudanças relevantes aos requisitos e à justificativa técnica do TCC. Diferencie implementação, validação técnica e aceitação por usuários; não invente referências acadêmicas.
- Entregue um resumo do que mudou, por quê, validação realizada e limitações. Explique decisões relevantes em linguagem acessível.
- Organize etapas em commits pequenos quando o registro no Git fizer parte da tarefa autorizada. Se o pedido não incluir commit, apresente os grupos sugeridos e preserve as alterações locais. Não publique nem envie ao repositório remoto sem autorização.
- Veja `documentacao/fluxo-trabalho-codex.md` para exemplos de pedidos e organização das etapas.
