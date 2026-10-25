# Medição controlada de consultas — 16/10/2026

Foi usado o container `clinicar-modernizacao-mysql`, com volume separado do MySQL do CliniCar. Um schema novo recebeu a estrutura das tabelas `agendamento`, `atendimento`, `estoque_peca` e `atendimento_orcamento`, sem copiar registros da oficina. Foram inseridos 5.000 agendamentos, 5.000 atendimentos, 5.000 controles de estoque e 15.000 versões de orçamento, todos sintéticos. O backend e os serviços de notificação não participaram da medição.

Consultas paginadas representativas foram examinadas com `EXPLAIN ANALYZE` no MySQL 8.0.42. O tamanho abaixo é somente o JSON das linhas selecionadas pelo SQL; não é o tamanho real da resposta HTTP do sistema.

| Fluxo | Linhas retornadas | JSON das linhas | Plano observado |
| --- | ---: | ---: | --- |
| Agendamentos por situação e data | 20 | 2.040 bytes | Índice `idx_agendamento_status_inicio` |
| Atendimentos por cliente e criação, antes do ajuste | 20 | 2.028 bytes | Varredura reversa de `idx_atendimento_criado`; 1.960 linhas examinadas na amostra |
| Estoque em atenção | 20 | 1.340 bytes | Índice `idx_estoque_peca_status` |
| Versões de orçamento de um atendimento | 3 | 252 bytes | Índice único `(id_atendimento, versao)` |

A consulta de atendimentos por cliente tinha índice apenas para cliente e outro para data. Para retornar os mais recentes, o otimizador escolheu percorrer o índice de data e filtrar pelo cliente. A migração V30 adiciona `(id_cliente, criado_em, id)`, que coincide com a consulta existente no `AtendimentoRepository`.

Com duas tabelas de **mesmos 5.000 atendimentos sintéticos**, uma com o índice composto e outra sem ele, foram executadas oito medições alternadas por tabela. O `EXPLAIN ANALYZE` passou a usar diretamente o novo índice e a examinar as linhas daquele cliente. Medianas observadas: **4,325 ms sem o índice** e **0,113 ms com o índice**; intervalos: 3,73–11,9 ms e 0,086–0,35 ms, respectivamente. São tempos de execução do SQL nesse computador, não latências da página nem promessa de ganho em produção. O teste de integração em MySQL descartável verificou a presença das três colunas do índice e passou com 7 testes.

Limites: não foram medidos rede, serialização HTTP, autenticação, concorrência, cache ou dados com distribuição real. A aceitação por administrador, recepção, mecânico e cliente segue como etapa separada; usar o roteiro em [Orçamentos, operação e validação](orcamentos-operacao-validacao.md) e registrar observações reais, sem tratar testes automatizados como aceite de usuário.
