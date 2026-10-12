# Cadastros a partir do fornecimento de serviços

O novo fornecimento permite selecionar um fornecedor ativo ou cadastrar um novo, e selecionar um serviço ativo ou cadastrar um novo. As ações ficam disponíveis mesmo quando a busca não encontra resultados. Os cadastros auxiliares reutilizam os formulários completos e retornam ao fornecimento, preservando fornecedor, serviço e condições já preenchidas. Cancelar um cadastro auxiliar retorna à seleção sem criar registros.

O fornecedor novo inicia com o item Serviços automotivos. O serviço novo inicia com prestador Fornecedor Externo e, se já selecionado, o fornecedor preenchido. A seleção de um serviço existente não altera seu fornecedor padrão no catálogo: o vínculo comercial com o fornecedor escolhido é registrado no fornecimento. Um mesmo serviço pode ser oferecido por diferentes fornecedores.

O valor base do serviço é o preço de referência cobrado ao cliente. O valor de custo do fornecimento é o preço pago ao terceiro. O prazo estimado do catálogo não preenche automaticamente o prazo negociado com o fornecedor. Custo, prazo e quantidade mínima exigem preenchimento explícito.

O par fornecedor e serviço é único, incluindo fornecimentos inativos. A validação destaca os dois campos e bloqueia criar um vínculo duplicado, oferecendo Atualizar fornecimento existente. Essa ação consulta o registro atual, abre suas condições e preserva o rascunho ao cancelar. O par permanece bloqueado durante essa atualização. Falhas de consulta mantêm o formulário e permitem nova tentativa. O backend e a restrição do banco também impedem duplicidade, inclusive em envios concorrentes.

Somente fornecedores e serviços ativos podem receber novos vínculos. Registros históricos continuam disponíveis para consulta e edição das condições, sem substituir seu vínculo por um registro inativo. Após salvar o fornecimento de serviços, o fluxo termina: serviços não possuem saldo físico nem controle de estoque. Peças eventualmente utilizadas são controladas pelo fluxo próprio de peças.

## Roteiro de teste manual

1. Abra Serviços → Fornecimentos → Novo Fornecimento. Na seleção do fornecedor, busque um nome inexistente e confira Cadastrar novo fornecedor. Cancele e confira o retorno sem perder o rascunho.
2. Cadastre um fornecedor por essa seleção e confira o retorno com ele preenchido.
3. Na seleção do serviço, busque um nome inexistente, escolha Cadastrar novo serviço e confira o formulário completo. Cancele para retornar à seleção, ou preencha e salve para retornar às condições.
4. Confira que o preço de venda do serviço não foi copiado para o custo do fornecimento, e que o prazo precisa ser informado.
5. Preencha as condições e salve. Confira o vínculo na lista e a ausência de direcionamento ao estoque.
6. Tente criar novamente o mesmo par. Confira ambos os campos destacados, o bloqueio de salvar e Atualizar fornecimento existente. Cancele a edição e confira o rascunho; depois atualize as condições e confira que continua existindo somente um vínculo.
7. Repita o teste com um fornecimento inativo. Atualize suas condições/status em vez de criar outro registro.
8. Associe o mesmo serviço a outro fornecedor ativo: o vínculo diferente deve ser permitido. Confira que fornecedores e serviços inativos não aparecem como opções de novo vínculo.
9. Repita a continuidade a partir do cadastro de um fornecedor de serviços, tanto escolhendo serviço existente quanto cadastrando um novo.

Não há alteração de esquema ou exclusão de dados nesta implementação.
