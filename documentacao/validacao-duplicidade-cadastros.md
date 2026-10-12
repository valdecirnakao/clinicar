# Validação de duplicidade dos cadastros

A consulta `/api/cadastros/duplicidade/{tipo}` é protegida pela sessão de administrador e usa as mesmas combinações e comparação do banco. Ela inclui registros inativos e ignora apenas o próprio ID na edição. Não retorna dados pessoais.

- Usuários: CPF/CNPJ e e-mail (verificações já existentes).
- Fornecedores: CNPJ e e-mail (verificações já existentes; proteção de e-mail adicionada ao banco).
- Veículos: placa (verificação já existente).
- Serviços: nome + categoria, com consulta no servidor e opção de usar o serviço existente. No fluxo do fornecedor, segue para as condições de fornecimento; no cadastro comum, abre a edição do serviço encontrado.
- Peças: combinação de nome, fabricante, unidade, tipo, origem do óleo, linha/modelo e viscosidade SAE. API, ACEA, OEM, descrição e outras informações complementam o cadastro, mas não permitem repetir essa combinação. Produtos com diferenças nos atributos de identificação permanecem distintos. A chave SHA-256 normalizada protege novos registros; peças legadas também são verificadas pelo catálogo, no cadastro e na edição, sem depender da chave armazenada anteriormente.
- Fornecimentos: fornecedor + peça ou fornecedor + serviço. Alterações comerciais devem editar o vínculo existente.
- Estoque: peça + local. Entradas e saídas são movimentações, não novos controles.
- Locais de estoque: nome.
- Manutenção: grupo + descrição.

Os modais verificam ao alterar a identificação, com pequeno intervalo para não consultar a cada tecla. A saída do campo antecipa a consulta. Durante a consulta ou em caso de falha, avanço e salvamento ficam bloqueados. Campos duplicados recebem destaque e mensagem. A edição exclui o próprio registro; fechar/reabrir modal cancela a consulta anterior. A primeira guia continua acessível para correção.

Agendamentos, atendimentos e movimentações podem se repetir legitimamente. Não são bloqueados apenas por envolverem o mesmo veículo ou peça. Permanecem as regras existentes de códigos únicos e de um atendimento por agendamento. Solicitações de acesso e alertas conservam suas regras específicas de pendências e repetição.

A migração `bd/migrations/012_unicidade_cadastros.sql` registra as novas restrições para ambientes que não usam atualização automática de esquema. Conferir as combinações antes de executar. A migração é idempotente e ignora colunas e índices já existentes. A versão local usa validação do esquema, portanto esta migração deve ser aplicada antes de iniciar o backend atualizado; nenhum registro é excluído para instalar as restrições.

## Reteste
1. Novo serviço: informar nome e categoria de um serviço existente; sair do campo. Ambos ficam inválidos, Próximo/Salvar bloqueados e a opção Usar serviço existente disponível.
2. No fluxo do fornecedor, selecionar essa opção: verificar fornecedor e serviço preenchidos no fornecimento.
3. Trocar a categoria ou o nome: após a consulta sem duplicidade, retomar o cadastro.
4. Editar sem mudar a identificação: salvar deve continuar permitido. Copiar a identificação de outro registro deve bloquear.
5. Repetir em peças, fornecimentos, controles, locais e regras. Em peças, variar fabricante, unidade, tipo, origem, modelo ou viscosidade deve permitir outro produto; alterar apenas API, ACEA ou OEM não libera uma identidade repetida.
6. Interromper o acesso ao servidor: a consulta informa a falha e mantém bloqueio; alterar o campo permite nova tentativa.
