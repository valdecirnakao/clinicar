# Suspensão temporária do acesso de colaboradores

Férias e afastamentos podem motivar suspensão temporária. Este recurso controla o acesso ao sistema; a justificativa pode informar o motivo, sem exigir informações médicas ou documentos pessoais.

## Utilização

1. O colaborador entra com senha e 2FA e abre **Minha conta**.
2. Seleciona **Suspensão temporária (férias ou afastamento)**, informa justificativa, primeiro e último dias e confirma as consequências.
3. O administrador abre **Usuários → Solicitações de acesso**, confere as datas e aprova ou recusa com justificativa.
4. Se o início for hoje, a aprovação suspende imediatamente. Se for futuro, o acesso permanece ativo até o primeiro dia aprovado.
5. O sistema suspende o acesso no início do período e reativa no dia seguinte ao último dia. O retorno exige novo login e 2FA; sessões antigas continuam revogadas.

As datas incluem o último dia e são interpretadas no horário de Brasília. Exemplo: 10/10 a 20/10 significa suspensão nos dias 10 a 20, com retorno a partir de 21/10. O processamento automático ocorre a cada minuto, enquanto o backend estiver funcionando, e começa novamente após sua inicialização. Portanto, as mudanças podem ocorrer até aproximadamente um minuto após a virada do dia.

Somente colaboradores podem solicitar essa modalidade. Clientes seguem os fluxos de inativação e encerramento existentes. Uma solicitação pendente ou uma suspensão já agendada impede novos pedidos concorrentes. Datas ausentes, anteriores ao dia atual ou com fim anterior ao início são rejeitadas pelo backend. Um pedido cujo início já passou não pode ser aprovado: deve ser recusado e apresentado novamente com datas atualizadas.

## Proteção de alterações administrativas

Uma alteração administrativa que informa status, mesmo igual ao atual, ou que muda o perfil interrompe a suspensão programada e o retorno automático. Isso também vale para uma nova inativação administrativa durante o afastamento. A decisão administrativa prevalece e o sistema não reativa essa conta posteriormente. Para antecipar um retorno, o administrador pode ativar a conta na gestão de usuários.

O histórico mantém período, decisão, responsável, justificativas e horários efetivos de suspensão, retorno ou interrupção. Dados de veículos, agendamentos e atendimentos são preservados. Os estados do período são **Agendada**, **Em curso**, **Concluída** e **Interrompida**; a decisão original permanece registrada como aprovada.

Se o servidor voltar a funcionar depois do fim de uma suspensão em curso, a conta será reativada no próximo processamento, desde que nenhuma alteração administrativa tenha interrompido o período. Se ficar indisponível durante todo um período que ainda não havia iniciado, o sistema encerra o agendamento sem suspender o acesso retroativamente. Falhas na gravação revertem a alteração de status e permitem nova tentativa; cada solicitação é processada em transação própria.

## Atualização do banco

A migração `bd/migrations/011_periodo_acesso_usuario.sql` acrescenta campos à tabela de solicitações e deve ser aplicada uma vez antes de iniciar o backend atualizado. A definição também está em `bd/init.sql` para bancos novos. Nenhum usuário existente é inativado durante a instalação.

## Testes manuais

- **USU-16:** colaborador solicita período futuro; conferir datas no formulário, no histórico e no modal administrativo. Aprovar e conferir estado Agendada e acesso ainda ativo.
- **USU-17:** colaborador solicita início e fim hoje; aprovar, conferir Em curso, acesso inativo e bloqueio de todas as sessões. No dia seguinte, aguardar o processamento e conferir retorno, horário registrado e novo login com 2FA.
- **USU-18:** testar datas vazias, fim anterior ao início, início passado e ausência de confirmação. O envio deve ser impedido. Cliente não deve ter a opção temporária.
- **USU-19:** recusar com justificativa; conferir que o acesso permanece ativo e não há período agendado.
- **USU-20:** aprovar período futuro e depois salvar status na gestão administrativa; conferir Interrompida e ausência de execução automática. Repetir durante suspensão com nova inativação; o término não deve reativar a conta.
- **USU-21:** aprovar suspensão, conferir preservação dos históricos e acompanhamento da execução. Reinício, concorrência, retorno e falhas de gravação também são verificados nos testes automatizados com datas simuladas em banco isolado, sem alterar relógio ou contas reais.

Não altere o relógio do computador ou as datas diretamente no banco para acelerar os testes manuais. O retorno pode ser validado aguardando o dia seguinte, enquanto os testes automatizados já cobrem as transições sem espera.
