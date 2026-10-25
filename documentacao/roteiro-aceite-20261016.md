# Roteiro de aceite funcional e visual

Executar em ambiente de testes com dados fictícios e notificações reais desativadas. Um participante de cada perfil deve registrar data, navegador, tamanho da tela, resultado (**passou**, **falhou** ou **não executado**), dificuldade encontrada e decisão de aceite. Os testes automatizados e a saúde da aplicação não substituem esta avaliação.

| Perfil | Tarefa guiada | Resultado esperado |
| --- | --- | --- |
| Administrador | Cadastrar/editar cliente, veículo e alertas; consultar painel e auditoria. | Associação correta, ações permitidas visíveis e dados formatados. |
| Recepção/colaborador | Cadastrar cliente, veículo e agendamento; tentar abrir ações restritas. | Fluxo concluído; reset de 2FA, inativação de usuário e ajuste de estoque indisponíveis. |
| Mecânico/colaborador | Abrir atendimento atribuído, registrar diagnóstico, itens e avanço do serviço. | Somente trabalhos autorizados podem ser alterados; histórico e saldo permanecem corretos. |
| Cliente | Editar dados próprios, consultar veículo e histórico, criar agendamento, examinar e decidir orçamento. | Nenhum dado de outra pessoa aparece; orçamento decidido corresponde à versão mostrada. |

Em cada perfil, repetir as tarefas principais com teclado, foco visível, zoom de 200% e largura próxima à de um celular. Verificar contraste, leitura por tecnologia assistiva e ausência de rolagem horizontal que esconda ações. Para orçamento, testar também recusa, revisão pela equipe e novo aceite; uma versão antiga não pode ser aceita. Para estoque, verificar visualmente os níveis de alerta e o histórico após entrada, saída e correção com dados fictícios. Registrar captura de tela apenas sem dados pessoais reais.

Antes de declarar operação pronta, conferir no Google Drive pela web o arquivo `.ccbak` e o manifesto `.sha256` criados em 16/10/2026, observar o próximo disparo programado da tarefa e repetir periodicamente a restauração em MySQL descartável. Não restaurar o banco principal durante este roteiro.

| Data | Perfil/participante | Tarefa | Resultado | Observação/evidência | Aceite do participante |
| --- | --- | --- | --- | --- | --- |
|  |  |  | Não executado |  | Pendente |
