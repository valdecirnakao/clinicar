# Continuidade após cadastrar um serviço

Depois de salvar um serviço pelo gerenciamento de serviços, o sistema oferece Cadastrar fornecimento deste serviço ou Concluir por enquanto. O serviço permanece salvo caso o usuário conclua, cancele etapas posteriores ou haja uma falha ao abrir o fornecimento. Um serviço inativo pode ser salvo, mas precisa ser ativado antes de receber um novo fornecimento.

Ao continuar, o sistema consulta o serviço salvo e abre seu fornecimento. Se houver um fornecedor vinculado e ativo, fornecedor e serviço ficam preenchidos e as condições comerciais são abertas. Sem fornecedor, ou com fornecedor vinculado indisponível, abre-se a seleção de fornecedores ativos com a opção de cadastrar um novo. O cadastro auxiliar usa o formulário completo de fornecedor, retorna ao fornecimento e preserva o serviço. Cancelar a seleção ou o cadastro auxiliar preserva o rascunho.

O serviço de origem permanece preenchido durante essa continuação. O custo pago ao fornecedor, prazo de execução e quantidade mínima precisam ser informados; o preço de venda e a duração estimada do catálogo não são copiados para essas condições. O vínculo só é criado ao salvar o fornecimento. A regra de duplicidade por fornecedor e serviço continua aplicada, inclusive para vínculos inativos, com a opção de atualizar o fornecimento existente. Não é criado controle de estoque para serviços.

Os cadastros de serviços já abertos dentro de um fornecimento continuam retornando a esse rascunho. O fluxo iniciado pelo fornecedor também mantém sua continuação existente, sem abrir um segundo fluxo.

## Teste manual

1. Cadastre um serviço sem fornecedor. Após salvar, escolha Concluir por enquanto e confira que o serviço está na lista, sem fornecimento criado.
2. Cadastre outro serviço sem fornecedor e escolha Cadastrar fornecimento deste serviço. Confira o serviço preenchido e a seleção de fornecedores ativos.
3. Cancele a seleção e confira o serviço preservado. Abra a seleção novamente e cadastre um fornecedor novo. Ao salvar o fornecedor, confira o retorno com serviço e fornecedor preenchidos.
4. Informe as condições comerciais e salve. Confira o vínculo na lista de fornecimentos; não deve haver encaminhamento ao estoque.
5. Cadastre um serviço com fornecedor ativo selecionado e continue. Confira que as condições são abertas com ambos preenchidos.
6. No fornecimento, selecione um par já existente. Confira o bloqueio de novo cadastro e a ação para atualizar o vínculo existente.
7. Confira que um serviço inativo oferece concluir por enquanto e informa a necessidade de ativação antes de continuar.
8. Repita o fluxo iniciado pelo fornecedor e o cadastro auxiliar de serviço dentro do fornecimento, verificando que não é aberta uma continuação adicional.

Esta mudança não exige migração do banco de dados.
