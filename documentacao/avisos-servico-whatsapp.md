# Avisos transacionais de serviço por WhatsApp

Os cinco modelos criados na Meta ainda aguardam aprovação. O código fica desligado por padrão com `CLINICAR_WHATSAPP_AVISOS_SERVICO_HABILITADOS=false`. Depois da aprovação de **todos** os modelos e da confirmação do número remetente, altere essa opção no ambiente local e recrie apenas o backend pelo procedimento do README. A migração Flyway `V35__avisos_servico_whatsapp.sql` adiciona a preferência individual, inicialmente desligada, e a data em que a oficina marcou o veículo como pronto. Faça backup antes de atualizar o banco local.

O cliente pode aceitar ou interromper esses avisos na guia **Alertas de manutenção** do portal. A escolha é separada dos alertas preventivos; o servidor verifica perfil, vínculo da conta autenticada, status ativo, preferência e telefone antes de registrar a notificação. A retirada da preferência cancela os envios ainda pendentes. A fila persistente guarda a chave de evento para evitar repetições e o worker revalida a situação antes de falar com a Meta. Aceitação pela API não comprova entrega ou leitura.

| Modelo (`pt_BR`) | Momento | Parâmetros do corpo |
| --- | --- | --- |
| `clinicar_agendamento_confirmado` | Confirmação gravada | nome, placa, data, hora, serviço, código do agendamento |
| `clinicar_lembrete_agendamento` | Até 24 horas antes de agendamento ainda confirmado; no máximo uma vez por horário | nome, placa, data, hora, código |
| `clinicar_agendamento_reagendado` | Mudança gravada da data/hora de início | nome, placa, data anterior, hora anterior, nova data, nova hora, código |
| `clinicar_orcamento_aguardando_aprovacao` | Nova versão do orçamento pendente | nome, código do atendimento, placa, valor total em reais |
| `clinicar_veiculo_pronto_retirada` | Ação explícita **Veículo pronto para retirada** após conclusão | nome, placa, código do atendimento |

A ação **Veículo pronto para retirada** não marca o atendimento como entregue e pode ser registrada uma vez. A entrega posterior mantém a rotina própria de envio da OS por e-mail. Agendamentos cancelados/reagendados e versões de orçamento substituídas/decididas cancelam avisos pendentes antigos. Mensagens já aceitas pelo provedor não podem ser recolhidas.

Antes de habilitar, confira na Meta os cinco nomes, idioma, ordem das variáveis e a aprovação dos modelos. Testes automatizados usam simulação e não contatam a Meta. O aceite de entrega no aparelho deve ser feito pelo titular em um teste manual controlado, após os modelos serem aprovados.
