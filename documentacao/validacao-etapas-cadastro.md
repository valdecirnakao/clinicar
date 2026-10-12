# Validação das etapas dos novos cadastros

O botão Próximo e o acesso direto às guias futuras dependem da validação de todas as etapas anteriores. É possível voltar para corrigir dados. Ao alterar um campo obrigatório de uma etapa anterior, o avanço volta a ser bloqueado até a correção e a conclusão das consultas necessárias.

Aplicado aos cadastros de usuários, fornecedores, veículos, peças, serviços, estoque de peças, fornecimento de peças, fornecimento de serviços, agendamentos e atendimentos.

Nos cadastros de usuários e fornecedores, CPF/CNPJ e e-mail precisam concluir a consulta de duplicidade. No cadastro de veículos, a mesma regra vale para a placa. A alteração do valor cancela a consulta anterior e exige nova validação. Se a consulta falhar, a mensagem orienta sair novamente do campo para tentar de novo. Campos opcionais não são obrigatórios para avançar; regras condicionais continuam sendo respeitadas, como a classificação técnica do óleo e o custo médio quando há estoque.

## Testes manuais

1. Abra cada novo cadastro com guias. Com campos obrigatórios vazios, confirme que Próximo e as guias seguintes estão desabilitados.
2. Preencha apenas parte da etapa e tente acessar a última guia. O acesso deve continuar bloqueado.
3. Preencha a etapa corretamente. Nos campos com consulta de duplicidade, saia do campo e aguarde a resposta. Somente a etapa seguinte será liberada se as demais ainda estiverem incompletas.
4. Use um CPF/CNPJ, e-mail ou placa já cadastrado. Confira a mensagem no campo e o bloqueio do avanço. Corrija o valor e aguarde a nova consulta para continuar.
5. Retorne a uma etapa anterior, apague um campo obrigatório ou altere um campo com consulta. Confirme que as guias futuras voltam a ficar bloqueadas.
6. Complete as etapas sem preencher campos opcionais. A revisão deve continuar acessível quando todos os requisitos obrigatórios forem atendidos.
7. No cadastro de óleo de motor, confirme o bloqueio da revisão enquanto a classificação técnica estiver incompleta. No estoque, teste quantidade reservada maior que a atual e custo médio obrigatório.

Verificação automatizada: navegação compartilhada, bloqueio nos dez componentes, consultas de duplicidade e classificação condicional de peças, além da suíte completa da interface.
