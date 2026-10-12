# Verificação automática do e-mail do fornecedor

Nos modais de novo fornecedor e edição, a verificação de formato e duplicidade ocorre após 500 ms sem alterações no e-mail. Não é necessário sair do campo. Domínios como `.com`, `.com.br` e `.org` são aceitos pela mesma regra de formato existente.

Alterar o valor cancela o temporizador e a consulta anterior. Enquanto houver verificação pendente ou em andamento, o avanço permanece bloqueado. A tela informa que está aguardando, consultando ou que o formato está correto e o endereço está disponível para cadastro. Isso não verifica a existência da caixa postal.

Sair do campo antecipa a verificação, sem repetir uma consulta que já esteja em andamento ou concluída. Na edição, a consulta desconsidera o próprio fornecedor. Em falha de conexão, aparece a opção **Verificar novamente**.

Para testar: preencha o e-mail e mantenha o foco no campo; após a pausa, confira a liberação do próximo passo quando os demais campos estiverem corretos. Experimente um e-mail duplicado, um incompleto, um domínio `.com.br` digitado continuamente e a alteração do e-mail na edição para o endereço de outro fornecedor.
