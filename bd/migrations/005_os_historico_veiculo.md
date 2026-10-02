# Preservação da OS

Em bancos existentes com atualização automática do esquema desabilitada, aplique
005_os_historico_veiculo.sql antes de iniciar o backend. Se o Hibernate já adicionou
as colunas (ddl-auto=update), não execute novamente o ALTER TABLE.

Novos atendimentos preservam placa, fabricante, modelo, cor e ano/modelo/combustível
na conclusão. Atendimentos em aberto continuam consultando o cadastro atual.
A primeira emissão armazena o PDF no banco; todos os reenvios usam esses mesmos bytes,
inclusive quando o envio de e-mail falha e precisa ser repetido. O destinatário é o
 e-mail atual do cliente. A emissão e os reenvios são serializados por atendimento.

OS antigas com registro de emissão, mas sem PDF armazenado, não são regeneradas:
o reenvio retorna uma mensagem solicitando recuperar o documento original.
O sistema anterior não armazenava o documento nem os dados históricos do veículo;
portanto não é possível reconstruir automaticamente informações já alteradas.
Para recuperar uma OS antiga, use o PDF original recebido por e-mail ou um backup
confiável: grave o PDF original em os_pdf_original e os dados do veículo presentes
nele nos campos históricos, com veiculo_preservado_em igual à data de emissão.
Nunca use o cadastro atual como substituto dos dados originais.

Atendimentos antigos concluídos sem registro de emissão preservam os dados
 disponíveis na primeira emissão após a atualização. Suas informações anteriores
à atualização não podem ser garantidas. Nenhum histórico é preenchido pela migração.
Correções de OS emitida continuam sem fluxo de revisão: não sobrescreva o PDF original.
