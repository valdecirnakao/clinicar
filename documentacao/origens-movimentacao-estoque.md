# Origem das movimentações de estoque

O modal de movimentação exige uma origem padronizada. A lista depende da operação:

| Operação | Origens |
| --- | --- |
| Entrada | Compra; Devolução de peça não utilizada; Bonificação do fornecedor; Outra origem |
| Saída | Consumo interno; Devolução ao fornecedor; Perda ou avaria; Outra origem |
| Ajuste de entrada ou saída | Inventário; Correção de lançamento; Outra origem |

Ao focar ou abrir a lista, o card de ajuda apresenta o significado de cada opção em um texto resumido, separado por marcadores. O card mantém a altura adotada no projeto.

“Outra origem” exige uma justificativa no campo Motivo. A validação acontece na tela e no servidor antes de alterar o saldo. As movimentações automáticas dos atendimentos mantêm a origem definida pelo sistema; não devem ser repetidas manualmente.

As origens das movimentações antigas permanecem preservadas. O histórico traduz os novos códigos para seus nomes de exibição e continua apresentando textos antigos personalizados.

## Custo unitário e progresso

Em bancos existentes, aplicar `bd/migrations/014_movimentacao_estoque_devolucao.sql` antes de iniciar esta versão. A migração é idempotente e adiciona somente a coluna opcional de vínculo, seu índice e sua chave estrangeira. A definição também está em `bd/init.sql` para bancos novos; os registros anteriores são preservados.

Compra exige um custo por unidade maior que zero. Bonificação aplica zero automaticamente e participa do recálculo do custo médio. Outra origem de entrada exige custo explícito e motivo; custo zero nas demais entradas manuais também exige justificativa.

Devolução permite selecionar uma saída manual do mesmo estoque para recuperar o custo original. O sistema grava o vínculo e desconta as devoluções anteriores do saldo devolvível. Saídas automáticas de atendimento não são opções de devolução manual. O vínculo é obrigatório. Sem uma saída identificada, utilize ajuste de inventário com justificativa.

Ajustes usam o custo médio vigente. Um ajuste de entrada sem custo cadastrado exige o custo inicial e o registra no estoque. Saídas usam o custo médio automaticamente e são bloqueadas se não houver custo cadastrado. Valores enviados pelo navegador não substituem custos automáticos.

A barra de progresso considera origem, quantidade válida, custo válido e motivo quando obrigatório. Os campos pendentes recebem identificação visual e a confirmação só fica disponível quando a movimentação está válida.

Teste adicional: abra Compra e confira custo vazio/vermelho e confirmação desabilitada; preencha um valor positivo e observe o progresso. Troque para Bonificação e confira custo zero automático. Em Outra origem, teste custo zero com e sem motivo. Em Devolução, selecione uma saída manual, confira o custo recuperado e tente devolver quantidade maior que o saldo restante. Em Ajuste e Saída, confira o uso automático do custo médio.

## Roteiro de teste

1. Em Controle de estoque, abra Registrar entrada: Origem deve iniciar sem seleção e sinalizada como obrigatória.
2. Abra a lista de Origem: confira as quatro opções de entrada e suas explicações no card de ajuda. Use também a navegação pelo teclado.
3. Escolha Compra, informe uma quantidade e o custo por unidade e confirme. Confira saldo, custo médio e origem Compra no histórico.
4. Escolha Outra origem e tente confirmar com Motivo vazio ou apenas espaços: a operação deve ser bloqueada. Preencha a justificativa e confira sua gravação no histórico.
5. Abra Registrar saída: verifique que só aparecem origens de saída. Registre uma saída com saldo disponível e confira a redução do saldo.
6. Abra Ajustar estoque: verifique as três origens de ajuste. Alterne entrada/saída e confira que a origem e a justificativa já preenchidas permanecem.
7. Confira uma movimentação automática de atendimento: sua origem deve continuar sendo Atendimento.
8. Confira registros anteriores à mudança: suas origens e justificativas devem continuar disponíveis.

As requisições manuais com origem ausente, incompatível com a operação ou reservada ao atendimento são rejeitadas pelo servidor. Integrações que enviavam MANUAL ou AJUSTE_MANUAL devem passar a enviar uma das origens da tabela.

## Devolução do atendimento e autoria

A ação Devolver peça ao estoque está disponível em Atendimentos concluídos ou entregues com baixa realizada. Exige saída original, quantidade dentro do saldo ainda devolvível, motivo e tratamento da cobrança. Reservas são liberadas pelo fluxo do atendimento, sem entrada física duplicada. A OS original permanece preservada.

O custo da saída é separado do preço cobrado ao cliente. Saídas antigas sem custo registrado utilizam o custo médio vigente, com aviso na tela. Restituição pendente registra o valor acordado, limitado ao preço das peças devolvidas; não executa pagamentos nem altera a OS.

Movimentações novas registram nome e ID obtidos da sessão autenticada. Registros antigos sem autoria são exibidos como Responsável não registrado.

Aplicar também bd/migrations/015_movimentacao_autoria_devolucao_atendimento.sql antes de iniciar o backend; as migrações são idempotentes e preservam os dados.

Testar uma devolução parcial e outra acima do saldo; testar saída de outro atendimento, reserva sem baixa e restituição maior que a cobrança original. Conferir saldo, custo médio, vínculo, nome e ID no histórico.


## Correção de lançamento vinculada

Ao escolher Correção de lançamento em Ajustar estoque, é obrigatório selecionar uma entrada ou saída manual original do mesmo estoque. Não são aceitos atendimentos, devoluções de peças não utilizadas ou outros ajustes como origem de uma correção. O ajuste exige justificativa e preserva o original, autoria e vínculo no histórico.

Informe somente a diferença. Ajuste de entrada aumenta o estoque; ajuste de saída diminui. Uma entrada de 10 quando chegaram 12 precisa de ajuste de entrada de 2. Uma entrada de 12 quando chegaram 10 precisa de ajuste de saída de 2. Para saídas, o sentido é inverso: retirada registrada acima do ocorrido exige ajuste de entrada. Reduções da quantidade original não podem superar a quantidade líquida após correções e devoluções anteriores. Nenhuma retirada manual pode consumir reservas.

A correção de quantidade usa o custo médio vigente, preservando esse custo. Não altera preços de compra, cobrança ou pagamentos. Divergências de valor exigem tratamento próprio. Inventário continua sem vínculo a um lançamento específico, com justificativa obrigatória. A atualização reutiliza a coluna de vínculo da migração 014; não exige nova migração.

Teste: registre uma entrada manual, escolha Correção de lançamento e confira o campo obrigatório em vermelho. Selecione a entrada, informe somente a diferença e justifique. Teste uma redução maior que a quantidade líquida e confirme que é bloqueada. Troque para Inventário e confira que a seleção da movimentação deixa de ser exigida. Confira no histórico o vínculo e o responsável.

## Devolução ao fornecedor

Registrar saída com origem Devolução ao fornecedor exige recebimento original de compra ou bonificação, fornecedor e motivo. A compra passa a exigir fornecedor ativo; bonificações podem identificar o fornecedor opcionalmente. A devolução usa automaticamente o fornecedor registrado no recebimento, mesmo que hoje esteja inativo. Recebimentos antigos de origem Manual ou sem fornecedor continuam disponíveis: é necessário identificar o fornecedor na devolução, sem reescrever o registro anterior.

O limite considera a quantidade do recebimento, suas correções e as devoluções anteriores com suas próprias correções. A quantidade também não pode consumir saldo reservado. A saída usa o custo médio vigente e preserva o custo médio; não registra pagamentos ou créditos financeiros.

Para corrigir uma devolução já lançada, use Ajustar estoque > Correção de lançamento e selecione a saída da devolução. Informe somente a diferença e uma justificativa. O fornecedor é preservado e uma ampliação da quantidade devolvida respeita o saldo do recebimento original. O histórico mostra o recebimento ou a devolução corrigida, o fornecedor e o responsável.

Aplicar bd/migrations/016_movimentacao_fornecedor.sql antes de iniciar o backend. A migração é idempotente e mantém os dados antigos.

Teste: registre compra com fornecedor, faça uma devolução parcial e confira os vínculos no histórico. Tente devolver acima do saldo recebido e do estoque disponível; tente trocar o fornecedor da compra. Corrija a devolução nos dois sentidos e confira o novo limite. Teste um recebimento antigo sem fornecedor e identifique-o antes de confirmar.