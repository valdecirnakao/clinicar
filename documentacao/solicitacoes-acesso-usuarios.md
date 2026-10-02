# Solicitações de inativação e encerramento do acesso

Clientes e colaboradores não alteram diretamente seu status, seu perfil ou a exclusão do cadastro. Após autenticar com senha e 2FA, a área **Minha conta** permite solicitar **Inativar meu acesso** ou **Encerrar o acesso à minha conta**, com justificativa de 10 a 1000 caracteres e confirmação das consequências.

O encerramento aqui significa encerrar o acesso ao sistema. A aprovação inativa a conta e revoga suas sessões; não exclui veículos, atendimentos, agendamentos ou registros históricos. Exclusões físicas de cadastros vazios continuam sob controle administrativo, conforme o fluxo existente. Este recurso não implementa exclusão ou anonimização de dados pessoais.

## Como utilizar

1. Entre como cliente ou colaborador. Após o 2FA, o sistema abre **Minha conta** na rota correspondente ao perfil (`/menuCliente` ou `/menuColaborador`). Essas áreas disponibilizam o acompanhamento do acesso e das solicitações; não são menus completos de serviços operacionais.
2. Selecione o tipo, informe o motivo e confirme que entende as consequências. Envie a solicitação. O acesso permanece ativo até a aprovação.
3. Entre como administrador e acesse **Usuários → Solicitações de acesso**.
4. Use **Avaliar**, escolha **Aprovar e inativar o acesso** ou **Recusar a solicitação** e informe uma justificativa de 10 a 1000 caracteres.
5. Ao aprovar, o sistema registra a decisão, inativa o usuário e revoga todas as sessões na mesma transação. Ao recusar, registra a decisão e preserva o acesso atual.

Somente uma solicitação pode ficar pendente por usuário. Depois de uma recusa, uma nova solicitação pode ser enviada. A reativação depende do administrador e exige novo login: sessões anteriores continuam inválidas. Se a conta já estiver inativa, o usuário deve entrar em contato com a CliniCar; não há autoativação ou solicitação pública de reativação.

## Permissões e auditoria

O proprietário vem da sessão autenticada, e cada cliente ou colaborador vê somente suas próprias solicitações. Administradores podem listar, filtrar e analisar os pedidos. Administradores não usam o formulário de solicitação para contornar a proteção contra auto-inativação.

A solicitação preserva identificação, nome, e-mail, perfil e justificativa do solicitante no momento do envio. A decisão registra identificação e nome do administrador, justificativa e data/hora. Esses registros também contam como vínculos na regra de exclusão. A listagem administrativa e o acompanhamento pessoal usam paginação. Os horários são armazenados em UTC e apresentados pela tela no horário do navegador.

Se o perfil do solicitante mudar para administrador antes da decisão, a aprovação será recusada. O pedido poderá ser recusado por outro administrador e a conta deverá ser tratada pela gestão administrativa. Uma decisão já registrada não pode ser substituída por um segundo envio. A proteção vale também para chamadas diretas à API.

O fluxo de ativação inicial por senha, confirmação de e-mail ou 2FA permanece separado da reativação de uma conta administrativamente inativada. Resetar senha ou configurar 2FA não autoriza o usuário a alterar o status.

## Atualização do banco

Aplicar `bd/migrations/010_solicitacao_acesso_usuario.sql` antes de iniciar o backend atualizado. O script cria somente a tabela das solicitações. Bancos novos usam a mesma definição em `bd/init.sql`. Não existe preenchimento retroativo de solicitações.

Consulta para auditoria com horário de Brasília:

```sql
SET time_zone = '+00:00';
SELECT id, usuario_id, usuario_nome, usuario_perfil, tipo, justificativa, status,
       DATE_FORMAT(CONVERT_TZ(solicitado_em, '+00:00', '-03:00'), '%d/%m/%Y às %H:%i:%s') AS solicitado_em_brasilia,
       administrador_id, administrador_nome, motivo_decisao,
       DATE_FORMAT(CONVERT_TZ(decidido_em, '+00:00', '-03:00'), '%d/%m/%Y às %H:%i:%s') AS decidido_em_brasilia
FROM solicitacao_acesso_usuario
ORDER BY solicitado_em DESC, id DESC;
```

## Testes manuais

- Cliente: envie uma solicitação, confira que continua ativo e que o histórico mostra **Pendente**. Tente enviar outra solicitação: o formulário deve ficar bloqueado enquanto houver pendência.
- Colaborador: repita o teste na sua própria área. Cada perfil deve visualizar somente seus pedidos.
- Validação: teste motivo vazio, somente espaços, menos de 10 caracteres e ausência da confirmação. Nenhum pedido deve ser enviado.
- Recusa: cancele a análise antes de confirmar e confira que o pedido continua pendente. Depois recuse com justificativa. O solicitante deve continuar ativo, ver a decisão no histórico e poder enviar outro pedido.
- Aprovação: mantenha o solicitante conectado em dois navegadores, aprove com motivo e confirme que novas operações autenticadas são recusadas em ambos. Confira que os dados operacionais continuam disponíveis ao administrador.
- Reativação: reative pela gestão de usuários. Os cookies antigos não devem recuperar acesso; um novo login com senha e 2FA deve funcionar.
- Histórico: filtre pendentes, aprovadas, recusadas e todas. Teste anterior/próxima e 10, 25 e 50 registros por página na área administrativa.
- Permissões: cliente e colaborador não podem acessar a área administrativa nem alterar status/perfil ou excluir o próprio cadastro pela API.

A modalidade para férias e afastamentos de colaboradores está descrita em [Suspensão temporária](suspensao-temporaria-colaborador.md).
