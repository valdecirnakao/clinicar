# Histórico veicular

O relatório está disponível para administradores no menu **Histórico veicular** e no ícone de histórico da lista de veículos. Reúne agendamentos e atendimentos vinculados ao mesmo veículo, com os registros mais recentes primeiro.

## Como usar

1. Selecione o veículo. As datas inicial e final são opcionais.
2. Escolha a situação e clique em **Consultar histórico**.
3. Consulte a identificação registrada, quilometragem, relatos, diagnóstico, serviços, peças e recomendações disponíveis.
4. Clique em **Exportar PDF** para baixar todos os registros dos filtros escolhidos, incluindo os que aparecem em outras páginas da tela.

A paginação segue o padrão das tabelas do sistema: 5, 10, 20 ou 50 registros por página, intervalo exibido, páginas numeradas e atalhos para a primeira e a última página. Alterar filtros ou o tamanho da página retorna à primeira página. Os resumos continuam considerando o resultado completo da consulta.

O cabeçalho mostra o cadastro atual do veículo. Cada registro usa a identificação histórica preservada no agendamento ou atendimento. Registros sem identificação histórica recebem uma observação explícita. Alterar o cadastro atual não permite reconstruir informações antigas que nunca foram armazenadas.

## Regras do relatório

- O período inclui integralmente a data final e usa a data agendada ou a entrada do atendimento; na ausência desta, usa o início real ou a criação.
- O total soma apenas atendimentos concluídos ou entregues. Agendamentos apresentam estimativas e não entram nesse total.
- A última quilometragem é a informação mais recente disponível entre os atendimentos selecionados, priorizando a saída sobre a entrada.
- Os nomes de serviços e peças usam os cadastros disponíveis na consulta. Itens de serviço cancelados são excluídos.
- O relatório consulta dados sem alterar registros, movimentar estoque, reenviar e-mails ou substituir as OS originais.
- Ao concluir novos atendimentos, o sistema exige a quilometragem de saída. Ela deve ser inteira, não negativa e igual ou superior à entrada, quando informada. A confirmação registra o KM e conclui o atendimento na mesma operação. Registros antigos não recebem valores presumidos.
- O limite é de 5.000 agendamentos e atendimentos no período consultado. Ao ultrapassá-lo, reduza o período.
- O acesso exige uma sessão de administrador. Respostas do relatório e do PDF usam `Cache-Control: no-store`.

## Teste manual

1. Abra o histórico de um veículo com agendamento e atendimento anteriores à alteração de placa/modelo. Compare o cabeçalho atual com a identificação preservada em cada registro.
2. Filtre um único dia e verifique os registros até o final desse dia. Inverta as datas e confirme a mensagem de validação.
3. Escolha **Finalizados** e confira o total dos atendimentos concluídos ou entregues. Estimativas de agendamentos e atendimentos cancelados não devem compor esse total.
4. Exporte o PDF e compare o período, situação, registros, valores e identificação histórica com a consulta.
5. Escolha um período sem registros e confirme a mensagem de histórico vazio.
6. Em um atendimento aberto, clique em **Concluir**. Verifique que o KM de saída é obrigatório, que valores menores que a entrada são rejeitados e que um valor válido aparece no histórico após a conclusão.

## Validação automatizada

Os testes de integração verificam as consultas reais, preservação da identificação, limites de datas, filtros e totais. Os testes de PDF verificam conteúdo histórico e múltiplas páginas. Os testes da interface verificam requisições autenticadas, alteração de filtros, cancelamento de consultas anteriores, exibição dos dados e exportação. Também há verificações de acesso administrativo e de parâmetros inválidos.

Esta funcionalidade não adiciona tabelas ou colunas. Ela utiliza os dados históricos das migrações `005_os_historico_veiculo.sql` e `006_agendamento_historico_veiculo.sql`, já integrantes do projeto.
