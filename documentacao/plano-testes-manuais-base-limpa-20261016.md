# Plano manual de testes do CliniCar — reinício em 24/10/2026

Este roteiro é **manual** e deve ser executado na ordem. Os estados da tabela final são modelos para preenchimento, não resultados já observados. Use os dados fictícios de cadastro abaixo, substituindo apenas os e-mails e telefones indicados pelas referências privadas que você controla. Registre em cada caso `Passou`, `Falhou`, `Bloqueado` ou `Não executado`, a data/hora, o perfil usado, o código gerado e uma captura sem segredos. Depois de salvar, feche, reabra e atualize a página: um aviso de sucesso sozinho não comprova persistência. Se um caso falhar, não avance em casos dependentes.

## Estado inicial e cuidados

Em 24/10/2026, a estrutura local estava na migração Flyway V34. A limpeza solicitada para esta rodada preserva tabelas, migrações, volume MySQL e as credenciais da infraestrutura; remove os dados funcionais e repõe apenas o marcador técnico de primeiro acesso. A identificação do backup anterior à limpeza e o resultado da verificação estão no [registro de reinício](reinicio-teste-manual-20261024.md). Esta operação não remove mensagens antigas do Mailpit nem arquivos exportados. Não repita a limpeza durante o roteiro.

Abra `http://localhost` em janela privativa ou saia de uma sessão anterior e atualize a página; as sessões antigas foram eliminadas. O backend foi observado com serviço de e-mail **externo**, autenticação ativa e remetente configurado, sem expor os valores. Para testar entrega real, use somente endereços que você controla, confira também spam/lixo eletrônico e anote o horário de recebimento e o destinatário. Não use endereços de terceiros. Para WhatsApp, use `W-TESTE` em todos os usuários; a correspondência está no arquivo privado abaixo. O backend tem a integração habilitada e os parâmetros básicos presentes, mas a aprovação dos modelos pela Meta e a entrega ao aparelho ainda precisam ser verificadas no teste. Use senhas de teste exclusivas, guardadas fora deste documento. As datas de agendamento devem ser futuras em relação ao dia do cadastro.

**Legenda:** `*` indica campo obrigatório. Se o navegador autocompletar um campo, confira o valor antes de salvar. Campos opcionais não citados explicitamente devem ficar vazios; mantenha os padrões explicitamente indicados. Onde uma lista apresentar grafia ligeiramente distinta, escolha a opção de mesmo significado e registre a diferença. Se uma opção ou campo obrigatório descrito não existir, marque o caso **Bloqueado** e anote a tela; não invente um valor. Confira os endereços após o preenchimento automático do CEP.

**Datas de teste:** escolha um dia útil futuro com início às `10:00`, pelo menos 48 horas após o momento do cadastro, e anote aqui: `D1 = ____/____/______`. O serviço dura uma hora, portanto o fim esperado é `11:00` do mesmo dia. Para o agendamento externo, use `D2 = ____/____/______` às `10:00`, também mais de 48 horas no futuro; escolha `D4 = ____/____/______` para reagendá-lo a outro dia útil. Para testar conflito de Caio, use `D3 = ____/____/______` às `10:00`, diferente dos demais dias. O limite de cancelamento/reagendamento pelo cliente é de 24 horas antes do início. Não altere o relógio do computador.

**Endereços reais monitorados:** a correspondência dos endereços informados pelo autor já está no arquivo local `C:\TG\tmp\emails-teste-manual-20261024.md`, ignorado pelo Git. Consulte-o antes de cada cadastro e não inclua endereços completos nas capturas públicas. Ana será a administradora; Bruno, colaborador de recepção; Caio, colaborador técnico; Dora e Eva, clientes. Os fornecedores reutilizam dois endereços monitorados; eles não são destinatários esperados de mensagem neste roteiro.

**Telefone monitorado:** `W-TESTE` indica um único número de WhatsApp controlado pelo autor, anotado no mesmo arquivo privado. Cadastre-o para **Ana, Bruno, Caio, Dora e Eva**. O telefone não é chave única do usuário; CPF e e-mail continuam distintos. Assim, notificações de cadastro, atualização, veículo e alertas destinados a qualquer uma dessas cinco pessoas podem chegar ao mesmo aparelho. Ao conferir o recebimento, compare **nome mencionado, tipo de evento, horário e destinatário lógico**; o número sozinho não identifica qual conta recebeu o alerta. Evite várias ações disparadoras em sequência antes de conferir cada mensagem. A aplicação pode enfileirar ou obter aceite da Meta sem comprovar entrega: só marque **recebido** depois de observar a mensagem no aparelho. O teste de entrega é autorizado para esse número; não insira telefones reais de terceiros.

**Verificação antes dos próximos envios:** no primeiro cadastro realizado em 24/10/2026, a Meta recusou o WhatsApp `cadastro_usuario` com HTTP 400, enquanto o e-mail de ativação foi aceito. Uma consulta de leitura à Meta mostrou o número **remetente** da Cloud API em `PENDING` e `NOT_VERIFIED`. Confira no Gerenciador do WhatsApp da Meta se esse remetente foi verificado e está conectado antes de cadastrar os demais usuários para testar entrega real. O 2FA da conta CliniCar não altera o estado do remetente na Meta. Não use **Reenviar** enquanto ele permanecer pendente; o erro antigo não contém o motivo detalhado da Meta. Registre esta ocorrência na etapa 1, sem refazer o primeiro acesso nem limpar a base.

| Referência | Conta | Onde consultar o endereço |
| --- | --- | --- |
| E-ANA | Ana | arquivo privado |
| E-BRUNO | Bruno | arquivo privado |
| E-CAIO | Caio | arquivo privado |
| E-DORA | Dora | arquivo privado |
| E-EVA | Eva | arquivo privado |
| E-FPECAS | Distribuidora TCC | mesmo endereço de E-ANA |
| E-FSERVICOS | Oficina Parceira TCC | mesmo endereço de E-BRUNO |

Ative cada conta pelo link recebido na caixa correspondente antes de entrar com ela. Guarde senhas e códigos TOTP fora do roteiro; não copie links de ativação nem tokens para evidências. Se uma mensagem não chegar, registre horário de envio, destinatário e estado de spam antes de repetir o envio; a tela dizer “enviado” não comprova entrega.

`E-ANA`, `E-BRUNO` e as demais referências são identificadores deste roteiro: **não digite essas letras no campo de e-mail**. Digite o endereço real correspondente que você anotou. O endereço do fornecedor também deve ser substituído da mesma maneira.

## 1. Primeiro acesso: administrador inicial

1. Na página de login, clique em **Primeiro acesso**. Na guia de dados pessoais, preencha: **Nome completo*** `Ana Teste Administradora`; **Nome social** deixe vazio; **CPF*** `314.159.265-90`; **Data de nascimento*** `15/03/1985`.
2. Na guia de contato, preencha: **E-mail de ativação*** `E-ANA` (substitua pelo endereço escolhido na tabela privada); **Telefone*** `W-TESTE` (substitua pelo número do arquivo privado, com DDD).
3. Na guia de endereço, preencha: **CEP*** `01001-000`; **Logradouro*** `Praça da Sé`; **Número*** `100`; **Complemento** `Sala 1`; **Bairro*** `Sé`; **Cidade*** `São Paulo`; **UF*** `SP`.
4. Confira a revisão e salve. Abra a caixa `E-ANA`, localize a mensagem de ativação, confira remetente e destinatário, abra o link, defina uma senha de teste forte e faça login. Se o aplicativo solicitar TOTP/2FA, conclua o pareamento e guarde os códigos de recuperação em local privado.

**Esperado:** o administrador é criado uma única vez; a mensagem chega à caixa `E-ANA` pelo serviço configurado, com remetente e destinatário corretos; o link ativa a conta e o acesso administrativo abre. A opção de primeiro acesso não permite outro administrador inicial. A lista contém apenas Ana. Pode haver também mensagem de cadastro/ativação por WhatsApp em `W-TESTE`; anote recebimento ou falha separadamente. Se o e-mail não chegar, registre a falha e não avance para os cadastros dependentes antes de resolver a ativação.

## 2. Cadastros de pessoas, veículo e alertas

Faça cada usuário em **Usuários > Novo Usuário**, avançando pelas guias e conferindo a revisão. Para os quatro cadastros use **CEP*** `01001-000`, **Logradouro*** `Praça da Sé`, **Número*** conforme a tabela, **Complemento** vazio, **Bairro*** `Sé`, **Cidade*** `São Paulo`, **UF*** `SP`. Em **Status inicial*** escolha `Ativo`. Em **Senha temporária*** e **Confirmar senha*** use a mesma senha de teste exclusiva para aquele usuário; não escreva as senhas no relatório. Não crie outro registro para Ana. Após salvar, confira a mensagem na caixa real correspondente, ative a conta, entre nela uma vez e depois saia.

| Campo | Bruno | Caio | Dora | Eva |
| --- | --- | --- | --- | --- |
| CPF/CNPJ* | `271.828.182-05` | `161.803.398-05` | `529.982.247-25` | `624.915.730-16` |
| Nome* | `Bruno Teste Recepção` | `Caio Teste Mecânico` | `Dora Teste Cliente` | `Eva Teste Cliente` |
| Nome social | vazio | vazio | vazio | vazio |
| Nascimento* | `20/06/1990` | `10/01/1988` | `25/09/1992` | `05/05/1991` |
| Telefone/WhatsApp* | `W-TESTE` | `W-TESTE` | `W-TESTE` | `W-TESTE` |
| E-mail* | `E-BRUNO` | `E-CAIO` | `E-DORA` | `E-EVA` |
| Tipo de acesso* | `Colaborador` | `Colaborador` | `Cliente` | `Cliente` |
| Número do endereço* | `101` | `102` | `103` | `104` |

Como Ana, abra a edição de Bruno e Caio e configure **Execução e registro técnico de atendimentos**: Bruno desativado, Caio ativado. Em **Operações de estoque autorizadas ao colaborador**: Bruno ativado, Caio desativado. Salve e reabra para conferir cada permissão. Essas escolhas definem os resultados esperados na etapa 8.

Ao salvar cada pessoa, se aparecer a continuação para **veículo**, escolha **Concluir por enquanto** para Bruno e Caio. Para Dora, cadastre o primeiro veículo pela continuação. Após salvá-lo, confira a pergunta sobre cadastrar outro veículo e a lista dos veículos cadastrados nessa sequência; escolha **Cadastrar outro veículo** para V2. Dora deve continuar preenchida como proprietária. Após salvar V2, escolha **Continuar para alertas**. Para Eva, cadastre V3 e escolha **Continuar para alertas** ou **Concluir por enquanto**, conforme a configuração prevista para ela. Se você cancelar o formulário de um veículo adicional, a escolha entre outro veículo, alertas e conclusão deve voltar sem apagar os registros já salvos. Deixe os campos opcionais não mencionados vazios.

| Veículo | Placa* | Fabricante* | Modelo* | Ano-modelo / combustível* | Cor* | Proprietário* | Uso |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V1 | `ABC1D23` | `Volkswagen` | `Gol` | `2020` / `Flex` | `Prata` | Dora, CPF `529.982.247-25` | Agendamento principal |
| V2 | `XYZ9A87` | `Volkswagen` | `Fox` | `2019` / `Flex` | `Branco` | Dora, CPF `529.982.247-25` | Seleção entre veículos e conflito de agenda |
| V3 | `TCC2B34` | `Fiat` | `Uno` | `2018` / `Flex` | `Azul` | Eva, CPF `624.915.730-16` | Isolamento entre clientes |

Em cada veículo, selecione a combinação **Ano-modelo | Combustível** no controle próprio. Confira a placa apresentada como `ABC-1D23`, `XYZ-9A87` ou `TCC-2B34` quando a tela aplicar a máscara. Uma placa pode aparecer sem hífen em campo de pesquisa; os sete caracteres devem permanecer iguais.

Na continuação de **Alertas de manutenção** da cliente, ou em **Alertas > Clientes > Editar** para Dora, selecione a própria Dora como destinatária, deixe o WhatsApp **desativado até existir uma previsão de manutenção elegível** e preencha os parâmetros obrigatórios com **antecedência** `7` dias, **intervalo** `7` dias, **máximo por previsão** `2`, **enviar até após vencer** `0` dias, **hora inicial** `8`, **hora final** `18` e **fuso** `America/Sao_Paulo`. Mantenha outros padrões se houver. Salve. Para Bruno e Caio, se a continuação pedir veículo/alertas próprios, use **Concluir por enquanto**; o teste não precisa de veículos pessoais deles.

**Esperado ao salvar usuários:** há cinco usuários (Ana, Bruno, Caio, Dora e Eva), todos com perfil e permissões planejados. Cada um conserva o mesmo telefone `W-TESTE` completo e formatado após reabrir; compare eventuais mensagens de cadastro/atualização no aparelho com o nome e o horário da ação. **Esperado ao salvar veículos:** V1 e V2 pertencem a Dora; V3 pertence a Eva. Na pesquisa de veículos de Dora aparecem V1 e V2, nunca V3. **Esperado nos alertas de manutenção:** a configuração de Dora persiste, ainda sem disparo preventivo nesta etapa. Para testar duplicidade, tente outro usuário com CPF de Dora e outro veículo com placa de V1; as validações devem impedir o salvamento. Cancele ambos os formulários sem gravar duplicatas.

## 3. Peça, fornecedor e fornecimento

Como Ana, abra **Peças > Cadastros > Nova Peça**. Na guia **Dados principais**, preencha **Nome*** `Filtro de óleo Teste TCC`; **Fabricante*** `Marca Fictícia`; **Unidade*** `Unidade`; em **Classificação**, escolha **Tipo*** `Peça automotiva`, **Linha/Modelo** `Linha TCC 2020`, **Especificação** `Filtro para teste do fluxo de estoque`. Como não é óleo, deixe os campos técnicos de óleo vazios. Confira a revisão e salve.

Cadastre uma segunda peça/insumo para testar quantidades em litros: **Nome*** `Óleo de motor Teste TCC`; **Fabricante*** `Marca Fictícia`; **Unidade*** `Litro`; **Tipo*** `Óleo de motor`; **Origem do óleo*** `Sintético`; **Linha/Modelo** `Linha TCC 5W-30`; **Viscosidade SAE*** `5W-30`; **Classificação API** `SP`; **Classificação ACEA** e **Norma/aprovação OEM** vazias; **Especificação** `Óleo fictício para teste de 3 litros`. A classificação API preenche o requisito de pelo menos uma especificação técnica. Confira a revisão e salve. Se a continuação perguntar pelo fornecedor, use o fornecedor de peças descrito a seguir após cadastrá-lo; não crie outra peça.

No fornecedor, preencha **CNPJ*** `12.345.678/0001-95`; **Razão Social*** `Distribuidora Exemplo TCC Ltda`; **Nome Fantasia*** `Distribuidora TCC`; **Item fornecido*** `Peça ou insumo`; **Fundação*** `01/01/2010`; **Telefone/WhatsApp*** `(11) 90000-0005`; **E-mail*** `E-FPECAS` (substitua pelo endereço monitorado); **CEP*** `01001-000`; **Logradouro*** `Praça da Sé`; **Número*** `200`; **Complemento** vazio; **Bairro*** `Sé`; **Cidade*** `São Paulo`; **UF*** `SP`; **Status** `Ativo`. Salve. Na continuação, selecione a peça existente recém-criada. Não cadastre outra peça.

Em **Peças > Fornecimentos > Novo Fornecimento**, ou na continuação, selecione **Fornecedor*** `Distribuidora TCC` e **Peça/Insumo*** `Filtro de óleo Teste TCC`. Em condições, informe **Valor unitário*** `R$ 35,00`; **Prazo de entrega (dias)*** `3`; **Quantidade mínima*** `1`; **Status** `Ativo`; **Data cadastro*** mantenha a data atual exibida. Salve. Repita com **Peça/Insumo** `Óleo de motor Teste TCC`, **Valor unitário** `R$ 20,00`, **Prazo** `3` dias, **Quantidade mínima** `1` litro, **Status** `Ativo` e data atual. Um fornecimento não movimenta o estoque.

**Esperado ao salvar:** duas peças de unidades distintas, um fornecedor ativo para peças e exatamente dois fornecimentos, um por item. A quantidade mínima deve começar vazia em novo formulário e mostrar obrigatoriedade. Ao tentar repetir o mesmo par fornecedor–peça, o sistema indica o vínculo existente e não grava duplicata; cancele. Ao tentar cadastrar o filtro com os mesmos atributos, o sistema identifica duplicidade e não grava uma terceira peça; cancele. Confira que ainda não há saldo físico criado apenas pelos fornecimentos.

## 4. Local, controle de estoque, entrada e saída

No **Novo Controle de Estoque**, selecione **Peça/Insumo*** `Filtro de óleo Teste TCC`. Em **Local de Estoque***, clique em **Novo Local**, preencha **Nome*** `Almoxarifado TCC`, **Descrição** `Local de teste`, **Status** `Ativo`, salve e selecione esse local. Em **Quantidades**, informe **Quantidade Atual*** `10`, **Quantidade Reservada*** `0`, **Estoque Mínimo*** `5`, **Estoque Crítico*** `2`. Em **Reposição e custo**, informe **Estoque Máximo** `20`, **Ponto de Reposição** `5`, **Qtd. Reposição Sugerida** `10`, **Custo Médio** `R$ 30,00`, **Localização Física** `Prateleira A1`, **Status do Cadastro** `Ativo`. Confira a revisão e salve.

Crie outro controle no mesmo local para `Óleo de motor Teste TCC`: **Quantidade Atual** `10` litros; **Reservada** `0`; **Mínimo** `4`; **Crítico** `2`; **Máximo** `20`; **Ponto de Reposição** `4`; **Reposição sugerida** `10`; **Custo Médio** `R$ 15,00` por litro; **Localização Física** `Prateleira A2`; **Status** `Ativo`. Confira a revisão e salve.

**Esperado:** dois controles ativos, cada um com atual `10`, reservado `0`, disponível `10` e status normal, respeitando `Unidade` para filtro e `Litro` para óleo. O custo médio inicial é obrigatório porque ambos têm saldo positivo. Cada histórico contém uma única linha **Saldo inicial**, de `0` para `10`, com o respectivo custo unitário (`R$ 30,00` e `R$ 15,00`) e Ana como responsável. Se a contagem inicial estiver incorreta, use ajuste de inventário justificado; não altere saldo diretamente na edição.

Na linha desse estoque, clique em **Entrada**. Preencha **Quantidade a adicionar*** `4`; **Valor unitário** `R$ 40,00` se a origem escolhida exigir custo; **Origem*** escolha `Compra` ou `Compra de mercadorias` (a opção de compra disponível); **Documento/Referência** `NF-TESTE-001`; **Motivo** `Reposição de teste`; **Observações** `Entrada fictícia sem compra real`. Se houver **Fornecedor**, selecione `Distribuidora TCC`. Confirme. **Esperado:** saldo atual `14`, histórico com entrada de `4`, documento e usuário; o custo médio deve refletir a entrada de acordo com a regra de média ponderada do sistema (com 10 × 30 e 4 × 40, referência de `R$ 32,86` após arredondamento, caso não haja outra movimentação/custo entre as etapas).

Clique em **Saída** e informe **Quantidade*** `10`, **Origem*** escolha a opção de uso/consumo interno disponível, **Documento/Referência** `OS-TESTE-001`, **Motivo** `Teste de consumo`, **Observações** `Saída fictícia`. Confirme. **Esperado:** saldo `4`, abaixo do mínimo `5` e acima do crítico `2`; o estado passa a atenção e surge um alerta. A configuração de WhatsApp de estoque continua desativada até selecionar os dois destinatários na etapa 5. Tente saída de `5` adicionais sem confirmação: deve ser bloqueada por saldo insuficiente; cancele.

## 5. Destinatários dos alertas de estoque

Como Ana, abra **Alertas > Colaboradores > Editar configuração dos alertas de estoque**. Com o envio via WhatsApp ainda **desativado**, em **Colaborador responsável (atenção)*** selecione Bruno; em **Administrador responsável (crítico/zerado)*** selecione Ana; em **Intervalo entre lembretes (horas)*** informe `24`. Salve, feche e reabra o modal. Confira que os dois telefones exibidos correspondem a `W-TESTE`. Ative o envio via WhatsApp, salve e confira o alerta de atenção já aberto. Se permanecer pendente e ainda compatível com saldo `4`, use **Reenviar alertas pendentes** uma vez, após salvar. Aguarde o processamento e confira o histórico e o aparelho antes de qualquer nova tentativa.

**Esperado ao reabrir:** Bruno e Ana continuam selecionados, com telefones formatados; a tabela de configuração mostra os dois destinatários. O alerta de atenção do filtro corresponde a Bruno. No aparelho, confira uma mensagem de **atenção** dirigida a Bruno e anote horário, texto, estado no sistema e recebimento real. O aceite da Meta, isoladamente, não comprova entrega. Não pressione reenvio se houver envio já aceito ou resultado incerto.

Depois dessa conferência, faça nova saída de `2` unidades do **filtro**, com **Origem** `Consumo interno`, **Documento** `OS-TESTE-002`, **Motivo** `Teste de nível crítico`, **Observações** `Saída fictícia`. O saldo do filtro deve chegar a `2`, status crítico, destinado a Ana. Confira separadamente no aparelho a mensagem de **crítico** dirigida a Ana, embora o telefone físico seja o mesmo de Bruno. Faça depois entrada de `8` filtros, **Origem** `Compra`, **Valor unitário** `R$ 40,00`, **Fornecedor** `Distribuidora TCC`, **Documento** `NF-TESTE-002`, **Motivo** `Reposição após alerta`, **Observações** `Entrada fictícia`. O saldo volta a `10` e o alerta normaliza/encerra conforme a regra; confira a transição, ator e documentos no histórico. O óleo permanece em `10` litros. Não resolva manualmente o alerta enquanto o saldo estiver baixo. Ao terminar a prova de entrega, desative o envio de estoque e salve para evitar lembretes reais não planejados nas etapas seguintes.

## 6. Serviço e fornecimento de serviços

Crie primeiro o fornecedor de serviços: **CNPJ*** `98.765.432/0001-98`; **Razão Social*** `Oficina Parceira TCC Ltda`; **Nome Fantasia*** `Parceira TCC`; **Item fornecido*** `Serviços automotivos`; **Fundação*** `01/01/2015`; **Telefone/WhatsApp*** `(11) 90000-0006`; **E-mail*** `E-FSERVICOS` (substitua pelo endereço monitorado); **CEP*** `01001-000`; **Logradouro*** `Praça da Sé`; **Número*** `201`; **Complemento** vazio; **Bairro*** `Sé`; **Cidade*** `São Paulo`; **UF*** `SP`; **Status** `Ativo`. Salve e reabra para confirmar que a categoria permite serviços.

Em **Serviços > Cadastros > Novo Serviço**, use **Nome*** `Troca de filtro TCC`; **Categoria*** `Motor`; **Tipo do Prestador*** `Fornecedor Externo`; **Descrição** `Troca simulada do filtro e óleo`; **Duração estimada*** `1`; **Unidade duração*** `Hora`; **Valor base*** `R$ 80,00` (valor cobrado ao cliente); **Unidade cobrança*** `Serviço`; **Garantia em dias*** `30`; **Necessita peças?** `Sim`; **Status** `Ativo`; **Observações** `Cenário de aceite`; **Materiais comuns deste serviço** `Filtro de óleo e aproximadamente 3 litros de óleo; a oficina confirma compatibilidade e quantidades.`. Na guia de fornecedor, confirme que a Distribuidora TCC, cadastrada somente para peças, não aparece. Sem selecionar um fornecedor, confira que revisão e salvamento permanecem bloqueados; selecione a Oficina Parceira e salve. Para comparar, ao escolher `Mecânico` ou outro tipo, o fornecedor deixa de ser obrigatório; antes de salvar, retorne a `Fornecedor Externo` e escolha a Oficina Parceira.

Após salvar o serviço vinculado à Oficina Parceira, em **Serviços > Fornecimentos > Novo Fornecimento**, selecione o parceiro e `Troca de filtro TCC`; preencha **Valor de Custo*** `R$ 50,00` (pago ao terceiro), **Unidade Cobrança*** `Serviço`, **Prazo Execução*** `1`, **Unidade Prazo*** `Dia`, **Quantidade Mínima*** `1`, **Disponibilidade*** `Sob demanda`, **Início/Fim Vigência** vazios, **Contrato/Referência** `CT-TESTE-001`, **Status** `Ativo`, **Observações** `Teste sem contratação real`. Salve. A opção **Peças e serviços** pode ser conferida sem salvar um terceiro fornecedor; quando escolhida, o fornecedor deve aparecer em ambos os seletores.

**Esperado:** o valor base de `R$ 80,00` fica no cadastro do serviço e o custo de `R$ 50,00` no vínculo com o terceiro. Seleção de serviço existente permite voltar ou cadastrar novo. Uma tentativa de novo serviço com o mesmo nome e categoria sinaliza os campos e oferece escolher o existente ou alterar os atributos. Uma tentativa de novo fornecimento com o mesmo parceiro e serviço não gera vínculo duplicado.

## 7. Agendamento e atendimento

### 7.1 Solicitação feita por Dora e definição pela oficina

1. Entre como **Dora** e abra **Meus agendamentos > Novo Agendamento**. Na lupa de veículo, confira V1 e V2, selecione V1 (`ABC1D23`) e observe placa e modelo no campo. Selecione o serviço `Troca de filtro TCC` e início em **D1 às 10:00**; o fim deve ser calculado para **D1 às 11:00**. A barra de progresso deve avançar; **Próximo** e as guias seguintes só liberam após veículo, serviço e período válidos. Não deve haver campo para selecionar Caio, Ana ou a Oficina Parceira: a oficina definirá a execução.
2. Em **Materiais (opcional)**, escreva `Prefiro filtro da Marca Fictícia; avaliar 3 litros de óleo 5W-30`. Confira que a referência do catálogo aparece separada da sua sugestão e que nenhum item ou quantidade é reservado pelo cliente. Em **Informações adicionais**, preencha **Preferência sobre quem executará o serviço** `Prefiro execução na oficina; aceito parceiro se necessário`, **Serviço solicitado / queixa** `Troca de filtro para teste` e **Observações** `Verificar compatibilidade do óleo com o veículo`. Na **Revisão**, confira veículo, serviço, D1 10:00–11:00, sugestão de materiais, preferência de execução, queixa e observações. **Salvar agendamento** só fica habilitado nessa guia. Salve e anote o código.
3. Reabra o agendamento como Dora. **Esperado:** as preferências persistem, a execução aparece como **a definir pela oficina** e a ação **Confirmar** ainda não está disponível. A tentativa de confirmação sem executor também deve ser rejeitada pelo servidor, caso testada por uma ferramenta de API em ambiente isolado; não é necessário expor controles técnicos ao participante do teste manual.
4. Entre como **Ana ou Bruno**, edite esse agendamento e confira as preferências escritas por Dora. Escolha **Pela oficina**, selecione Caio como responsável e planeje `1` unidade de `Filtro de óleo Teste TCC` a `R$ 35,00` e `3` litros de `Óleo de motor Teste TCC` a `R$ 20,00` por litro. Confira valor previsto de peças `R$ 95,00` e total estimado `R$ 175,00` (`R$ 80,00` de serviço + peças), se não houver outro componente financeiro. Salve na **Revisão**, reabra e confira modalidade, Caio, itens e quantidades. Ainda não deve haver reserva física antes da confirmação. Entre novamente como Dora; agora **Confirmar** deve estar disponível. Confirme e confira o estado **Confirmado**; o estoque físico segue filtro `10`, óleo `10`, com reservas `1` e `3`, disponíveis `9` e `7`.
5. Em outro agendamento fictício de Dora para V2 em **D2 às 10:00**, repita a solicitação. A oficina deve escolher **Fornecedor externo** e **Oficina Parceira TCC Ltda**; a pesquisa lista somente fornecedores ativos de serviços. O responsável interno de acompanhamento, quando oferecido, é opcional. Salve, reabra e confira como Dora a modalidade e a empresa. Como Dora, use **Reagendar** para mudar esse pedido para **D4 às 10:00**; confira que volta a aguardar a definição/confirmação da oficina e que D2 não permanece reservado. Depois, ainda mais de 24 horas antes de D4, use **Cancelar**, informe **Motivo** `Mudança de planos no teste` se solicitado e confira o estado cancelado. O agendamento principal de D1 não deve mudar.

**Casos negativos:** enviar pelo perfil de cliente IDs de responsável/fornecedor ou modalidade externa não deve atribuir esses dados; a solicitação continua pendente da oficina. Uma preferência de texto acima do limite de 1000 caracteres deve ser recusada. Um agendamento sem executor definido não pode ser confirmado, inclusive pela ação administrativa. Registre o resultado desses casos apenas se houver um ambiente descartável apropriado para chamadas de API.

**Prazo de cancelamento:** quando faltar menos de 24 horas para D1, consulte o agendamento principal sem cancelá-lo. A ação de cancelar/reagendar pelo cliente deve ficar indisponível e a tela deve orientar a contatar a oficina. Registre esse caso como **Não executado — aguardar D1** até chegar a janela; não altere a data do sistema. A confirmação do agendamento deve produzir aviso temporário de sucesso que desaparece após alguns segundos.

### 7.2 Cadastro pela equipe e atendimento

Para continuar, use o agendamento **confirmado** de Dora em D1, V1, executado por Caio e com as duas peças planejadas. Antes de iniciar o atendimento, confira que ele aparece em **Meus agendamentos** de Dora, mas não em **Meus agendamentos** de Eva. No **Histórico veicular** de Dora, ele pode aparecer como planejamento **Agendado/Confirmado** e com estimativa de `R$ 175,00`; não integra o total de atendimentos finalizados.

**Conflito de horário:** em **D3 às 10:00**, crie pela equipe dois agendamentos não confirmados para Caio e o mesmo serviço: um para Dora/V2 e outro para Eva/V3, sem peças previstas. Confirme o primeiro; a tentativa de confirmar o segundo deve falhar por conflito de Caio, sem mudar seu status. Cancele os dois agendamentos auxiliares e confira que o principal de D1 segue confirmado. O veículo diferente em cada pedido evita confundir conflito de profissional com conflito de veículo.

**Execute o atendimento apenas a partir de D1 às 10:00.** Não altere o relógio nem antecipe a data de entrada para concluir o roteiro no mesmo dia do cadastro. Em D1, inicie o **Atendimento** a partir do agendamento principal confirmado. Confira cliente Dora, placa V1 e Caio. Informe **data de entrada** na data real de execução do teste (até o horário atual), **KM de entrada** `50000`, **relato do cliente** `Solicita troca de filtro e óleo`, **diagnóstico técnico** `Filtro em fim de vida útil`, **serviço executado** `Troca simulada de filtro e óleo`, **recomendações** `Verificar novamente no próximo período`, **observações internas** `Teste TCC`, **garantia dias** `30`, **necessita retorno?** `Não`. Confira os dois itens planejados antes de registrar os utilizados: filtro `1 Unidade` e óleo `3 Litros`, com preços `R$ 35,00` e `R$ 20,00` por litro. Não os adicione uma segunda vez se já tiverem sido transferidos do agendamento.

No orçamento, confira **mão de obra** `R$ 80,00`, **filtro** `R$ 35,00`, **óleo** `R$ 60,00`, **total** `R$ 175,00`, sem desconto ou valor de terceiro; se a tela exigir edição dos valores, informe esses números. Envie a versão **pelo fluxo interno do sistema**; esta etapa não promete e-mail. Como Dora, abra a versão pendente em **Meus atendimentos**, confira os valores e aceite-a; volte como Ana/Bruno para conferir a decisão. Para concluir, informe **KM de saída** `50001` e complete qualquer campo obrigatório indicado pela tela com um valor fictício coerente, registrando-o na evidência.

**Esperado ao abrir:** atendimento único associado ao código do agendamento, Dora, V1 e Caio; a visualização de detalhes separa identificação, execução, itens, valores e observações. **Esperado no orçamento:** uma versão de `R$ 175,00` e aceite de Dora ligados ao atendimento; nenhuma versão duplicada por duplo clique. **Esperado ao concluir:** uma baixa de `1` filtro e `3` litros de óleo, reservas zeradas e saldos físicos `9` filtros e `7` litros (desde que não haja outros movimentos). O histórico de Dora mostra o atendimento finalizado; Eva não o vê. Os dados de diagnóstico, KM e recomendações persistem após atualizar a página.

Depois da conclusão, como Ana/Bruno use **Entregar** e confira o envio da **Ordem de Serviço** para `E-DORA` pelo serviço de e-mail configurado. Na caixa real de Dora, verifique remetente, destinatário, assunto e o PDF/anexo: código do atendimento, placa V1, itens `1` filtro e `3` litros de óleo, KM `50000`/`50001` e valor `R$ 175,00`. **Esperado:** atendimento entregue e e-mail efetivamente recebido; o envio ou reenvio da OS não altera estoque nem cria outra baixa. Se a tela disser que enviou, mas a mensagem não chegar, registre falha de entrega após conferir spam, sem marcar o caso como aprovado.

**Entrega de alerta preventivo por WhatsApp:** esta conferência exige uma previsão de manutenção real gerada para V1 após o atendimento e dentro da janela de antecedência configurada. Consulte **Alertas > Clientes** e identifique a previsão e sua data antes de ativar a configuração de Dora. Se não houver previsão elegível, marque este subcaso **Não executado — sem previsão elegível**; o simples cadastro de telefone e da configuração não dispara alerta. Havendo previsão elegível, confirme que Dora está ativa, conserva `W-TESTE` e que o horário atual está entre `08:00` e `18:00` em `America/Sao_Paulo`; ative o WhatsApp apenas para ela, salve e aguarde o processamento. Confira no histórico o alerta preventivo, seu estado e horário e, no aparelho, a mensagem dirigida a Dora. Registre separadamente **aceito pelo provedor** e **recebido no WhatsApp**. Desative a configuração e salve após a prova para evitar o segundo lembrete permitido pelo limite `2`. Não altere o relógio nem force uma previsão artificial no banco operacional.

## 8. Conferência por perfil e resultados finais

1. **Bruno (colaborador com estoque):** entre e confira Painel, Usuários (apenas clientes), Veículos, Peças > Estoque, Agendamentos, Atendimentos, Histórico Veicular e Alertas > Clientes. **Esperado:** pode executar entrada/saída e preparar agendamento de Dora, mas não ajustar inventário, redefinir 2FA ou inativar usuário. Ana e Caio não aparecem na lista de usuários acessível a Bruno. Não deve registrar diagnóstico técnico se a permissão de execução estiver desativada.
2. **Caio (colaborador técnico):** confira no Painel as tarefas atribuídas a ele e abra o atendimento principal. **Esperado:** pode registrar o trabalho técnico autorizado; não recebe a ação de ajuste de estoque atribuída a Bruno. Os vínculos do atendimento seguem preservados após novo login.
3. **Dora (cliente):** confira **Meus dados**, **Meus veículos**, **Histórico veicular**, **Meus agendamentos**, **Meus atendimentos** e **Alertas de manutenção**. **Esperado:** aparecem seus dados, V1 e V2, e somente seu agendamento/atendimento. CPF, telefone, placa e valores são formatados; não há ações administrativas.
4. **Eva (cliente de controle):** entre e consulte as mesmas listas, selecione veículos no modal de novo agendamento e busque pelo código do registro de Dora. **Esperado:** apenas V3 aparece na seleção; agendamento, atendimento e histórico de Dora não aparecem para Eva. Feche o novo agendamento sem salvar.
5. **Ana (administradora):** abra Auditoria e confira cadastros, movimentações, confirmação e conclusão com operação, data e responsável. Confira filtros e paginação das tabelas. **Esperado:** os registros correspondem às ações realizadas; fechar um modal com alterações não salvas apresenta a proteção do rascunho e não grava dados.

### Registro mínimo de resultado

| Etapa | Data/hora e perfil | Passou/Falhou/Não executado | Resultado observado e mensagem (se houver) | Evidência sem dados reais |
| --- | --- | --- | --- | --- |
| 1. Primeiro acesso |  | Não executado |  |  |
| 2A. Contas e permissões |  | Não executado |  |  |
| 2B. Veículos e alerta de manutenção |  | Não executado |  |  |
| 3. Peças e fornecimentos |  | Não executado |  |  |
| 4A. Controles e saldos iniciais |  | Não executado |  |  |
| 4B. Entrada, saída e histórico |  | Não executado |  |  |
| 5. Destinatários e transição dos alertas |  | Não executado |  |  |
| 5A. WhatsApp de atenção para Bruno |  | Não executado |  |  |
| 5B. WhatsApp crítico para Ana |  | Não executado |  |  |
| 6. Serviço, fornecedor externo e vínculo |  | Não executado |  |  |
| 7.1A. Solicitação e preferências de Dora |  | Não executado |  |  |
| 7.1B. Definição, peças e confirmação |  | Não executado |  |  |
| 7.1C. Execução externa auxiliar |  | Não executado |  |  |
| 7.1D. Reagendamento, cancelamento e prazo de 24 h |  | Não executado |  |  |
| 7.2A. Conflito de agenda |  | Não executado |  |  |
| 7.2B. Atendimento, orçamento e estoque |  | Não executado |  |  |
| 7.2C. Entrega e e-mail da Ordem de Serviço |  | Não executado |  |  |
| 7.2D. WhatsApp preventivo para Dora, se houver previsão elegível |  | Não executado |  |  |
| 8. Perfis, isolamento e auditoria |  | Não executado |  |  |

Se for necessário recuperar os dados anteriores, **pare o teste** e siga o [registro de reinício e reversão](reinicio-teste-manual-20261024.md). A restauração no banco principal substitui os registros criados após a limpeza; faça nova cópia destes registros antes de substituí-los.
