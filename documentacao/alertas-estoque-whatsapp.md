# Alertas de estoque pelo WhatsApp

A página Alertas reúne a configuração de manutenção preventiva e a de estoque. O modal Alertas abertos de estoque também oferece acesso à configuração de estoque.

## Configuração inicial

1. Escolha um administrador ou colaborador ativo como responsável pela reposição.
2. Confira o telefone cadastrado no usuário, com código do país e DDD. Para alterá-lo, edite o usuário e selecione-o novamente na configuração.
3. O template e o idioma são definidos pela manutenção da integração no servidor, sem campos editáveis na tela. O padrão do projeto é `alerta_estoque_peca`, `pt_BR`.
4. Defina o intervalo entre lembretes (1 a 720 horas; padrão 24).
5. Ative os alertas e salve. A integração WhatsApp do servidor também precisa estar habilitada e configurada.
6. Após corrigir uma falha, clique em Reenviar alertas pendentes. Apenas pendências ainda abertas e compatíveis com o saldo atual são consideradas. Salve as alterações antes de reenviar.

Não há ativação automática nem escolha implícita de destinatário para uma base nova. A ausência de configuração não impede a movimentação do estoque; o alerta interno informa como habilitar o envio.

O envio de estoque também depende de `CLINICAR_WHATSAPP_ENABLED=true` no arquivo `.env` do servidor, além das credenciais da integração. Depois de alterar essa opção, recrie o backend com `docker compose --env-file .env -f compose.yaml -f compose.dev.yaml up -d --no-deps backend`. Reiniciar o container existente não atualiza suas variáveis. Essa habilitação é independente da escolha do responsável e não altera o envio das notificações de usuários e veículos.

Para manutenção técnica, `CLINICAR_ESTOQUE_ALERTA_TEMPLATE` e `CLINICAR_ESTOQUE_ALERTA_IDIOMA` permitem definir o template aprovado e seu idioma no servidor. O template deve manter seis parâmetros nesta ordem: responsável, peça, nível, quantidade atual, mínimo e local. Os valores são validados ao iniciar o backend. A API operacional aceita somente versão, ativação, responsável e intervalo entre lembretes; o envio utiliza exclusivamente a configuração do servidor, inclusive quando os registros legados do banco contêm outros nomes ou idiomas. Depois de alterar essas variáveis, recrie o backend.

## Comportamento

O saldo disponível é o atual menos as reservas. Ao atingir o mínimo, o crítico ou zero, cria-se um alerta do nível atual. Níveis anteriores são encerrados, evitando lembretes desatualizados. Quando o saldo volta ao normal, o alerta é encerrado automaticamente.

O acompanhamento verifica estoques ativos a cada minuto. Envios aceitos e falhas persistem a última tentativa, que governa o intervalo de lembretes e novas tentativas mesmo após reinício. O reenvio manual pode antecipar o intervalo. Reenvio em lote considera apenas pendências; sucessos não são repetidos por essa ação. Falhas de configuração não contam como tentativas de envio à API.

As rotinas usam o bloqueio do estoque durante avaliação/envio para evitar concorrência com outras avaliações e alterações de saldo. A configuração usa controle de versão para evitar sobrescrever alterações de outro administrador.

O histórico informa aceitação pela Meta, que não confirma a entrega na caixa do destinatário. Em falhas de comunicação pode haver incerteza sobre aceitação; verifique a Meta antes de reenviar manualmente. O sistema registra o último resultado e o total de tentativas, sem registrar cada tentativa como evento separado.

## Tratamento dos alertas

- **Registrar entrada:** abre a movimentação de entrada com a peça e o local do alerta, consultando o estoque atual. Não registra nenhuma quantidade automaticamente: a entrada deve corresponder às peças realmente recebidas. Uma entrada insuficiente mantém o acompanhamento.
- **Reconhecer alerta:** registra a primeira ciência, com nome e identificador do administrador autenticado e data/hora. O alerta continua aberto e os lembretes permanecem ativos. Novos reconhecimentos não sobrescrevem a primeira ciência.
- **Resolução automática:** ocorre quando o saldo disponível (atual menos reservado) fica acima dos limites que geram alerta. Uma compra planejada ou o reconhecimento do aviso não normalizam o estoque.
- **Encerrar excepcionalmente:** exige justificativa entre 10 e 1.000 caracteres e registra nome, identificador e data/hora do administrador. Não altera saldo, custo nem cria movimentações. Suspende os lembretes do nível atual enquanto ele persistir. Quando o nível muda, a suspensão termina; um novo nível de alerta gera acompanhamento novamente. Após normalização, uma futura queda também gera novo alerta.

A opção **Mostrar também alertas encerrados** permite consultar os reconhecimentos e encerramentos anteriores. Alertas substituídos por outro nível aparecem como **Substituído por outro nível**, preservando a distinção em relação à resolução por normalização. A API antiga de resolução rejeita o encerramento enquanto o estoque estiver baixo.

O modal utiliza botões com ícones lado a lado e paginação com contador de registros, seleção de quantidade e navegação por páginas. O limite por página se adapta à altura da janela para manter linhas compactas sem rolagem vertical na lista. O botão **Visualizar detalhes** apresenta mensagens completas, falhas de envio, autoria, horários e justificativas, com retorno à página consultada. Ao mudar o filtro de encerrados, a consulta retorna à primeira página; uma atualização mantém a página atual quando ainda existe.

Aplicar também `bd/migrations/018_acompanhamento_alertas_estoque.sql` antes da atualização. A migração é idempotente e preserva os alertas existentes; os registros anteriores não recebem autoria inventada.

Para testar: reconheça um alerta e confira que continua aberto; abra e cancele uma entrada sem alterar saldo; registre uma entrada que mantenha o disponível abaixo do mínimo e confira que continua aberto; registre quantidade suficiente e confira a resolução automática. Encerre outro alerta excepcionalmente com justificativa, consulte sua autoria no histórico e confira que não reaparece no mesmo nível. Altere o saldo para um nível mais grave e confira o novo acompanhamento.

## Atualização e testes

Aplicar bd/migrations/017_configuracao_alertas_estoque.sql antes de reiniciar o backend. É idempotente, preserva os dados, centraliza a configuração no registro 1 e adiciona controle de versão, responsável e horário da última tentativa. Bases novas começam com o envio desativado. Não exclua a configuração ao limpar dados operacionais.

Teste configuração incompleta, responsável sem telefone ou inativo e intervalo inválido. Salve uma configuração válida e confira a redução ao mínimo, ao crítico e a zero. Reduza novamente dentro do intervalo e confira que não há repetição; após o intervalo, confira o lembrete. Reponha acima do mínimo e confira o encerramento. Em ambiente de teste, provoque uma falha de template pela configuração técnica do servidor, consulte o motivo, corrija a configuração e reenvie pendências. Confira que sucessos não são reenviados em lote e que um alerta antigo não pode ser reenviado depois da normalização.
