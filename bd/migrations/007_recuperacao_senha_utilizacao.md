# Data de utilização dos links de recuperação

A migração adiciona `password_reset_token.usado_em`, opcional, sem alterar tokens ou usuários existentes. A redefinição registra a data real de uso na mesma transação da alteração da senha. A resposta de reutilização informa `dataHoraUtilizacao` quando disponível.

A data genérica `dataHora` de um erro corresponde à resposta do servidor e não é utilizada para representar o uso do link. Tokens antigos não recebem datas presumidas. Links invalidados por novo pedido de recuperação também não recebem uma data de utilização fictícia.

Aplicar o arquivo SQL uma vez antes de subir o backend atualizado em um banco existente. Novos bancos já incluem a coluna em `bd/init.sql`. A migração foi aplicada ao banco local em 01/10/2026, com backup da tabela antes da alteração.

Para testar: solicite um novo link, redefina a senha com sucesso e reabra esse mesmo link. O formulário deve ser desabilitado e a mensagem deve mostrar o momento da utilização original. Abrir novamente não altera essa data.
