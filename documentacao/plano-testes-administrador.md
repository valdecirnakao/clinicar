# Plano de testes manuais — módulo administrador CliniCar

Preparado em 01/10/2026 a partir das telas, ações e regras do projeto atual. Execute na ordem indicada, sem limpar o banco entre os blocos: os cadastros serão usados nas operações seguintes.

## Ponto de partida

O banco local `clinicar`, no container `clinicar-mysql`, teve seus registros removidos e os contadores das tabelas reiniciados. As tabelas e migrações foram mantidas. Existe apenas o registro técnico `configuracao_sistema`, ID 1, no estado `NAO_INICIADO`, necessário ao primeiro acesso. Nenhum administrador foi criado automaticamente.

Backup anterior: `C:\TG\backup\antes-limpeza-20261001-143709\clinicar.sql`. A mesma pasta contém o SQL executado e as contagens verificadas. O backup contém dados e credenciais armazenadas pelo sistema; mantenha-o local. A limpeza do MySQL não remove mensagens já recebidas no Gmail/Outlook, no WhatsApp ou no Mailpit.

Abra `http://localhost`, atualize a página e use **Primeiro acesso**. As sessões antigas foram removidas. Escolha um e-mail que você possa verificar diretamente, inclusive na pasta Spam, para receber a ativação e as OS. Não reutilize links antigos de ativação.

## Como registrar os resultados

Use `registro-testes-administrador.csv`, na mesma pasta, com os estados **Não executado**, **Passou**, **Falhou**, **Bloqueado** ou **Não aplicável**. Preencha resultado observado, código do registro e evidência. Os resultados esperados abaixo são critérios de aceitação; não representam uma afirmação de que todos já foram testados. Quando uma validação desejada não existir, registre como falha ou melhoria.

Uma operação é aprovada apenas se a tela mostrar o resultado correto e ele continuar correto depois de recarregar. Um alerta de sucesso, sozinho, não confirma recebimento de e-mail, alteração de estoque ou preservação do histórico.

Para testar erros, altere um campo por vez. Depois do bloqueio, corrija o campo e tente novamente. Para testar exclusão, use registros descartáveis; preserve os cadastros-base até terminar os testes de histórico. Para ações sem botão disponível na tela, registre a ausência; não é necessário usar chamadas técnicas.

## Dados que você vai cadastrar

| Referência | Dados sugeridos | Uso |
|---|---|---|
| ADM-1 | Seu novo administrador e e-mail monitorado | Primeiro acesso e operações principais |
| ADM-2 | Segundo administrador, se a tela permitir | Testes de permissões e gerenciamento |
| COL-1 | Colaborador com contato de teste | Responsável por atendimento |
| CLI-1 / CLI-2 | Dois clientes distintos, com e-mails controlados por você | Vínculos, comunicação e isolamento |
| V-1 | CLI-1; placa ABC1D23; Toyota Corolla; 2020/2021 Flex | Fluxo principal e preservação histórica |
| V-2 | CLI-2; placa XYZ9A87; outro modelo | Troca de veículo e separação de históricos |
| F-1 / F-2 | Fornecedores de peças e de serviço terceirizado | Fornecimentos e execução externa |
| P-1 | Filtro de óleo; unidade UN; custo R$ 20,00 | Reserva e baixa de estoque |
| P-2 | Óleo de motor; unidade compatível com o cadastro | Quantidades fracionadas e dados técnicos |
| S-1 | Revisão interna; mão de obra R$ 100,00 | Atendimento com peças |
| S-2 | Serviço terceirizado; fornecedor F-2 | Tipos TERCEIRO e MISTO |
| E-1 | P-1; local principal; quantidade 10; mínimo 3 | Cálculos de saldo |
| R-1 | Regra ativa de manutenção; intervalo 10.000 km e/ou 6 meses | Previsão após conclusão |

Use contatos de teste sob seu controle. Informe datas relativas ao dia de execução: agendamentos futuros para planejamento e entrada passada ou atual para conclusão. Se placa, documento, telefone ou e-mail sugerido conflitar com uma validação, use valores de teste válidos e registre os escolhidos. Não informe identificadores de terceiros reais.

## 1. Primeiro acesso, autenticação e sessão

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| AUT-01 | Abrir o sistema após a limpeza e consultar Primeiro acesso | Setup disponível, sem conta antiga autenticada |
| AUT-02 | Enviar cadastro inicial com obrigatórios vazios e depois e-mail inválido | Mensagens claras; nenhum administrador válido criado |
| AUT-03 | Cadastrar ADM-1 com dados válidos | Conta pendente; link recebido na caixa monitorada |
| AUT-04 | Solicitar reenvio da ativação antes de ativar | Novo link recebido; link anterior invalidado |
| AUT-05 | Abrir link inválido e depois o link vigente | Inválido rejeitado; vigente permite definir senha |
| AUT-06 | Testar senha fora da regra e confirmação diferente; depois senha válida | Erros bloqueados; ativação válida concluída |
| AUT-07 | Reutilizar o link ativado e tentar novo primeiro acesso | Token usado rejeitado; setup não permite outro administrador inicial |
| AUT-08 | Entrar com senha incorreta e depois correta | Erro sem acesso; login correto abre módulo administrativo |
| AUT-09 | Executar MFA quando solicitado; testar código incorreto e correto | Código inválido bloqueia; correto conclui autenticação |
| AUT-10 | Testar Esqueci minha senha, redefinição e reutilização do link | Link recebido; senha nova funciona; token usado não funciona |
| AUT-11 | Sair da sessão e abrir diretamente uma rota administrativa | Tela protegida exige autenticação |
| AUT-12 | Entrar como cliente/colaborador e tentar rota administrativa | Acesso conforme perfil; sem ações administrativas indevidas |

## 2. Usuários

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| USU-01 | Abrir lista vazia e cadastrar CLI-1, CLI-2 e COL-1 | Cadastro e listagem corretos; perfis distintos |
| USU-02 | Cadastrar com obrigatórios vazios ou formatos inválidos | Bloqueio sem registro parcial |
| USU-03 | Repetir e-mail de usuário existente, inclusive com maiúsculas | Duplicidade rejeitada |
| USU-04 | Editar nome, telefone e dados permitidos; recarregar | Alterações persistidas no usuário correto |
| USU-05 | Tentar auto-inativação e remoção do último perfil administrativo; configurar 2FA de ADM-2 e inativar ADM-1 usando ADM-2 | Auto-inativação bloqueada; outro administrador sem 2FA não basta; último acesso protegido; inativação por outro administrador configurado revoga todas as sessões |
| USU-06 | Testar reset de MFA com usuário descartável, quando disponível | Próximo login segue o fluxo de nova configuração |
| USU-07 | Cadastrar usuário descartável sem vínculos; cancelar exclusão; testar justificativa vazia/curta e depois confirmar com motivo válido | Deletar usuário disponível; cancelar preserva; motivo obrigatório; confirmação exclui fisicamente e registra usuário, administrador, motivo e data/hora na auditoria |
| USU-08 | Inativar cliente conectado em dois navegadores e com veículo/agendamento/atendimento; conferir históricos e depois reativá-lo | Históricos preservados; todas as sessões revogadas; após reativação, sessões antigas continuam inválidas e um novo login é necessário |
| USU-09 | Entrar como cliente com 2FA e solicitar inativação pela Minha conta | Pedido pendente registrado; acesso permanece ativo; usuário vê somente seus pedidos |
| USU-10 | Entrar como colaborador e solicitar encerramento do acesso | Pedido pendente registrado sem exclusão física ou alteração direta de status |
| USU-11 | Testar motivo vazio/curto, confirmação ausente e pedido duplicado | Validação bloqueia envio inválido; somente uma solicitação pendente por usuário |
| USU-12 | Abrir análise administrativa, cancelar e depois recusar com justificativa | Cancelar preserva pendência; recusa registra responsável/motivo/data e mantém acesso atual |
| USU-13 | Aprovar solicitação com usuário conectado em dois navegadores | Decisão auditada; conta inativa; todas as sessões revogadas; vínculos e históricos preservados |
| USU-14 | Tentar autoexclusão/autoativação; depois reativar pelo administrador | Cliente/colaborador não alteram status/perfil nem excluem a própria conta; reativação exige novo login |
| USU-15 | Filtrar solicitações e testar paginação e isolamento de histórico entre usuários | Filtros e páginas corretos; cliente/colaborador veem somente seus pedidos; decisões preservadas |
| USU-16 | Colaborador solicita suspensão futura e administrador aprova | Datas preservadas; período Agendado e conta ativa até o início |
| USU-17 | Aprovar suspensão de hoje até hoje e testar retorno no dia seguinte | Suspensão imediata, sessões revogadas e retorno automático com novo login e 2FA |
| USU-18 | Informar datas inválidas, omitir confirmação e tentar com perfil Cliente | Validação clara; suspensão temporária exclusiva de colaboradores |
| USU-19 | Recusar suspensão temporária com justificativa | Acesso ativo; recusa registrada sem agendamento |
| USU-20 | Após aprovação, administrador informa status ou muda perfil | Período Interrompido; decisão administrativa não é desfeita pelo agendador |
| USU-21 | Conferir histórico, horários, reinício e preservação dos vínculos | Execução auditável; retorno recuperado após reinício; históricos preservados |

Para detalhes e teste de um vínculo criado entre a abertura do modal e a confirmação, consulte [Exclusão de cadastro sem vínculos](exclusao-usuario-sem-vinculos.md). Sessões, tokens e auditorias também são vínculos, mesmo quando já expirados ou utilizados.

Consulte também [Proteção das contas administrativas](protecao-contas-administrativas.md) para os testes de auto-inativação e encerramento de sessões.

O fluxo para clientes e colaboradores está detalhado em [Solicitações de acesso](solicitacoes-acesso-usuarios.md).

## 3. Veículos

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| VEI-01 | Cadastrar V-1 para CLI-1 e V-2 para CLI-2 | Proprietário e identificação corretos |
| VEI-02 | Testar placa inválida e duplicada no cadastro; sair do campo e corrigir a placa | Consulta ao perder foco; placa duplicada destacada com mensagem clara; salvamento bloqueado durante consulta e em duplicidade; correção limpa aviso |
| VEI-03 | Editar veículo mantendo a própria placa; tentar placa de outro e depois uma livre | Própria placa aceita; placa de outro rejeitada ao perder foco e ao salvar; placa livre atualizada e persistida |
| VEI-04 | Testar filtros por placa/modelo/proprietário disponíveis | Apenas registros correspondentes |
| VEI-05 | Abrir histórico pela ação do veículo ainda sem eventos | Veículo selecionado; mensagem de histórico vazio |
| VEI-06 | Excluir veículo descartável sem vínculos; cancelar primeiro | Cancelar preserva; exclusão confirmada remove |
| VEI-07 | Tentar excluir veículo com eventos após os blocos 9 e 10 | Histórico protegido; mensagem clara se operação não for permitida |

## 4. Fornecedores

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| FOR-01 | Cadastrar F-1 e F-2 com contatos válidos | Cadastros persistidos |
| FOR-02 | Testar obrigatórios, documento/e-mail inválidos e duplicidade | Validações claras; anotar eventual regra ausente |
| FOR-03 | Editar contato e dados de um fornecedor | Alteração apenas no registro selecionado |
| FOR-04 | Testar ativação/inativação quando disponível | Status e disponibilidade nas seleções coerentes |
| FOR-05 | Excluir descartável e tentar excluir fornecedor vinculado | Confirmação e proteção dos relacionamentos |

## 5. Catálogo de peças

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| PEC-01 | Cadastrar P-1 e P-2 com unidades adequadas | Dados e unidades persistidos |
| PEC-02 | Testar obrigatórios, preço/custo negativo e campos numéricos inválidos | Entrada inválida bloqueada; sem valores corrompidos |
| PEC-03 | Preencher campos técnicos de óleo de motor quando disponíveis | Campos adequados ao tipo; dados recuperados na edição |
| PEC-04 | Editar nome, fabricante e demais dados permitidos | Alteração persistida |
| PEC-05 | Ativar/inativar peça, quando disponível | Status atualizado; novas seleções respeitam disponibilidade |
| PEC-06 | Excluir descartável sem uso e tentar excluir peça com estoque/itens | Sem remoção silenciosa de registros dependentes |

## 6. Catálogo de serviços

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| SER-01 | Cadastrar S-1 interno e S-2 terceirizado | Tipo, valores, duração e fornecedor corretos |
| SER-02 | Cadastrar terceirizado sem fornecedor; testar preço/duração inválidos | Dados obrigatórios e números inválidos bloqueados |
| SER-03 | Editar serviço e alterar tipo de execução | Campos dependentes coerentes e persistidos |
| SER-04 | Inativar e reativar serviço | Disponibilidade nas seleções coerente |
| SER-05 | Excluir descartável e tentar excluir serviço já utilizado | Histórico e vínculos protegidos |

## 7. Fornecimentos de peças e serviços

Fornecimento é cadastro da relação fornecedor/item. Não presuma que cadastrar um fornecimento representa entrada física de estoque; registre a entrada pela operação de estoque correspondente.

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| FNC-01 | Cadastrar fornecimento de P-1 por F-1 com custo, prazo e mínimo | Relação e dados comerciais persistidos |
| FNC-02 | Testar fornecedor/peça ausentes, negativos e duplicidade da relação | Dados inválidos bloqueados; comportamento de duplicidade explícito |
| FNC-03 | Editar custo/prazo e excluir fornecimento descartável | Registro correto alterado; cancelamento de ação preserva dados |
| FNC-04 | Cadastrar fornecimento de S-2 por F-2 | Fornecedor e serviço corretamente vinculados |
| FNC-05 | Editar, inativar e reativar fornecimento de serviço | Situação e seleções coerentes; exclusão lógica não apaga histórico |
| FNC-06 | Conferir estoque antes/depois dos cadastros de fornecimento | Nenhuma entrada física inesperada ou duplicada |

## 8. Locais, estoque, movimentos e alertas de estoque

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| EST-01 | Cadastrar local principal e E-1 com 10 unidades, custo 20 e mínimo 3 | Saldo inicial correto e persistido |
| EST-02 | Testar cadastro duplicado para mesma peça/local e números negativos | Duplicidade/valores inválidos bloqueados ou tratados explicitamente |
| EST-03 | Fazer entrada de 5 unidades a custo 30 | Saldo 15; conferir custo médio pela regra e histórico da entrada |
| EST-04 | Fazer saída manual de 2 unidades | Saldo 13; movimento registrado com motivo |
| EST-05 | Tentar saída maior que o saldo disponível e quantidade inválida | Bloqueio; saldo e movimentos sem alteração |
| EST-06 | Fazer ajuste de entrada/saída com justificativa | Saldo e histórico coerentes; respeitar semântica indicada na janela |
| EST-07 | Editar mínimo/local/dados permitidos | Alteração persistida sem perder movimentos |
| EST-08 | Consultar movimentos e detalhes | Ordem, tipo, quantidade, custo e motivo consistentes |
| EST-09 | Reduzir saldo até abaixo do mínimo | Indicador/alerta de estoque baixo coerente |
| EST-10 | Repor estoque e resolver alerta, quando houver ação | Indicador e alerta atualizados; histórico preservado |
| EST-11 | Reservar peças pelo agendamento e cancelar o agendamento | Reserva aumenta e depois é liberada; quantidade física não é baixada no cancelamento |
| EST-12 | Tentar saída que comprometa quantidade já reservada | Reserva protegida; mensagem clara |
| EST-13 | Reservar/consumir P-2 em quantidade fracionada compatível com a unidade | Precisão coerente, sem arredondamento que altere o saldo indevidamente |

Antes do fluxo principal, ajuste E-1 para **10 unidades atuais, 0 reservadas e 10 disponíveis**. Anote cada saldo; deixe testes de alerta/redução extrema para depois do fluxo principal se necessário.

## 9. Agendamentos

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| AGE-01 | Criar agendamento futuro para CLI-1/V-1/S-1, KM 10.000 e estimativa | Código único; datas, cliente e veículo corretos |
| AGE-02 | Testar obrigatórios e selecionar veículo de outro cliente | Relação inválida bloqueada |
| AGE-03 | Testar fim anterior ao início, duração inválida e KM negativo | Datas e valores incoerentes bloqueados |
| AGE-04 | Adicionar, editar e remover peças previstas antes de salvar | Itens e estimativas atualizados corretamente |
| AGE-05 | Salvar com 2 unidades de P-1; conferir reserva | Quantidade atual 10; reservada 2; disponível 8 |
| AGE-06 | Editar data/responsável/observações e peças previstas | Dados persistidos; reserva ajustada apenas pela diferença |
| AGE-07 | Tentar reservar mais que o disponível | Bloqueio; sem reserva ou registro parcial |
| AGE-08 | Confirmar agendamento e cancelar a confirmação de ação antes | Cancelar não altera; confirmação efetiva altera status |
| AGE-09 | Iniciar um agendamento conforme ação disponível | Status/início coerentes; se gerar atendimento, vínculo único |
| AGE-10 | Testar conclusão pela ação própria do agendamento | Status coerente; não tratar agendamento sozinho como manutenção prestada |
| AGE-11 | Cancelar outro agendamento, informando motivo | Status/motivo persistidos; reserva liberada |
| AGE-12 | Marcar outro agendamento como Não compareceu | Status correto; conferência de liberação das reservas |
| AGE-13 | Tentar ações incompatíveis em cancelado/concluído | Ações bloqueadas ou indisponíveis |
| AGE-14 | Excluir agendamento descartável e tentar excluir vinculado | Confirmação e vínculos/reservas tratados corretamente |
| AGE-15 | Após criar evento, mudar placa/modelo do V-1 no cadastro | Agendamento antigo conserva identificação original |
| AGE-16 | Editar outro campo do agendamento mantendo o mesmo veículo | Identificação histórica permanece original |
| AGE-17 | Trocar explicitamente por outro veículo válido do mesmo cliente | Novo veículo passa a ser identificado corretamente; use um V-3 do CLI-1 para este caso |

Para conclusão de atendimento, a data de entrada deve ser passada ou atual. Não altere o relógio do computador. Crie eventos separados para cancelamento, ausência e fluxo principal.

## 10. Atendimentos e itens

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| ATD-01 | Criar atendimento a partir do agendamento principal | Vínculo, cliente, veículo, KM e itens previstos coerentes |
| ATD-02 | Tentar criar segundo atendimento para o mesmo agendamento | Duplicidade impedida |
| ATD-03 | Testar cliente/veículo/serviço incompatíveis e obrigatórios | Bloqueio sem atendimento parcial |
| ATD-04 | Iniciar, aprovar e editar relato, diagnóstico, execução e recomendações | Status e dados persistidos; aprovação conforme fluxo disponível |
| ATD-05 | Adicionar, editar e remover serviço adicional | Quantidade, valores e total recalculados; serviço principal sem duplicação |
| ATD-06 | Adicionar, editar e remover peça utilizada | Saldo/reserva e total coerentes; sem baixa física prematura |
| ATD-07 | Tentar peça insuficiente, quantidade inválida e valor negativo | Bloqueio sem movimento parcial |
| ATD-08 | Testar atendimento TERCEIRO e MISTO e Aguardando terceiro | Fornecedor exigido onde necessário; tipo INTERNO não aceita estado incompatível |
| ATD-09 | Conferir mão de obra, peças, terceiros e desconto | Total igual aos componentes, sem duplicação de itens |
| ATD-10 | No fluxo controlado, usar mão de obra 100, 2 peças a 20 e desconto 10 | Total esperado R$ 130,00, se não houver outros componentes; registrar eventuais impostos/campos adicionais |
| ATD-11 | Abrir Concluir e cancelar a janela | Status, estoque e KM não alterados |
| ATD-12 | Tentar concluir sem KM, com negativo, fracionado e menor que entrada | Bloqueio antes da baixa; KM inválido não persistido |
| ATD-13 | Concluir com KM igual à entrada; repetir em outro evento com KM maior | Ambos válidos; KM salvo no atendimento e histórico |
| ATD-14 | Concluir atendimento com entrada futura | Bloqueio; status e estoque preservados |
| ATD-15 | Concluir fluxo principal com 2 unidades de P-1 | Atual 8, reservada 0, disponível 8; uma única baixa; agendamento vinculado concluído |
| ATD-16 | Repetir clique/atualizar depois da conclusão | Sem duplicar baixa, itens, previsões ou conclusão |
| ATD-17 | Cancelar outro atendimento aberto e informar motivo | Status correto, reservas liberadas; sem baixa indevida |
| ATD-18 | Tentar concluir cancelado ou alterar entregue | Operação proibida; sem mudança de dados |
| ATD-19 | Gerenciar peças/serviços depois da finalização | Bloqueio ou regra explícita de correção; não alterar valores históricos silenciosamente |

## 11. Entrega e ordem de serviço

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| OS-01 | Tentar entregar atendimento aberto | Ação indisponível ou operação rejeitada |
| OS-02 | Entregar atendimento concluído com e-mail válido do cliente | Status Entregue; OS recebida no destinatário correto; verificar Spam diretamente |
| OS-03 | Conferir PDF recebido | Código, placa, veículo, KM, itens, total, recomendações e acentos corretos |
| OS-04 | Conferir indicador de envio, destino e eventual falha | Informação coerente; sucesso do servidor não é prova de recebimento na caixa |
| OS-05 | Alterar placa/modelo/cor do cadastro depois da conclusão | Atendimento, histórico e OS anterior preservam identificação registrada |
| OS-06 | Reenviar a OS após a alteração do veículo | Mesmo conteúdo histórico; nenhuma baixa de estoque adicional |
| OS-07 | Reenviar OS de atendimento aberto | Operação bloqueada |
| OS-08 | Testar cliente sem e-mail válido em evento separado | Erro claro ou orientação; não registrar envio bem-sucedido sem envio |
| OS-09 | Conferir múltiplas páginas com relatos/itens extensos | Sem cortes, sobreposição, texto ilegível ou valores fora da página |
| OS-10 | Cancelar confirmação de entrega/reenvio | Nenhuma alteração nem envio |

Teste falha real do provedor somente quando ocorrer ou com configuração controlada combinada aqui. Não altere credenciais para provocar erro durante os demais testes.

## 12. Manutenção preventiva e previsões

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| MAN-01 | Cadastrar R-1 por serviço e outra regra por peça, conforme opções | Vínculos e critérios persistidos |
| MAN-02 | Testar intervalos negativos/zero, ausência de critério e obrigatórios | Dados sem sentido bloqueados conforme modalidade |
| MAN-03 | Editar, inativar, reativar e excluir regra descartável | Estado e disponibilidade coerentes; histórico protegido |
| MAN-04 | Testar critérios por fabricante/modelo/grupo, se disponíveis | Regra aplicada somente aos veículos/itens compatíveis |
| MAN-05 | Concluir atendimento elegível com KM 10.005 e intervalo 10.000 | Conferir previsão de referência 20.005 km pela regra; prazo calculado a partir da base configurada |
| MAN-06 | Concluir evento com critério apenas por prazo | Data prevista coerente com prazo configurado |
| MAN-07 | Consultar previsões nos detalhes/locais disponíveis da interface | Referência ao veículo, atendimento de origem, situação e regra |
| MAN-08 | Repetir conclusão/geração e verificar previsões | Sem duplicidade para a mesma origem/regra |
| MAN-09 | Testar regra inativa e evento sem item elegível | Não gerar previsão indevida |
| MAN-10 | Nova manutenção da mesma categoria e cancelamento de eventos | Previsões anteriores e atuais tratadas sem perda de rastreabilidade |

O backend possui ações de situação de previsão que podem não estar expostas na tela administrativa. Se você não encontrar como agendar/concluir/cancelar/reabrir uma previsão pela interface, registre como oportunidade de melhoria; esses casos precisam de teste técnico separado.

## 13. Alertas de manutenção e comunicações

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| ALE-01 | Abrir Alertas no banco sem configuração prévia | Formulário mostra padrões; não falha por tabela vazia |
| ALE-02 | Salvar antecedência, intervalo, limite, janela e fuso válidos; recarregar | Todos os valores persistidos |
| ALE-03 | Testar limites inválidos: antecedência negativa, intervalo zero, limite zero e fim antes do início | Rejeição clara; configuração anterior preservada |
| ALE-04 | Manter alertas inativos e ter previsão elegível | Nenhum envio automático de manutenção |
| ALE-05 | Ativar alertas com veículo/cliente de teste e previsão elegível | Envio somente quando dentro da janela e critérios; conferir destinatário e histórico |
| ALE-06 | Aguardar ciclo seguinte dentro do intervalo entre envios | Sem mensagem duplicada antes do intervalo mínimo |
| ALE-07 | Verificar máximo de envios e limite após vencimento | Limites respeitados; histórico de tentativas consultável |
| ALE-08 | Cliente sem telefone, canal desabilitado ou falha real do provedor | Histórico explica bloqueio/falha; não sinaliza envio confirmado indevidamente |
| ALE-09 | Havendo envio com resultado incerto, conciliar Confirmar envio ou Liberar tentativa | Apenas após verificar o recebimento; estado e nova tentativa coerentes |
| ALE-10 | Desativar alertas depois do teste e recarregar | Configuração persistida; agendador respeita desativação |
| ALE-11 | Conferir notificações de cadastro de usuário/veículo quando habilitadas | Destino e conteúdo corretos; canal desabilitado não envia |

WhatsApp depende da configuração do provedor e templates; se indisponível, marque **Bloqueado**, não **Passou**. Alguns casos de repetição/limites exigem tempo real; anote a hora prevista para conferir novamente. Não diminua limites ou horários sem registrar a configuração usada.

## 14. Histórico veicular e exportação

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| HIS-01 | Consultar V-1 sem período e abrir pelo ícone em Veículos | Mesma consulta, eventos do veículo correto |
| HIS-02 | Consultar V-2 e veículo sem eventos | Sem eventos do V-1; estado vazio claro |
| HIS-03 | Conferir agendamento, atendimento aberto, concluído, entregue e cancelado | Tipo/status identificados; planejamento não apresentado como serviço realizado |
| HIS-04 | Conferir total e contadores | Somente atendimentos concluídos/entregues no total; estimativas e cancelados excluídos |
| HIS-05 | Filtrar Todos, Finalizados, Em aberto e Cancelados | Eventos correspondentes; resumo acompanha filtros |
| HIS-06 | Filtrar um dia, intervalo e datas invertidas | Dia final incluído; inversão rejeitada; data usada é a agenda/entrada |
| HIS-07 | Conferir KM de entrada/saída, relato, diagnóstico, itens e recomendações | Dados iguais aos registros; KM zero não aparece como ausente |
| HIS-08 | Comparar cadastro atual alterado com eventos antigos | Cabeçalho atual; identificação preservada em cada evento |
| HIS-09 | Criar pelo menos 21 eventos para navegação; variar 5/10/20/50 por página | Intervalo correto; primeira/última e números funcionam; página final parcial correta |
| HIS-10 | Estando em página avançada, mudar filtros ou tamanho | Retorno à primeira página; sem resultado antigo na tela |
| HIS-11 | Exportar PDF estando em página intermediária | Todos os registros dos filtros, não apenas a página atual |
| HIS-12 | Comparar PDF e tela; repetir com filtro e histórico extenso | Totais, identificação, filtros e conteúdo consistentes; acentos e páginas legíveis |

Use eventos com códigos diferentes. Não conte um agendamento e seu atendimento como duas manutenções realizadas: são dois eventos da linha do tempo. A exportação mantém os nomes dos serviços/peças disponíveis no cadastro; a identificação histórica do veículo é preservada separadamente.

## 15. Checklist transversal para todas as telas

Repita cada caso abaixo em **Usuários, Veículos, Fornecedores, Peças, Estoque, Fornecimentos de peças, Serviços, Fornecimentos de serviços, Manutenção, Agendamentos, Atendimentos e Histórico**, quando o controle estiver disponível. Anote o nome da tela no registro; duplique a linha da planilha se precisar registrar resultados separados.

| ID | Ação / passos | Resultado esperado |
|---|---|---|
| GER-01 | Abrir lista sem registros e buscar termo inexistente | Estado vazio legível; sem erro genérico |
| GER-02 | Buscar por termos, limpar busca e combinar filtros | Resultado e total coerentes; limpeza restaura lista |
| GER-03 | Ordenar cada coluna nos dois sentidos, inclusive números/datas | Ordem correta; números não ordenados como texto |
| GER-04 | Testar paginação, tamanho, primeira/última e lista parcial | Sem sumiço, repetição ou página inválida |
| GER-05 | Abrir cadastro/edição/detalhes; cancelar pelo botão e fechar | Sem salvar inadvertidamente; formulário seguinte sem dados residuais |
| GER-06 | Salvar e recarregar; navegar para outra tela e retornar | Dados persistidos e carregamento encerrado |
| GER-07 | Repetir clique de salvar/confirmar rapidamente | Sem registros, movimentos ou envios duplicados |
| GER-08 | Reduzir janela para celular; abrir menus, tabelas e modais | Controles acessíveis; sem botões cortados ou modal impossível de fechar |
| GER-09 | Navegar por teclado, labels, mensagens e foco | Campos identificáveis; ação possível; erro perto do campo relevante |
| GER-10 | Abrir edição em duas abas, salvar alterações diferentes | Evitar sobrescrita silenciosa; conflito tratado quando previsto |
| GER-11 | Perder conexão durante consulta/salvamento; restaurar e tentar novamente | Erro claro; sem sucesso falso; nova tentativa possível; verificar resultado antes de repetir envio |
| GER-12 | Conferir cards/resumos após cada operação e filtros | Totais atualizados; sem divergência com a lista |

## Critério para encerrar a rodada

- Todos os casos executados ou com motivo registrado de bloqueio/não aplicabilidade.
- Nenhuma perda de histórico, vazamento de permissões, baixa duplicada ou divergência de valores pendente.
- Fluxo completo cadastro → agendamento → atendimento → conclusão → entrega → OS → histórico aprovado com evidências.
- Correções implementadas aqui devem ser retestadas no caso original e nas etapas relacionadas. Por exemplo: alterar reserva exige repetir cancelamento e conclusão; alterar OS exige repetir entrega, reenvio e histórico.

## Modelo para compartilhar um problema aqui

Copie e preencha:

```text
Caso: ATD-12
Tela:
Data/hora:
Código do agendamento/atendimento ou identificação do registro:
Passos realizados:
Dados informados:
Resultado esperado:
Resultado observado:
Mensagem exibida:
O problema se repete depois de atualizar a página?
Evidência: captura de tela/PDF, ocultando senha, token e dados desnecessários.
Classificação: falha ou proposta de melhoria.
```

Não envie senha, códigos de autenticação ou links de ativação. Para sugestões de melhoria, explique o comportamento desejado e em qual etapa ele ajuda.

Consulte também [Suspensão temporária de colaboradores](suspensao-temporaria-colaborador.md) para os casos USU-16 a USU-21.
