# Cadastro a partir do novo fornecimento de peças

No formulário **Novo Fornecimento**, os seletores passam a oferecer:

- **Fornecedor:** selecionar um fornecedor ativo ou cadastrar um novo fornecedor.
- **Peça/Insumo:** selecionar uma peça existente ou cadastrar uma nova peça.

Os cadastros auxiliares utilizam os mesmos formulários do gerenciamento, incluindo validação de obrigatórios, verificações de duplicidade e a classificação completa de óleos de motor. Ao salvar, o registro é selecionado no fornecimento em andamento; a continuação própria do gerenciamento de fornecedor/peça não é aberta neste contexto.

Cancelar o cadastro auxiliar retorna à respectiva seleção. As condições comerciais e o outro item já selecionado permanecem no rascunho. Se ocorrer erro ao salvar, o cadastro auxiliar permanece aberto para correção ou nova tentativa.

Com peça e fornecedor preenchidos, o usuário pode cadastrar as condições comerciais. Após salvar o fornecimento, a continuação para o controle de estoque preserva a peça. Nenhuma movimentação ou saldo é criado automaticamente. O estoque continua identificado por peça e local, e a verificação de duplicidade de fornecimento continua considerando fornecedor e peça.

## Roteiro de teste

1. Abrir **Peças → Fornecimentos → Novo Fornecimento**.
2. Clicar em selecionar fornecedor e testar seleção de fornecedor ativo existente.
3. Buscar um nome inexistente; verificar que **Cadastrar novo fornecedor** permanece disponível.
4. Cadastrar um fornecedor e confirmar o retorno ao fornecimento com ele selecionado.
5. Selecionar peça e testar tanto um registro existente quanto **Cadastrar nova peça**.
6. No cadastro auxiliar de óleo, conferir origem, linha/modelo, SAE, API, ACEA e norma OEM.
7. Cancelar os cadastros auxiliares e confirmar o retorno à seleção sem perda das condições já digitadas.
8. Preencher as condições e salvar; confirmar que a continuação oferece o controle de estoque da peça selecionada.
9. Repetir com um par fornecedor/peça já cadastrado e conferir que a validação impede duplicar o fornecimento.

## Fornecimento já existente

O par **fornecedor + peça** é único, inclusive quando o fornecimento está inativo. Selecionar o mesmo par destaca os dois campos e bloqueia o novo cadastro. A ação **Atualizar fornecimento existente** consulta o registro atual e abre a guia Condições do seu formulário de edição. Preço, prazo, quantidade mínima e status são atualizados nesse registro; cancelar a edição retorna ao rascunho do novo fornecimento.

Fornecedor e peça permanecem vinculados durante essa edição. Para outro vínculo, selecione outro fornecedor ou outra peça no novo cadastro. Uma compra posterior do mesmo fornecedor não é outro cadastro de fornecimento: deve ser registrada como movimentação de entrada do estoque.

Não há alteração de banco de dados nesta extensão do fluxo.
