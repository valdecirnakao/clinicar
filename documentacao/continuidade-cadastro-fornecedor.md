# Continuidade após cadastrar um fornecedor

Após salvar um novo fornecedor, um modal oferece selecionar uma peça/serviço existente, cadastrar um novo item ou concluir por enquanto. A categoria do fornecedor sugere o tipo de item; a seleção pode ser alterada, inclusive para fornecedores de itens diversos.

Para itens existentes, a tela de fornecimento abre a seleção do item com o fornecedor preenchido. Após escolher, abre a guia de condições. Para novos itens, abre o cadastro da peça ou do serviço; somente depois de salvar segue ao fornecimento com ambos os registros preenchidos. A associação comercial depende de salvar as condições do fornecimento.

O cadastro de serviço também preenche o fornecedor e o tipo de prestador externo. Durante essa continuação, a seleção do fornecedor desse serviço fica bloqueada para preservar a escolha inicial.

O cadastro de peça utiliza o mesmo componente e formulário do gerenciamento de peças. Para óleo, escolha **Óleo de motor** na guia Classificação: ficam disponíveis origem (mineral, semissintético ou sintético), linha/modelo, viscosidade SAE, API, ACEA e norma/aprovação OEM. Origem, SAE e ao menos uma especificação API/ACEA/OEM são obrigatórios. As informações técnicas são preservadas ao salvar e continuar para o fornecimento.

## Teste manual

1. Cadastre um fornecedor de peças e escolha **Selecionar peça existente**. Confira o fornecedor, escolha a peça, preencha as condições e salve. Confirme o vínculo na listagem de fornecimentos de peças.
2. Cadastre outro fornecedor e escolha **Cadastrar nova peça**. Salve a peça; confira os dois registros no fornecimento, complete as condições e salve.
3. Repita os dois caminhos para um fornecedor de serviços. Confira também o fornecedor no cadastro do serviço novo.
4. Escolha **Concluir por enquanto**. O fornecedor deve permanecer cadastrado sem criar item ou fornecimento.
5. Cancele o cadastro de um item. O fornecedor permanece salvo; nenhum item novo deve ser criado. Se cancelar o fornecimento depois de salvar um item novo, esse item permanece cadastrado, mas sem um novo fornecimento comercial.
6. Informe dados inválidos ou simule falha ao salvar o item. O formulário deve permanecer aberto, sem avançar ou duplicar o cadastro por cliques repetidos.
7. Atualize a página após abrir o formulário da continuação. O contexto já consumido não deve reabrir automaticamente um modal ou repetir qualquer cadastro.
8. Na seleção de peças, procure um nome inexistente e clique em **Não encontrei a peça** ou **Voltar às opções e cadastrar uma nova peça**. Confira o fornecedor no modal reaberto, escolha **Cadastrar nova peça**, salve e complete o fornecimento. Também é possível voltar à seleção ou concluir por enquanto. Sem peças cadastradas, as opções são abertas diretamente.

Os testes automatizados validam os destinos, os identificadores, o preenchimento das condições, a seleção de itens existentes, a espera pelo fechamento dos modais e o bloqueio de avanço em falhas de salvamento. Não enviam notificações reais nem criam registros no banco de dados.
