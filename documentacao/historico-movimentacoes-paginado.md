# Histórico de movimentações paginado

Implementado em 12/10/2026, mantendo o padrão visual de tabelas e paginação do CliniCar.

## Comportamento

- O histórico do estoque consulta dez registros por página inicialmente e permite alterar a quantidade por página.
- A pesquisa considera responsável, documento, motivo e origem. A ordenação usa data decrescente e ID decrescente como desempate.
- Nome e identificador do responsável e saldos anterior/posterior continuam sendo os dados preservados de cada lançamento. O saldo atual é o do controle de estoque e não é recalculado pela página visível.
- As seleções de recebimento original, saída original e movimentação para correção consultam cinco registros por página. A seleção de saída para devolução de atendimento também usa paginação, incluindo baixas antigas identificadas pelo documento/OS.
- O servidor calcula a quantidade disponível sobre todos os lançamentos vinculados. Correções de uma devolução ao fornecedor também alteram o saldo disponível do recebimento original.
- Ao registrar uma devolução ou correção, as validações transacionais existentes continuam verificando o saldo atualizado; a quantidade apresentada na tela não substitui essa validação.
- Consultas exigem administrador autenticado, respeitam o estoque ou atendimento informado e limitam a resposta a cem registros. Leitura com isolamento repetível mantém a contagem, os registros e os saldos coerentes dentro de cada consulta.

## Consultas

Histórico e seleções: `GET /api/estoque-pecas/{id}/movimentacoes/pagina`. Parâmetros: `pagina`, `tamanho`, `busca` e `finalidade` (`HISTORICO`, `CORRECAO`, `DEVOLUCAO` ou `FORNECEDOR`).

Devolução de atendimento: `GET /api/atendimento/{id}/devolucoes/pagina`, com `finalidade=ATENDIMENTO`.

As consultas individuais dessas duas rotas recuperam a seleção por ID, com o saldo disponível completo. Os endpoints antigos permanecem para compatibilidade; as telas usam as rotas paginadas.

Migração V24 acrescenta índices de consulta por estoque, atendimento e documento, combinados com data e ID. O índice já existente do vínculo com a movimentação original é utilizado nos cálculos. Nenhum lançamento ou saldo armazenado é alterado pela migração.

## Validação

- Frontend: 332 testes aprovados (`tmp/movimentos-frontend-final.log`), incluindo paginação, pesquisa, cancelamento de consulta anterior e uso do saldo completo nas correções.
- Backend: suíte completa de 298 testes aprovada (`tmp/movimentos-backend-final.log`); cinco testes específicos aprovados após acrescentar a cobertura de atendimento/OS antiga (`tmp/movimentos-integracao-final.log`). Esse cenário adicional foi executado depois da suíte completa.
- Navegador: 19 cenários aprovados (`tmp/movimentos-browser-final.log`); três cenários específicos, incluindo o celular, aprovados (`tmp/movimentos-browser-mobile.log`).
- MySQL isolado: migração V24 e saldo de recebimento com devolução corrigida aprovados (`tmp/movimentos-mysql.log`).
- Os testes verificam vínculos fora da página visível, exclusão de saídas sem saldo disponível, contagem independente da página, desempate por ID, identificação do responsável, limites, autenticação e autorização.

Backup anterior à atualização: `backup/pre-historico-paginado-20261012/clinicar.sql`, com hash SHA-256. Imagens anteriores preservadas com a tag `pre-historico-paginado-20261012`. Não foram enviadas notificações reais nos testes.

## Atualização local concluída

Frontend e backend aplicados localmente, Nginx validado, saúde `UP` e banco principal em V24. A comparação das instruções de inserção de sete tabelas de negócio antes/depois retornou dados iguais, incluindo os controles de estoque e seus lançamentos. Evidência: `backup/pre-historico-paginado-20261012/validacao-dados.json`.

A versão publicada foi conferida no navegador com dados e sessão simulados: histórico e paginação disponíveis, sem erros de JavaScript (`tmp/movimentos-publicado.log`). Nenhuma gravação no banco operacional foi realizada por essa conferência. Serviços do projeto professor e banco principal não foram recriados.

A versão final também passou novamente no MySQL isolado (`tmp/movimentos-mysql-final.log`). Não houve commit ou envio ao Git nesta etapa.
