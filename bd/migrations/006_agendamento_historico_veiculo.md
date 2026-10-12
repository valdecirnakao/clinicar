# Dados históricos do veículo no agendamento

Aplique 006_agendamento_historico_veiculo.sql no banco existente antes de iniciar
esta versão. O Docker utiliza ddl-auto=validate: recompilar imagens não migra volumes.
Se as colunas já foram adicionadas por ddl-auto=update, execute somente o UPDATE
final da migração para preservar os registros existentes que ainda não têm cópia.

Novos agendamentos copiam os cinco dados do veículo na criação. Editar data,
observações ou outros campos com o mesmo veículo mantém essa cópia. Selecionar
outro veículo explicitamente em um agendamento editável gera uma nova cópia.
A listagem, os detalhes e a edição usam os dados preservados.

Para registros anteriores, a migração preserva os dados disponíveis no momento da
atualização e registra essa data em veiculo_preservado_em. Não é possível reconstruir
alterações anteriores sem uma fonte histórica confiável. Isso protege esses registros
contra futuras alterações, mas não recupera os dados da data original de criação.

O atendimento continua vinculado ao veículo e preserva seus próprios dados na conclusão;
a OS continua reutilizando seu PDF original. As cópias correspondem a momentos distintos.
