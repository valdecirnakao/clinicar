# Mensagens de exclusão impedida por vínculos

As respostas de restrições de integridade agora distinguem exclusão de salvamento. Quando o banco identifica uma chave estrangeira conhecida, a mensagem informa o componente que mantém o vínculo, usando os nomes apresentados nas telas.

Exemplo: **Não foi possível excluir a peça / insumo porque existem vínculos em Controle de estoque. Revise os vínculos nesse componente antes de tentar novamente.**

A tradução cobre fornecimentos, estoque, movimentações, alertas, agendamentos, atendimentos, manutenção preventiva, histórico e vínculos de usuários. Também identifica a tabela referenciadora quando o nome da restrição foi gerado pelo Hibernate. Ambos os tratadores globais de erros aplicam a mesma tradução.

O banco pode informar apenas a primeira restrição encontrada. Após revisar esse vínculo, outro componente pode ainda impedir a exclusão. A mensagem não apresenta uma lista completa de dependências. Restrições desconhecidas recebem uma orientação geral com a ação correta, sem detalhes de SQL. As regras de preservação de histórico e integridade não são alteradas.

Para testar, tente excluir uma peça vinculada a um fornecimento ou controle de estoque e confira o nome do componente na mensagem. Repita com um fornecedor vinculado a um serviço e com um serviço utilizado em atendimento. Um cadastro sem vínculos deve continuar permitindo a exclusão.
