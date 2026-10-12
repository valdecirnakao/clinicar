# Exclusão de cadastro de usuário sem vínculos

Na lista administrativa, **Deletar usuário** aparece somente para cadastros sem referências no sistema e sem configuração de 2FA. O modal identifica nome e e-mail, explica que a exclusão é permanente e exige justificativa de 10 a 1000 caracteres. Cancelar não modifica o cadastro.

São considerados vínculos: administrador inicial, ativação, desafios MFA, sessões (inclusive expiradas/revogadas), recuperação de senha (inclusive tokens utilizados), veículos, movimentações de estoque, agendamentos, atendimentos, serviços executados, previsões e envios de manutenção e auditorias de reset de MFA ou exclusão. Nas operações, contam tanto cliente quanto responsável. Nas auditorias, contam tanto usuário quanto administrador.

Cadastros vinculados continuam com **Inativar usuário** ou **Reativar usuário**, conforme seu status. Para um cadastro inativo sem vínculos, a reativação também permanece disponível ao lado da exclusão. A própria conta do administrador não pode ser excluída. O backend verifica novamente o perfil ativo do administrador, bloqueia autoexclusão e confere os vínculos no momento da confirmação, independentemente do que a tela enviou.

A exclusão física e o registro de auditoria ocorrem na mesma transação. Uma falha na auditoria ou na exclusão desfaz ambas. A auditoria preserva os IDs e nomes do usuário e do administrador, a justificativa e o horário em UTC, sem senha, segredo de 2FA, CPF ou e-mail. Esta auditoria não tem chave estrangeira para o cadastro removido. O registro não equivale a uma lixeira: restaurar o cadastro exigiria recuperação de backup. Administradores do banco ainda podem alterar diretamente a tabela; ela não constitui uma trilha imutável.

Para um banco existente, aplicar `bd/migrations/009_auditoria_exclusao_usuario.sql` antes de subir o backend atualizado. O script adiciona somente a tabela de auditoria. Bancos novos usam a mesma definição em `bd/init.sql`.

## Testes manuais

1. Cadastre um usuário descartável sem entrar com ele ou associar registros. Atualize a lista e verifique **Deletar usuário**.
2. Abra o modal, confira a identificação e cancele. Verifique que o cadastro continua disponível.
3. Tente justificar com espaços ou menos de 10 caracteres. A confirmação deve permanecer desabilitada.
4. Informe um motivo e confirme. O cadastro deve desaparecer, e a auditoria deve registrar responsável, usuário, motivo e data/hora.
5. Cadastre outro usuário e associe um veículo. A ação deve mudar para **Inativar usuário**. Confira inativação e reativação, preservando o veículo.
6. Abra a confirmação de exclusão de outro cadastro vazio e, em outra sessão administrativa, associe um veículo antes de confirmar. A exclusão deve ser recusada; a lista deve atualizar para permitir inativação.
7. Para um usuário com login, token de recuperação ou histórico de auditoria, confira que a opção de exclusão não aparece, mesmo sem veículos.

Consulta de auditoria com horário de Brasília:

```sql
SET time_zone = '+00:00';
SELECT id, usuario_id, usuario_nome, administrador_id, administrador_nome,
       justificativa,
       DATE_FORMAT(CONVERT_TZ(realizado_em, '+00:00', '-03:00'), '%d/%m/%Y às %H:%i:%s') AS realizado_em_brasilia
FROM auditoria_exclusao_usuario
ORDER BY realizado_em DESC, id DESC;
```
