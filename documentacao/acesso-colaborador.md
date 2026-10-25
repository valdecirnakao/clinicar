# Acesso do colaborador

O colaborador usa o menu próprio com o mesmo padrão visual do administrador. O painel apresenta, por guias, pendências operacionais relacionadas ao usuário autenticado. Todos os colaboradores podem atuar na recepção: cadastrar clientes e veículos, configurar os alertas do cliente e criar agendamentos. O servidor confirma o perfil e os vínculos dos registros em cada operação.

## Funções configuradas pelo administrador

No cadastro do colaborador, o administrador define as funções **execução técnica** e **operações de estoque**. Colaboradores já existentes mantêm ambas habilitadas por padrão. A recepção continua disponível a todos. A interface exibe a ação técnica somente quando a função está habilitada, e o servidor reforça a regra mesmo em requisições feitas fora da interface. Ajuste manual de estoque, reset de 2FA, inativação de usuário e auditoria continuam restritos ao administrador.

Todos os colaboradores podem consultar o histórico de movimentações do estoque de peças. A consulta é somente leitura, inclusive sem a função de operações de estoque. Clientes não acessam esse histórico interno; consultas administrativas de devoluções de atendimentos continuam restritas ao administrador.

## Atendimento atribuído

A ordem segue as etapas Aberto → Em diagnóstico → Aguardando aprovação → Aprovado → Em execução → Concluído → Entregue. O diagnóstico é obrigatório antes de solicitar aprovação, e a execução começa somente após aprovação. Durante a execução, uma pausa exige motivo e registra quem pausou e retomou. O mecânico atribuído pode registrar relato, quilometragem, checklist e até dez fotos JPEG, PNG ou WebP de até 3 MB. O administrador também pode consultar os registros técnicos. As peças utilizadas são lançadas no fluxo próprio do atendimento; a baixa de estoque acontece na conclusão, conforme a regra existente.

As consultas de rotina usam o ID da sessão autenticada para limitar os agendamentos e atendimentos atribuídos. Fotos e checklist seguem a mesma verificação. Clientes não acessam os registros técnicos internos.
