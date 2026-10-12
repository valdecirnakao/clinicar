# Continuidade do fornecedor de serviços

O fluxo permite escolher um serviço existente ou cadastrar um novo, mantendo o fornecedor selecionado até o preenchimento e a confirmação das condições de fornecimento.

Na seleção de serviços, a ação Não encontrei o serviço / Voltar às opções reabre o modal de continuação. Cancelar ou fechar a seleção sem ter escolhido um serviço também retorna às opções. Quando não há serviços cadastrados, a continuação é aberta diretamente. É possível cadastrar um novo serviço, tentar a seleção novamente ou concluir por enquanto, preservando o fornecedor já salvo.

O cadastro de um novo serviço utiliza o formulário completo, com o fornecedor associado. Após salvar, retorna ao fornecimento com serviço e fornecedor preenchidos. O vínculo comercial precisa da confirmação de custo, prazo, quantidade mínima e demais condições. A quantidade mínima inicia sem valor e não é preenchida automaticamente ao perder foco. Campos obrigatórios inválidos do cadastro são destacados e impedem avançar.

As trocas de modais aguardam o fechamento anterior. A navegação que falhar volta a mostrar as opções com mensagem de erro. O fornecimento bloqueia salvamentos simultâneos e mantém o formulário em caso de falha.

## Verificação manual

1. Cadastre um fornecedor de serviços e escolha selecionar serviço existente.
2. Com a lista vazia, confira as opções para cadastrar um serviço novo. Com registros disponíveis, busque um nome inexistente e use Voltar às opções.
3. Escolha cadastrar novo serviço, preencha o cadastro completo e salve. Confira fornecedor e serviço no fornecimento.
4. Preencha as condições obrigatórias e salve o fornecimento.
5. Repita selecionando um serviço existente. Cancele a busca sem seleção e confira o retorno às opções.
6. Escolha concluir por enquanto. Confira que o fornecedor permanece salvo, sem criar serviço ou fornecimento automaticamente.
