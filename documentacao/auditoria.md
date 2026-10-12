# Consulta de auditoria

A opção **Auditoria**, no menu administrativo, reúne registros já persistidos de reset de 2FA, exclusão de usuários, movimentações de estoque e, a partir desta implementação, consultas, visualizações de detalhes e exportações da auditoria.

Somente usuários administradores com sessão ativa podem consultar. O servidor verifica a autorização; a rota Angular também está sob a proteção administrativa existente. Nenhuma rota permite editar ou excluir os registros. Não foi introduzido um novo perfil de auditor nem um mecanismo geral de permissões.

Filtros: período inclusivo, componente, operação, nome do responsável ou registro, ID do responsável e ID do registro afetado. No estoque, o registro afetado é a peça; o detalhe contém também o ID do controle de estoque. A consulta é paginada no servidor (até 100 por página), com ordenação permitida por lista explícita. As datas são exibidas no horário da oficina, São Paulo (UTC-03).

A exportação CSV usa os mesmos filtros, até 5.000 registros, e neutraliza fórmulas de planilha. Consultas, detalhes e exportações bem-sucedidas são registrados em `auditoria_consulta` com identidade da sessão, filtros ou evento acessado e data/hora. A entrega dos dados falha se o registro do acesso não puder ser salvo. Respostas usam `Cache-Control: no-store`. Senhas, segredos MFA, tokens, CPF e e-mail não integram os DTOs de auditoria.

Os registros existentes representam operações concluídas; falhas e alterações gerais dos demais cadastros não são retroativamente reconstruídas. Saldo anterior/posterior aparece quando registrado na movimentação. Nomes de peças usam o catálogo atual, pois o histórico de estoque existente não preservava esse retrato; nomes de usuários e responsáveis preservados nos eventos são usados diretamente. Autoria ausente em movimentos antigos aparece como “Não registrado”.

A migração `bd/migrations/020_auditoria_consulta.sql` cria a tabela para bases existentes; `bd/init.sql` contempla bases novas. O ambiente local com Hibernate `ddl-auto=update` também cria a tabela. Não há exclusão automática ou prazo de retenção imposto: uma política de retenção e cópias protegidas deve ser definida pelo responsável pelo sistema antes de implantação em produção. A aplicação não torna os registros imutáveis para administradores do banco.
