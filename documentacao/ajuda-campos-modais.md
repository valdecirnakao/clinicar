# Ajuda de preenchimento e campos obrigatórios

Os campos dos modais exibem uma explicação do significado da informação ao receber foco. Os textos são centralizados no catálogo de ajuda e distinguem o contexto, como custo de compra de uma peça e preço cobrado do cliente.

Ao abrir um modal com guias ou selecionar uma guia, o card explica a finalidade daquela etapa. Próximo e Anterior também atualizam essa explicação. Ao abrir um modal de seleção de peças, serviços, fornecedores ou proprietários, a ajuda explica o que escolher e como a escolha será usada no formulário.

Ao focar em um campo, a explicação passa a ser específica daquele campo. Perder foco ou clicar em uma área sem campo remove a explicação. Selecionar novamente uma guia ou retornar a um campo mostra a ajuda correspondente. Isso não altera os dados preenchidos nem as validações.

Cada card exibe somente a ajuda do seu próprio modal. A abertura de outro modal remove a orientação anterior e apresenta a finalidade do novo formulário, seleção ou continuação. A continuação do fornecedor explica a escolha de um item existente ou novo e o cadastro posterior das condições de fornecimento. Modais sem orientação cadastrada não reutilizam textos de outra tela.

A revisão abrange usuários, veículos, fornecedores, peças, serviços, fornecimentos, estoque e suas movimentações, agendamentos, atendimentos, regras de manutenção e decisões de solicitações de acesso. Os modais de seleção e de justificativas também dispõem da área de ajuda. Campos técnicos explicam origem do óleo, SAE, API, ACEA e OEM. As mensagens de erro e as condições para salvar continuam separadas das explicações.

No novo fornecimento de peças, os campos obrigatórios vazios ou inválidos são destacados desde a abertura. O destaque desaparece quando o valor estiver correto e reaparece se o usuário apagar ou invalidar o conteúdo. Isso funciona tanto no cadastro direto quanto na continuação iniciada pelo fornecedor. Prazo vazio permanece pendente: zero deve ser informado explicitamente para pronta entrega.

## Verificação manual

1. Abra o novo fornecimento vindo de um fornecedor. Confira os campos Valor unitário e Prazo de entrega destacados na guia Condições. Informe custo positivo e prazo 0; os destaques devem desaparecer. Apague o custo e confira o retorno do destaque e o bloqueio do avanço.
2. Posicione o foco em Valor unitário. A ajuda deve explicar que é o preço pago pela oficina ao fornecedor por uma unidade da peça. Quantidade mínima deve explicar o menor pedido aceito pelo fornecedor.
3. Percorra campos de cadastros e edições nos demais módulos. Confira explicações diferentes para documentos, endereço, estoque, preço, prazo, unidade e dados técnicos.
4. Abra seleção de peças/serviços, movimentação de estoque, conclusão de atendimento e modais de justificativa. Confira a área de ajuda e o texto ao selecionar o campo.
5. Abra os cadastros e edições com guias. Confira a explicação da etapa inicial e clique nas guias habilitadas, Próximo e Anterior. Foque um campo e confirme que sua explicação substitui a da guia. Clique em uma área vazia para ocultá-la.
6. Abra as listas de seleção de peça, serviço, fornecedor e proprietário. Confira a orientação inicial e, ao focar na busca, a ajuda específica do campo de pesquisa.
7. Cadastre um fornecedor após focar o campo Número do endereço. Na continuação, confira a ajuda sobre associar um item ao fornecedor, sem o texto de Número. Foque a categoria fornecida para ver sua explicação. Teste também o retorno às opções quando uma peça não for encontrada.

Os testes verificam o significado por contexto, identificação de rótulos sem associação explícita, ajuda de checkboxes e campos técnicos, além dos destaques e da validação do novo fornecimento.
