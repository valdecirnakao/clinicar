# Justificativa e auditoria de reset do 2FA

O modal de confirmação exige uma justificativa de 10 a 1000 caracteres, desconsiderando espaços nas extremidades. O backend também exige o motivo. O administrador responsável vem da sessão autenticada, nunca do corpo da requisição.

Cada reset confirmado grava em `auditoria_reset_mfa`: ID e nome do usuário afetado, ID e nome do administrador responsável, justificativa e instante da operação. O registro não contém senhas, segredos TOTP, QR Codes ou tokens. Os nomes e IDs são preservados mesmo que os cadastros sejam alterados ou removidos posteriormente.

A gravação da auditoria, a invalidação dos desafios pendentes e a remoção do vínculo do 2FA ocorrem na mesma transação. Se alguma gravação falhar, o reset é desfeito. O WhatsApp continua sendo solicitado após a confirmação da transação. Um usuário sem vínculo de 2FA não gera um novo reset nem outro registro.

## Banco existente

Aplicar `bd/migrations/008_auditoria_reset_mfa.sql` antes de atualizar o backend. A migração apenas cria a tabela e seus índices. Bancos novos já possuem a definição em `bd/init.sql`. Resets anteriores não recebem justificativas retroativas, pois não foram coletadas.

## Consulta para auditoria

Os instantes são gravados em UTC. Para visualizar em horário de Brasília no MySQL:

```sql
SET time_zone = '+00:00';
SELECT id, usuario_id, usuario_nome, administrador_id, administrador_nome,
       justificativa,
       CONVERT_TZ(realizado_em, '+00:00', '-03:00') AS realizado_em_brasilia
FROM auditoria_reset_mfa
ORDER BY realizado_em DESC, id DESC;
```

Não existe endpoint de edição ou exclusão desses registros. O acesso direto ao banco continua sujeito às permissões do banco; esta tabela não é um mecanismo de proteção contra alterações feitas por administradores do próprio banco.

## Validação manual

1. Recarregar a tela e abrir o reset de um usuário de teste com 2FA ativo.
2. Confirmar que o botão fica desabilitado com justificativa vazia, apenas espaços ou menos de 10 caracteres.
3. Escrever um motivo completo e confirmar. Conferir o registro no banco com o administrador autenticado e o usuário selecionado.
4. Verificar que o usuário precisa configurar o autenticador no próximo login.
5. Cancelar outro reset e confirmar que não houve alteração nem novo registro.
6. Validar que alterações posteriores de nome não modificam os nomes já gravados na auditoria.

Os testes automatizados usam banco isolado e WhatsApp simulado; não resetam o 2FA de usuários do ambiente local.
