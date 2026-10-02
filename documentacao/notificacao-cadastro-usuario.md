# Notificação de cadastro de usuário

O backend publica `UsuarioCadastradoEvent` ao criar clientes (inclusive pelo cadastro público), colaboradores, administradores e o administrador inicial. O listener de WhatsApp só executa depois da confirmação da transação (`AFTER_COMMIT`, sem execução fora de transação). O envio não depende da definição da senha nem da configuração do segundo fator.

O administrador inicial permanece `PENDENTE_ATIVACAO` e continua recebendo o e-mail para definição da senha. Reenvio do e-mail de ativação, definição da senha e configuração do MFA não repetem a mensagem de cadastro. A tela administrativa não solicita mais o envio separadamente.

O template configurado em `whatsapp.template-name` e seu parâmetro de nome permanecem os mesmos. Esse template é compartilhado por todos os perfis. Se o texto mencionar a ativação por e-mail, use uma orientação condicional, por exemplo: “Se sua conta aguarda ativação, consulte seu e-mail para definir a senha e ativá-la.” Assim a instrução também atende usuários que já foram cadastrados com senha.

Falhas no WhatsApp são registradas e não desfazem o cadastro. Esta alteração não adiciona fila persistente, retentativas automáticas ou confirmação de entrega pelo destinatário.

## Validação manual

1. Atualize/aprove o template na Meta, preservando a variável de nome.
2. Cadastre um novo cliente e confirme uma única mensagem, antes de configurar o MFA.
3. Configure o MFA e confirme que a mensagem de cadastro não se repete.
4. Em um ambiente de testes com configuração inicial disponível, cadastre o administrador inicial. Confirme o WhatsApp e o e-mail de ativação, antes de definir a senha.
5. Reenvie o e-mail de ativação, defina a senha e configure o MFA. Nenhuma dessas etapas deve repetir a mensagem de cadastro.
6. Tente um cadastro rejeitado (por exemplo, e-mail duplicado): não deve enviar WhatsApp.

Os testes automatizados usam serviço de WhatsApp simulado e não enviam mensagens reais. Não é necessário apagar os cadastros existentes para aplicar a alteração; ela vale para novos cadastros.
