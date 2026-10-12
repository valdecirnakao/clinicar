import { normalizarRotulo } from './field-help-content';
export interface AjudaGuia { titulo: string; mensagem: string; }

export function obterAjudaGuia(guia: string, contexto: string): AjudaGuia | null {
  const origem = normalizarRotulo(contexto).replace('primeiro-acesso', 'usuario');
  const servico = origem.includes('servico');
  const definicoes: Record<string, [string, string]> = {
    dados: ['Dados principais', origem.includes('usuario') ? 'Identifique a pessoa cadastrada com nome, documento e data de nascimento.' : origem.includes('fornecedor') ? 'Identifique a empresa fornecedora e a categoria dos produtos ou serviços que ela oferece.' : servico ? 'Identifique o serviço oferecido e o tipo de profissional que o executa.' : 'Identifique a peça ou o insumo por nome, fabricante e unidade de medida.'],
    contato: ['Contato e acesso', origem.includes('usuario') ? 'Defina os contatos do usuário e o perfil que determina quais funções ele pode acessar.' : 'Informe o telefone e o e-mail usados para comunicação com o fornecedor.'],
    endereco: ['Endereço', 'Informe onde a pessoa ou empresa está localizada, incluindo CEP, rua, número, bairro, cidade e estado.'],
    seguranca: ['Segurança', 'Defina o status de acesso e a senha inicial do usuário, seguindo os requisitos de segurança.'],
    revisao: ['Revisão', 'Confira as informações preenchidas nas guias anteriores antes de confirmar o salvamento.'],
    veiculo: ['Veículo', 'Identifique o veículo pela placa, fabricante, modelo, ano, combustível e cor.'],
    proprietario: ['Proprietário', 'Vincule o veículo à pessoa ou empresa responsável por ele.'],
    classificacao: ['Classificação', 'Defina a categoria e as características técnicas do produto. Para óleo de motor, informe origem, viscosidade SAE e especificações API, ACEA ou OEM.'],
    cobranca: ['Cobrança e duração', 'Defina o preço de referência cobrado do cliente pela oficina, a unidade de cobrança, o tempo estimado e a garantia do serviço. O custo pago ao terceiro é informado no cadastro do fornecimento.'],
    fornecedor: ['Fornecedor', 'Associe ao serviço a empresa externa que pode executá-lo, quando houver.'],
    vinculo: ['Vínculo', `Escolha o fornecedor e ${servico ? 'o serviço' : 'a peça ou insumo'} que serão associados neste fornecimento.`],
    condicoes: ['Condições comerciais', servico ? 'Defina o custo pago pela oficina ao fornecedor terceirizado, a unidade de cobrança, o prazo, a disponibilidade e a validade das condições. O preço cobrado do cliente é definido no cadastro do serviço.' : 'Defina o preço pago pela oficina por unidade, o prazo de entrega e a quantidade mínima aceita pelo fornecedor.'],
    identificacao: ['Identificação do estoque', 'Escolha a peça e o local onde ela será armazenada, incluindo sua localização física.'],
    quantidades: ['Quantidades do estoque', 'Informe o saldo físico e a quantidade reservada para acompanhar o que está disponível para uso.'],
    reposicao: ['Reposição', 'Defina os limites de estoque, o momento de recomprar, a quantidade sugerida e o custo médio da peça.'],
    agendamento: ['Agendamento', 'Defina cliente, veículo, serviço, responsável e período previsto para a visita à oficina.'],
    atendimento: ['Atendimento', 'Registre a entrada do veículo, o problema relatado, o diagnóstico e os responsáveis pelo trabalho.'],
    pecas: ['Peças e insumos', origem.includes('agendamento') ? 'Inclua as peças previstas para o agendamento, com quantidades, preços e observações.' : 'Registre as peças usadas no atendimento, com quantidades, preços e observações.'],
    itens: ['Peças e serviços', 'Inclua as peças e os serviços do atendimento para compor o trabalho e seus valores.'],
    adicionais: ['Informações adicionais', origem.includes('agendamento') ? 'Complemente o agendamento com queixa do cliente, diagnóstico prévio, observações e condições da visita.' : 'Complemente o atendimento com recomendações, garantia, retorno e observações.'],
    resumo: ['Resumo do atendimento', 'Confira os dados gerais, os responsáveis e a situação do atendimento antes de ajustar seus itens.'],
    servicos: ['Serviços executados', 'Registre os serviços realizados, quem os executa, o tempo e os valores envolvidos.']
  };
  const descricao = definicoes[guia];
  return descricao ? { titulo: descricao[0], mensagem: descricao[1] } : null;
}

export function obterAjudaSelecao(titulo: string): AjudaGuia | null {
  const chave = normalizarRotulo(titulo);
  if (/^(adicionar|editar) peca/.test(chave)) return { titulo: 'Peça do registro', mensagem: 'Escolha a peça cadastrada e informe quantidade, preço e observações para incluí-la neste agendamento ou atendimento.' };
  if (/^(adicionar|editar) servico/.test(chave)) return { titulo: 'Serviço do atendimento', mensagem: 'Escolha o serviço cadastrado e informe responsável, quantidade, preço e condições de execução para incluí-lo no atendimento.' };
  if (!chave.startsWith('selecionar')) return null;
  if (chave.includes('proprietario')) return { titulo: 'Selecionar proprietário', mensagem: 'Localize a pessoa ou empresa cadastrada que será vinculada como proprietária do veículo.' };
  if (chave.includes('fornecedor')) return { titulo: 'Selecionar fornecedor', mensagem: 'Escolha a empresa cadastrada que fornecerá a peça ou executará o serviço deste registro.' };
  if (chave.includes('peca') || chave.includes('insumo')) return { titulo: 'Selecionar peça ou insumo', mensagem: 'Localize o produto cadastrado e selecione-o para preencher o item no formulário de origem.' };
  if (chave.includes('servico')) return { titulo: 'Selecionar serviço', mensagem: 'Localize a atividade cadastrada e selecione-a para preencher o serviço no formulário de origem.' };
  return null;
}

export function obterAjudaModal(titulo: string, contexto = ''): AjudaGuia | null {
  if (contexto === 'modalConfiguracaoCliente') return {titulo:'Alertas do cliente',mensagem:'Confira ou ajuste a ativação, os prazos, o limite de avisos e os horários dos lembretes de manutenção deste cliente. O histórico pertence somente ao destinatário selecionado.'};
  if (contexto === 'modalConfiguracaoColaborador') return {titulo:'Alertas de estoque',mensagem:'Defina o único responsável pela reposição e o intervalo entre os avisos de estoque. O responsável deve ser um administrador ou colaborador ativo com telefone cadastrado.'};
  if (contexto === 'modalContinuarUsuario') return { titulo: 'Veículo do usuário', mensagem: 'O usuário já está salvo. Cadastre seu veículo com o proprietário preenchido automaticamente. Depois, configure seus alertas de manutenção preventiva, ou conclua por enquanto.' };
  if (contexto === 'modalAlertasNovoUsuario') return { titulo: 'Alertas do usuário', mensagem: 'Defina quando o usuário receberá avisos de manutenção preventiva para seus veículos. O usuário e o veículo já estão salvos.' };
  if (contexto === 'modalAlertasEstoque') return { titulo: 'Acompanhamento dos alertas', mensagem: 'Consulte as peças que precisam de reposição. Reconhecer mantém o alerta em acompanhamento; a entrada que normaliza o saldo o resolve. Encerrar sem repor exige justificativa.' };
  if (contexto === 'modalEncerramentoAlerta') return { titulo: 'Encerramento excepcional', mensagem: 'Justifique por que este alerta deve parar de enviar lembretes sem repor o estoque. Esta ação não altera o saldo e fica registrada no histórico.' };
  if (normalizarRotulo(titulo).includes('continuar cadastro do servico')) return { titulo: 'Fornecimento do serviço', mensagem: 'O serviço já está salvo. Continue para selecionar ou cadastrar um fornecedor e informar custo, prazo e condições do fornecimento, ou conclua por enquanto.' };
  const chave = normalizarRotulo(titulo);
  const origem = normalizarRotulo(contexto);
  if (chave.includes('continuar cadastro da peca')) return { titulo: 'Completar o cadastro da peça', mensagem: 'Associe a peça a um fornecedor ativo, confira as condições de fornecimento e continue com o controle de estoque. Você também pode concluir por enquanto.' };
  if (chave.includes('fornecimento existente')) return { titulo: 'Reutilizar o fornecimento', mensagem: 'Este fornecedor já está associado à peça. Confira ou atualize as condições existentes antes de continuar com o estoque, sem duplicar o vínculo.' };
  if (chave.includes('continuar cadastro do controle de estoque')) return {
    titulo: 'Completar o controle de estoque',
    mensagem: 'Continue com a peça do fornecimento para definir o local de armazenamento, o saldo físico e os limites de reposição. Se já existir controle, consulte-o ou cadastre em outro local.'
  };
  if (chave.includes('continuar cadastro do fornecedor')) return {
    titulo: 'Associar um item ao fornecedor',
    mensagem: origem.includes('servico')
      ? 'Selecione um serviço existente ou cadastre um novo. Depois, informe custo, prazo e disponibilidade para registrar o fornecimento deste fornecedor.'
      : origem.includes('peca')
      ? 'Selecione uma peça existente ou cadastre uma nova. Depois, informe preço, prazo e quantidade mínima para registrar o fornecimento deste fornecedor.'
      : 'Escolha se o fornecedor oferece peças, insumos ou serviços. Selecione um item existente ou cadastre um novo; depois, registre as condições do fornecimento para concluir a associação.'
  };
  const selecao = obterAjudaSelecao(titulo);
  if (selecao) return selecao;
  if (chave.includes('concluir atendimento')) return { titulo: 'Conclusão do atendimento', mensagem: 'Informe a quilometragem de saída e confira os dados finais do trabalho antes de concluir o atendimento.' };
  if (chave.startsWith('cancelar')) return { titulo: 'Motivo do cancelamento', mensagem: 'Explique por que este agendamento ou atendimento será cancelado. A justificativa ficará registrada junto à operação.' };
  if (chave.includes('analisar solicitacao')) return { titulo: 'Análise da solicitação', mensagem: 'Leia o pedido de alteração do acesso, escolha aprovar ou recusar e registre a justificativa da decisão.' };
  if (chave.includes('whatsapp')) return { titulo: 'Mensagem pelo WhatsApp', mensagem: 'Confira o destinatário e a mensagem que será enviada antes de confirmar a notificação pelo WhatsApp.' };
  if (chave.includes('autenticacao') || chave.includes('2fa')) return { titulo: 'Reset da autenticação', mensagem: 'Informe o motivo para remover o vínculo com o aplicativo autenticador. O usuário precisará configurar novamente a autenticação em duas etapas.' };
  if (chave.includes('deletar') || chave.includes('excluir') || chave.includes('exclusao')) return { titulo: 'Exclusão do registro', mensagem: 'Confira qual registro será excluído e, quando solicitado, informe a justificativa antes de confirmar a exclusão.' };
  if (chave.includes('inativar') || chave.includes('ativar')) return { titulo: 'Alteração do acesso', mensagem: 'Confira o usuário e a mudança de status. Informe a justificativa solicitada antes de confirmar a alteração do acesso.' };
  if (chave.includes('registrar entrada') || chave.includes('registrar saida') || chave.includes('registrar ajuste')) return { titulo: 'Movimentação do estoque', mensagem: 'Informe a quantidade movimentada e seu motivo para registrar uma entrada, saída ou correção do saldo desta peça.' };
  if (origem.includes('devolucaoatendimento')) return { titulo: 'Devolução vinculada ao atendimento', mensagem: 'Selecione a saída original, informe a quantidade devolvida, a justificativa e se há valor a restituir ao cliente. A OS original permanece preservada.' };
  if (chave.includes('local de estoque')) return { titulo: 'Local de estoque', mensagem: 'Identifique o espaço físico onde as peças serão armazenadas para organizar e localizar o estoque.' };
  if (origem.includes('regra')) return { titulo: 'Regra de manutenção', mensagem: 'Defina o serviço preventivo, os veículos aos quais se aplica e os intervalos de tempo ou quilometragem que geram o alerta.' };
  if (chave.includes('historico') && (chave.includes('moviment') || origem.includes('estoque'))) return { titulo: 'Histórico do estoque', mensagem: 'Confira as entradas, saídas e ajustes da peça, com quantidades, saldos, custos, documentos e responsáveis por cada movimentação.' };
  if (chave.includes('notificac')) return { titulo: 'Notificações', mensagem: 'Confira os avisos registrados, os destinatários, as datas, as tentativas de envio e os resultados informados pelo provedor.' };
  if (chave.includes('selecionar moviment')) return { titulo: 'Movimentação de origem', mensagem: 'Localize a movimentação original para vincular a devolução ou a correção ao registro que originou a alteração do estoque.' };
  if (chave.includes('fornecimento')) return { titulo: 'Dados do fornecimento', mensagem: chave.includes('servico') || origem.includes('servico') ? 'Este registro associa um fornecedor ao serviço e reúne o custo pago pela oficina, o prazo e as condições de execução.' : 'Este registro associa um fornecedor à peça e reúne o preço pago pela oficina, o prazo de entrega e a quantidade mínima de compra.' };
  if (chave.includes('estoque')) return { titulo: 'Controle de estoque', mensagem: 'Este registro reúne a peça, o local de armazenamento, as quantidades disponíveis e reservadas, os limites de reposição e o custo médio por unidade.' };
  if (chave.includes('usuario') || chave.includes('cliente')) return { titulo: 'Dados do usuário', mensagem: 'Confira os dados pessoais, os contatos, o endereço e as informações de acesso que identificam este usuário no sistema.' };
  if (chave.includes('fornecedor')) return { titulo: 'Dados do fornecedor', mensagem: 'Confira a identificação da empresa, os produtos ou serviços fornecidos, os contatos e o endereço usados pela oficina.' };
  if (chave.includes('veiculo')) return { titulo: 'Dados do veículo', mensagem: 'Confira a placa, as características do veículo e o proprietário associado para identificar corretamente seu cadastro e histórico.' };
  if (chave.includes('peca') || chave.includes('insumo')) return { titulo: 'Dados da peça ou insumo', mensagem: 'Confira o nome, o fabricante, a unidade de medida e a classificação técnica que identificam o produto usado pela oficina.' };
  if (chave.includes('servico')) return { titulo: 'Dados do serviço', mensagem: 'Confira a atividade, a categoria, o prestador, o preço de referência cobrado do cliente e os dados de duração e garantia.' };
  if (chave.includes('agendamento')) return { titulo: 'Dados do agendamento', mensagem: 'Confira o cliente, o veículo, os serviços previstos, o responsável e a data reservada para a visita à oficina.' };
  if (chave.includes('atendimento')) return { titulo: 'Dados do atendimento', mensagem: 'Confira o veículo atendido, os problemas relatados, o diagnóstico, as peças e serviços utilizados e a situação do trabalho.' };
  if (chave.includes('auditoria')) return { titulo: 'Registro de auditoria', mensagem: 'Confira a operação registrada, sua data, o responsável, o registro afetado e o resultado para acompanhar as alterações realizadas no sistema.' };
  return null;
}
