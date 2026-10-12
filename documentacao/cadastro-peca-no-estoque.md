# Cadastro de peça a partir do controle de estoque

No modal de novo controle de estoque, a seleção de peça oferece **Cadastrar nova peça**, inclusive quando a busca não encontra resultados.

O cadastro usa o formulário completo de peças, com as mesmas validações de obrigatoriedade e duplicidade e os atributos específicos de óleo de motor. Após salvar, a peça é adicionada à lista e selecionada no controle de estoque. Local, quantidades, custo médio e demais dados já preenchidos são preservados.

Ao cancelar o cadastro da peça, a seleção é reaberta com a busca anterior. O botão **Voltar ao estoque** retorna ao formulário sem alterar o item selecionado. Uma falha ao salvar mantém o cadastro da peça aberto para correção.

A peça só é vinculada a um controle de estoque persistido quando o usuário salva esse controle. A opção não é apresentada na edição nem quando a peça está fixada pelo fluxo de fornecimento.

## Teste manual EST-01

1. Abra **Peças → Controle de estoque → Novo controle**.
2. Preencha o local e alguns dados de estoque.
3. Abra a seleção da peça e busque um produto inexistente.
4. Clique em **Cadastrar nova peça**, preencha o cadastro e salve.
5. Confira a peça selecionada e a preservação dos dados do estoque.
6. Complete os campos obrigatórios e salve o controle de estoque.
7. Repita cancelando o cadastro da peça e confirme o retorno à seleção sem perder os dados.
