# Notificação de exclusão de veículo

A exclusão confirmada envia o template Meta `eliminacao_veiculo`, em português (`pt_BR`), com dois parâmetros no corpo:

1. Nome social do proprietário, quando preenchido, ou seu nome de cadastro.
2. Fabricante, modelo e placa antes da exclusão, por exemplo `Toyota Corolla - Placa ABC-1234`.

O destinatário é o telefone do proprietário do veículo, não o do administrador que realizou a operação. O cadastro atual de usuários não possui uma preferência específica de recebimento desses avisos; esta funcionalidade segue o canal usado nas notificações existentes de veículos.

O envio ocorre em um listener síncrono `AFTER_COMMIT`, sem execução fora de transação. Uma exclusão recusada por vínculo, uma transação revertida ou um registro inexistente não disparam notificação. A remoção bloqueia a linha do veículo durante a transação para impedir notificações duplicadas em exclusões concorrentes.

Falha na API ou ausência de telefone não desfazem a exclusão. A tela remove o registro e apresenta um aviso persistente explicando que a notificação não foi enviada. A causa técnica fica nos logs do backend. A resposta da Meta confirma a aceitação do envio, não a entrega ou leitura no aparelho do cliente.

A API `DELETE /api/veiculo/{id}` passa a responder HTTP 200 com `mensagem`, `notificacaoWhatsapp` (`ENVIADA` ou `NAO_ENVIADA`) e `mensagemNotificacao`, para que a interface diferencie os dois resultados. Exclusões não autorizadas ou recusadas continuam retornando erro. O template é configurado em `meta.whatsapp.templates.eliminacao-veiculo` e utiliza as credenciais WhatsApp já existentes. Não exige alteração do banco de dados.

## Teste manual — VEI-06

1. Confirmar que o template está aprovado/ativo na Meta e corresponde aos dois parâmetros acima.
2. Cadastrar um veículo de teste sem vínculos, com proprietário e telefone sob seu controle.
3. Excluir esse veículo: confirmar a remoção da lista e o recebimento da mensagem com a placa formatada e os dados anteriores à exclusão.
4. Conferir que o destinatário é o proprietário, mesmo que outro usuário administrador execute a exclusão.
5. Tentar excluir um veículo vinculado a agendamento/atendimento: a operação deve ser recusada e não deve enviar mensagem.
6. Em ambiente de testes, conferir ausência de telefone ou falha de envio: a exclusão deve permanecer concluída, com aviso persistente de notificação não enviada.

Os testes automatizados usam H2 e mocks da API, sem excluir veículos reais nem enviar mensagens reais.
