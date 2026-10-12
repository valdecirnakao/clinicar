# Mensagens de operações na interface

As confirmações simples de sucesso ficam visíveis por cinco segundos e podem ser fechadas pelo botão ×. O prazo pausa enquanto o mouse ou o foco do teclado estiver sobre a mensagem e retoma o tempo restante ao sair. Cada confirmação nova possui seu próprio prazo.

Erros de operação e avisos importantes não desaparecem automaticamente. As mensagens de validação continuam junto dos formulários e campos, sem temporizador. Avisos que fazem parte de uma confirmação e telas de conclusão com próximos passos permanecem disponíveis. Fechar uma mensagem não desfaz uma operação, não libera campos bloqueados e não reabre um formulário já concluído.

As antigas chamadas de `alert()` foram substituídas pelo serviço de notificações da interface, mantendo as cores do projeto. Mensagens já exibidas em cartões usam a mesma diretiva de comportamento. As notificações globais são removidas quando há navegação para outra página; os temporizadores dos cartões são cancelados quando o componente é destruído.

Uma entrega concluída com falha no envio da OS aparece como aviso persistente, e não como confirmação temporária de sucesso total.

## Verificação manual

1. Cadastrar, editar ou excluir um registro permitido: conferir a confirmação e o desaparecimento após cinco segundos.
2. Fechar uma confirmação pelo × antes do prazo: conferir que ela não reaparece.
3. Manter o mouse ou o foco no botão de fechar: aguardar mais de cinco segundos e conferir que a mensagem permanece. Ao sair, conferir que o tempo restante é respeitado.
4. Executar outra operação antes de terminar o prazo anterior: conferir que a nova confirmação recebe seu próprio prazo.
5. Provocar um erro de operação ou preencher um campo inválido: conferir que o aviso não desaparece por tempo e que a validação continua impedindo o envio indevido.
6. Fechar o aviso de redefinição concluída: conferir que o formulário não reaparece e que o redirecionamento ao login continua funcionando.
7. Conferir um aviso de falha parcial de entrega/envio: ele deve permanecer até o fechamento explícito.
8. Navegar para outra tela com uma notificação global aberta: conferir que a mensagem da tela anterior não é reapresentada.

Os testes automatizados cobrem prazo, fechamento, substituição de mensagem, pausa por leitura/foco, limpeza na navegação, cancelamento na destruição e preservação de avisos de falha parcial.
