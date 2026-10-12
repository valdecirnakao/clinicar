# Continuidade a partir do cadastro da peça

Depois de salvar uma peça no catálogo, o sistema oferece **Associar fornecedor** ou **Concluir por enquanto**. A peça permanece salva mesmo que o usuário encerre a continuação.

## Etapas

1. Selecionar um fornecedor ativo, pesquisando razão social, nome fantasia ou CNPJ, ou cadastrar um novo com o formulário completo. Cancelar esse cadastro retorna à seleção, mantendo a peça original.
2. Com fornecedor e peça definidos, conferir as condições do fornecimento. Se o vínculo já existe, o sistema oferece editar ou utilizar o registro existente. Um vínculo inativo precisa ser atualizado antes de continuar. Não é permitido cadastrar outro fornecimento para o mesmo par fornecedor/peça.
3. Depois de salvar ou utilizar o fornecimento, continuar ao controle de estoque com a peça preenchida. Os controles existentes são identificados por peça e local; um fornecedor diferente não cria outro saldo para a mesma peça no mesmo local.

O preço de fornecimento e a quantidade mínima de compra não se tornam custo médio ou saldo inicial automaticamente. O saldo inicial deve representar a quantidade física real. Compras posteriores devem ser registradas por movimentações de entrada.

## Status de fornecedores

O formulário de cadastro/edição permite indicar Ativo ou Inativo. Fornecedores existentes antes desta alteração permanecem ativos. Fornecedores inativos continuam no gerenciamento e preservam os vínculos anteriores, mas não aparecem nos seletores de novos vínculos. O backend também rejeita novos fornecimentos associados a fornecedores inativos.

Aplicar `bd/migrations/013_status_fornecedor.sql` antes de iniciar o backend atualizado quando o banco já existir. A migração é idempotente e não remove registros.

## Validação manual

- Cadastrar uma peça, concluir por enquanto e confirmar que ela permanece no catálogo.
- Cadastrar outra peça, selecionar um fornecedor ativo e conferir peça/fornecedor preenchidos no novo fornecimento.
- Buscar um fornecedor inexistente, cadastrar um novo e confirmar que o fluxo segue com a peça original.
- Cancelar o novo fornecedor e confirmar o retorno à seleção.
- Inativar um fornecedor em sua edição e confirmar que ele não aparece na seleção da peça.
- Repetir a continuação para um par já cadastrado: conferir a opção de utilizar/editar o fornecimento, sem criar duplicatas.
- Com fornecimento inativo, conferir que continuar fica bloqueado até atualizar o status.
- Continuar ao estoque, conferir a peça e os controles existentes; confirmar que nenhum saldo ou movimentação é criado antes da confirmação do usuário.
- Simular falha de carregamento ou navegação: confirmar mensagem de erro, opção de tentar novamente e preservação dos registros já salvos.
