# Desenvolvimento do CliniCar com Codex

As orientações permanentes estão em [AGENTS.md](../AGENTS.md). O [ponto de retomada](retomada-modernizacao.md) registra o estado do desenvolvimento. As configurações atuais de acesso à pasta podem ser mantidas; esta organização não exige ampliar permissões.

## Uma tarefa por resultado

Informe o comportamento esperado, um exemplo do problema e o que precisa ser preservado. Abra um novo chat para uma tarefa independente, mantendo o projeto associado à pasta correta. Para continuar uma etapa, peça a leitura do ponto de retomada. O histórico de uma conversa não substitui a documentação do projeto.

Exemplo de correção:

> Corrija [problema] no fluxo de [funcionalidade]. Hoje acontece [resultado atual]; espero [resultado esperado]. Preserve [regra importante]. Execute os testes pertinentes, explique a causa e atualize o ponto de retomada com resultados e limitações.

Exemplo de funcionalidade:

> Implemente [funcionalidade] para o perfil [usuário]. Considere concluída quando [critérios verificáveis]. Siga os componentes existentes, valide a autorização no servidor e use dados sintéticos nos testes. Explique a decisão técnica e sua relação com os requisitos do TCC.

Exemplo de revisão:

> Revise as alterações de [etapa] procurando falhas de regras de negócio, acesso e integridade. Apresente os problemas com evidências e diferencie o que foi observado do que ainda precisa de teste.

## Registro no Git

Depois de validar uma etapa, revise as diferenças e selecione explicitamente seus arquivos. Evite incluir automaticamente todas as alterações: a pasta contém trabalho de várias funcionalidades. Inclua os testes e a documentação correspondentes no mesmo commit. Confira se segredos, logs e backups estão excluídos.

Para organizar o trabalho acumulado, estes são grupos candidatos; as dependências precisam ser conferidas antes de separar os arquivos:

1. Orientações do Codex e organização da documentação.
2. Seletores e paginação dos históricos, com testes e migração V24.
3. Destinatários de alertas por nível de estoque, com testes e migração V25.
4. Funções do colaborador e registros técnicos, com testes e migrações V26/V27.
5. Portal do cliente e demais ajustes, conforme os vínculos encontrados na revisão.

Não execute esses grupos como uma sequência automática: código compartilhado pode exigir que etapas sejam agrupadas. O pedido de organização documental não registra nem publica as alterações funcionais existentes.

## Evidências para o TCC

Para cada entrega relevante, registre: requisito atendido, comportamento antes/depois, justificativa técnica, testes executados, resultado e limitações. Dados simulados e testes técnicos não devem ser apresentados como avaliação de usuários reais. Mantenha as referências verificáveis e explique o código com suas próprias palavras.

## Manutenção do ponto de retomada

Atualize o documento existente ao encerrar uma etapa. Informe a data e distinga código presente, código testado e versão em execução. Acrescente links às evidências em vez de acumular logs e contagens antigas no resumo. Preserve o histórico quando remover informações anteriores.
