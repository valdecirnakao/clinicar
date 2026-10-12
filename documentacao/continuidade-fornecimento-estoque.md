# Continuação do fornecimento para o controle de estoque

Após cadastrar um fornecimento de peça, o sistema oferece continuar com o controle de estoque ou concluir por enquanto. A etapa usa o formulário completo de estoque já existente, com a peça vinculada ao fornecimento preenchida e protegida contra troca durante a continuação.

A tela carrega as peças, os locais ativos e os controles existentes antes de abrir o cadastro. O usuário informa local, saldo físico, reservas, limites de reposição e custo médio. O preço do fornecimento não é usado automaticamente como custo médio e a quantidade mínima de compra não é usada como saldo físico. Registrar um fornecedor ou fornecimento não registra uma entrada de mercadoria.

Uma peça pode ter controles em locais diferentes. Quando há controle existente, o modal permite consultá-lo. A seleção de locais já cadastrados fica bloqueada e a validação também impede salvar uma duplicidade. A restrição correspondente do backend continua sendo a garantia contra operações simultâneas.

O contexto da continuação é removido da URL após o formulário ser preparado. Se a peça não for encontrada ou o carregamento falhar, nenhum cadastro é aberto automaticamente e o contexto é preservado para nova tentativa ao atualizar a página. Cancelar o estoque mantém os cadastros anteriores salvos.

## Verificação manual

1. Cadastre um fornecedor de peça e continue com uma peça nova ou existente.
2. Preencha e salve as condições do fornecimento. Confira o modal de continuação do estoque e a identificação da peça.
3. Escolha continuar. Confira a peça preenchida e o formulário completo de identificação, quantidades, reposição e revisão.
4. Escolha um local, informe os dados obrigatórios e salve. Confira o controle de estoque na listagem.
5. Repita com uma peça que tenha estoque. Consulte o controle pelo botão correspondente e confira o bloqueio do mesmo local. Um novo local deve permitir um novo controle.
6. Escolha concluir por enquanto ou cancele o cadastro de estoque. Confira que fornecedor, peça e fornecimento permanecem salvos e que nenhum estoque foi criado.

Os testes cobrem a oferta somente após sucesso, proteção contra cliques repetidos, preenchimento da peça, ausência de entrada automática, identificação de estoques existentes, bloqueio de duplicidade, identificador inválido, peça não encontrada e falha no carregamento.
