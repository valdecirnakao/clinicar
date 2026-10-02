# Proteção das contas administrativas

Um administrador não pode excluir nem inativar a própria conta. Para inativá-la, outro administrador deve realizar a operação. O backend identifica o responsável pela sessão autenticada e não aceita uma identidade informada no formulário.

A inativação de outro administrador e a remoção do perfil administrativo exigem que permaneça outro administrador ativo, com senha cadastrada e 2FA/TOTP configurado. Um cadastro administrativo recém-criado, que ainda não configurou o segundo fator, não atende a essa condição. A mesma regra vale tanto no menu de ações quanto no modal de edição e nas chamadas diretas à API.

As alterações administrativas bloqueiam os registros de administradores em ordem estável e revalidam o responsável e a disponibilidade de outro acesso. Isso impede que duas alterações simultâneas removam os últimos acessos administrativos. A exclusão usa a mesma ordem de bloqueio.

Quando um usuário é inativado, todas as suas sessões são revogadas na mesma transação. O backend recusa as próximas requisições protegidas em qualquer navegador. Uma tela já aberta pode continuar visível até fazer uma nova requisição; isso não preserva permissão para novas operações. A reativação não recupera sessões anteriores: é necessário entrar novamente com senha e 2FA.

## Testes manuais

1. Entre como ADM-1 e abra seu menu. A inativação deve estar desabilitada, com mensagem explicando que outro administrador deve realizar a operação. No modal de edição, o status também deve ficar bloqueado. Os demais dados pessoais continuam editáveis.
2. Cadastre ADM-2 sem concluir o 2FA. Tente remover o perfil administrativo de ADM-1: o sistema deve recusar porque não existe outro acesso configurado.
3. Conclua o 2FA de ADM-2 e entre com ele. Inative ADM-1. A operação deve ser permitida, preservando os registros vinculados.
4. Mantenha ADM-1 conectado em dois navegadores antes da inativação. Após a operação, novas requisições protegidas devem ser recusadas em ambos.
5. Reative ADM-1 usando ADM-2. As sessões anteriores de ADM-1 devem continuar inválidas; um novo login deve funcionar.
6. Tente excluir a própria conta por chamada direta à API: a operação deve ser recusada, independentemente da tela.

Os testes automatizados cobrem também alterações simultâneas de perfil, auto-inativação, responsável inativo, proteção contra outro administrador sem 2FA e revogação de múltiplas sessões.
