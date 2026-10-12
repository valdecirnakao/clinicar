# Modernização do CliniCar

Solicitação aprovada em 11/10/2026. Preservar dados, regras de negócio e identidade visual. Este registro acompanha a implementação; itens pendentes não representam funcionalidades entregues.

## Backup anterior às mudanças

`C:/TG/backup/pre-melhorias-angular-lts-20261011`: código e Git (incluindo alterações não commitadas), configurações locais, dump transacional MySQL e imagens Docker. Índice dos arquivos e hashes SHA-256 preservados. Dump restaurado com sucesso em container isolado. Dependências/caches/artefatos regeneráveis excluídos; manifests, lockfiles e executáveis Docker incluídos. Dados e credenciais permanecem fora do Git.

Baseline frontend: 311 testes aprovados. Baseline backend: 273 testes aprovados.

## Etapas e critérios de conclusão

- [x] Backup recuperável e restauração isolada do banco.
- [x] Angular 18 → 19 → 20 → 21 LTS, versões compatíveis de Node/TypeScript/RxJS, testes e build.
- [x] Testes obrigatórios antes de publicar imagens; regressões de integração MySQL e fluxos de ponta a ponta.
- [x] Política de senha centralizada e aplicada em todos os caminhos de gravação.
- [x] Proteção CSRF e limitação de tentativas de autenticação/recuperação.
- [x] Migrações automáticas com baseline seguro da base existente.
- [ ] Paginação, filtros e ordenação no servidor nas listagens e seletores, com resumos independentes da página.
- [x] Notificações persistidas e processamento em segundo plano com tentativas controladas.
- [x] Estado das notificações e confirmação de entrega por retorno autenticado do provedor.
- [x] Componentes compartilhados de tabela, paginação, seleção e continuidade de cadastro.
- [x] Eliminar recálculos repetidos e carregar páginas sob demanda.
- [x] Reduzir gravações de último uso da sessão sem enfraquecer revogação e validade.
- [x] Ampliar auditoria de mudanças cadastrais, alertas e operações críticas.
- [x] Retomar cadastros interrompidos com etapas concluídas/pendentes.
- [x] Confirmação de abandono de dados não salvos.
- [x] Proteção de operações contra repetição da mesma solicitação.
- [x] Aviso de edição simultânea e proteção contra sobrescrita.
- [x] Visão operacional com acessos a agendamentos, atendimentos, estoque crítico e falhas de notificação.
- [ ] Medições comparáveis, verificações finais e atualização local Docker.

## Compatibilidade

Alvo: Angular 21 LTS. Node 22.14 satisfaz ^22.12; TypeScript 5.9 e RxJS 7.8 compatíveis. Migrações sequenciais oficiais, sem ignorar conflitos de dependências. Bootstrap mantido. Preservar Zone.js no aplicativo existente até validar qualquer mudança de detecção de alterações.

Fontes: https://angular.dev/reference/releases e https://angular.dev/reference/versions.

## Validação

Executar testes apropriados por etapa e registrar resultados reais. Segurança exige testes negativos; estoque exige concorrência e idempotência; migrações exigem banco novo e base existente; listagens exigem contagem, filtros e ordenação determinística. Nenhum ganho percentual será afirmado sem medição.

## Retomada e verificações de 11/10/2026

- Backend: 289 testes aprovados (`tmp/backend-modernizacao-06.log`).
- Frontend: 316 testes aprovados após atualização dos contratos dos seletores (`tmp/testes-angular21-20.log`). Foram acrescentados testes de rascunhos entre modais/guias, ainda em verificação final.
- MySQL: cinco cenários aprovados na cópia restaurada, mais três verificações de limites por cliente (`tmp/mysql-it-concorrencia-03.log`); cinco cenários aprovados no banco criado inicialmente do zero (`tmp/mysql-it-banco-novo-03.log`). Migração V22 validada nos dois schemas.
- Navegador: quatro fluxos aprovados (`tmp/playwright-fluxos-05.log`), com APIs simuladas e sem envio real de notificações.
- Build de produção aprovado (`tmp/build-angular21-16.log`).

Listagens principais de onze cadastros usam paginação no servidor e o componente compartilhado de paginação. O seletor compartilhado consulta cinco registros ao abrir e mantém a busca no servidor. Agendamentos, atendimentos e manutenção carregam catálogos auxiliares ao abrir formulários. Ainda é necessário concluir a revisão dos demais seletores e dos contextos de continuidade que carregam catálogos completos.

As imagens locais foram substituídas e a aplicação iniciou com sucesso. Itens restantes continuam pendentes conforme indicado no checklist.

### Verificações adicionais

- Frontend: 319 testes aprovados, incluindo a troca de guias sem falso aviso de abandono e rascunhos preservados ao abrir modais auxiliares (`tmp/testes-angular21-26.log`).
- Backend: 290 testes aprovados após a consulta específica dos controles de uma peça (`tmp/backend-modernizacao-07.log`).
- MySQL: seis cenários aprovados com retorno autenticado do WhatsApp e impedimento de edição antiga do saldo após uma entrada (`tmp/mysql-it-concorrencia-06.log`).
- Continuidade de fornecimento consulta somente o fornecedor/item identificado e o vínculo específico. Continuidade de estoque consulta somente a peça e seus controles; mantém esses controles separados da página atual.
- Imagem local do frontend em preparação; aplicação principal ainda não foi recriada.

## Atualização local verificada

- Aplicação executando Angular 21.2.25; tela pública de login verificada no navegador sem erros de JavaScript.
- Frontend: 320 testes aprovados (`tmp/testes-angular21-28.log`). Backend: 290 testes aprovados (`tmp/backend-modernizacao-08.log`).
- Banco restaurado: seis cenários MySQL aprovados após otimização dos vínculos da página (`tmp/mysql-it-concorrencia-08.log`). Retornos antecipados, fora de ordem e inválidos verificados; migrações até V23 também aprovadas no banco inicialmente criado do zero (`tmp/mysql-it-banco-novo-04.log`).
- Quatro fluxos de navegador com respostas controladas aprovados (`tmp/playwright-fluxos-05.log`). Esses cenários não substituem testes de aceitação com usuários reais.
- Imagens frontend/backend construídas no Linux e instaladas localmente. Arquivo de versões corrigido para incluir três dependências opcionais ausentes; nenhuma versão existente foi alterada. Configuração Nginx validada; o pipeline também a verifica antes de publicar.
- `npm audit --omit=dev` não reportou vulnerabilidades nas dependências de produção. Avisos das ferramentas de desenvolvimento permanecem registrados separadamente; não foram aplicados downgrades incompatíveis.
- Saúde da aplicação: UP. Banco principal migrado com baseline 20 e migrações 21, 22 e 23.
- Novo backup imediatamente anterior à publicação local: `backup/pre-publicacao-modernizacao-20261011`. Dados de sete tabelas de negócio comparados por hash das instruções de inserção: todos iguais antes/depois. Evidência em `validacao-dados.json`.
- Imagens anteriores recuperadas do arquivo de backup e mantidas sob os nomes `clinicar-frontend:pre-modernizacao-20261011` e `clinicar-backend:pre-modernizacao-20261011`. Os serviços do projeto professor não foram recriados.
- Confirmações reais de entrega dependem de URL pública e configuração do webhook/segredos da Meta; o código e sua autenticação foram verificados com dados sintéticos. Nenhuma mensagem real foi enviada nos testes.
- Não houve commit ou envio ao Git nesta etapa.

A revisão dos seletores auxiliares que ainda usam listas completas e a divisão adicional dos componentes grandes permanecem pendentes. A migração LTS e a atualização local estão concluídas; a modernização ampla não deve ser considerada encerrada enquanto essas revisões não terminarem.
