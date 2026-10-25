# Seletores e organização dos formulários — 12/10/2026

## Alterações

Os formulários de agendamento, atendimento, manutenção preventiva, estoque, histórico veicular e configurações de alertas agora pesquisam os cadastros no servidor. A busca apresenta cinco registros por página, permite pesquisar outros registros e recupera seleções existentes pelo identificador. Não transfere os catálogos completos ao abrir os formulários. Os seletores em modais já paginados também deixaram de solicitar indicadores e opções de filtros desnecessários.

A consulta de responsáveis considera os perfis e o status, além de excluir no servidor os agendamentos que ocupam o período informado. A disponibilidade permanece validada ao salvar. A escolha de uma peça mantém a regra existente de preferência pelo fornecimento ativo de menor custo; a condição de fornecimento é recuperada antes de comunicar a escolha ao formulário. O serviço principal de um atendimento também é recuperado individualmente para preservar seu valor-base.

Foram extraídos 174 métodos de regras e formatação para quatro classes de apoio sem estado de tela. Os componentes continuam responsáveis pelas interações, enquanto as classes de apoio concentram cálculos e transformações. A extração preserva os nomes e assinaturas usados pelos formulários.

| Componente | Linhas antes | Linhas depois |
| --- | ---: | ---: |
| Agendamento | 2.482 | 1.965 |
| Atendimento | 3.050 | 2.446 |
| Controle de estoque | 2.455 | 1.918 |
| Manutenção preventiva | 2.896 | 2.324 |

A comparação usa o commit `446acae9`. A quantidade de linhas é uma medida de organização, não uma prova de melhoria de desempenho.

## Medição controlada

Teste com 1.000 peças sintéticas, banco H2 isolado e rollback, sessão autenticada e chamadas HTTP internas ao servidor. Comparação entre o catálogo completo, usado anteriormente no seletor, e uma página de cinco registros. Foram descartadas três amostras de aquecimento e medidas vinte amostras, alternando as duas consultas.

| Medida | Catálogo completo | Página de cinco registros |
| --- | ---: | ---: |
| Corpo da resposta | 396.894 bytes | 2.061 bytes |
| Mediana | 60,233 ms | 41,750 ms |
| Percentil 95 | 138,591 ms | 100,193 ms |

O corpo da resposta diminuiu aproximadamente 99,48% neste cenário. As latências são referências locais e não estimativas para a oficina em produção. Rede, volume de dados, cache, infraestrutura e concorrência podem alterar os resultados. O teste confere também a contagem de 1.000 itens, a última página e a localização do item de número 999 pela busca.

## Evidências

- 328 testes do frontend aprovados: `tmp/seletores-testes-final-02.log`.
- 294 testes do backend aprovados: `tmp/seletores-backend-final.log`.
- Dez cenários anteriores de navegador continuam aprovados; os sete novos cenários de busca e responsividade foram aprovados: `tmp/seletores-browser-02.log` e `tmp/seletores-browser-03.log`.
- Benchmark e testes negativos de autorização, perfil e situação: `tmp/seletores-benchmark.log` e `SeletoresPaginadosIntegrationTest`.
- Os testes de navegador usam respostas controladas, sem gravação na base da oficina ou envio real de mensagens.
- Os doze recursos de seleção foram verificados no MySQL isolado: `tmp/seletores-mysql.log`.
- Imagens frontend/backend construídas e aplicadas localmente. Nginx validado e saúde da aplicação `UP`: `tmp/seletores-docker-build.log` e `tmp/seletores-publicacao.log`.
- Arquivos executáveis anteriores preservados em `backup/pre-seletores-20261012`, com hashes SHA-256. Banco principal e serviços do projeto professor não foram recriados. As imagens anteriormente usadas pelos containers já não estavam no catálogo do Docker; foram preservados o JAR, os arquivos publicados do frontend e a configuração Nginx diretamente dos containers.

## Limites

Esta etapa cobre os catálogos usados na seleção dos registros. Os históricos específicos e os cálculos de correções/devoluções continuam com seu comportamento anterior, pois não se pode calcular saldo usando somente uma página de lançamentos. A paginação desses históricos precisa preservar os cálculos no servidor. A aceitação dos fluxos com dados reais e a confirmação de entrega pela Meta continuam sendo verificações operacionais, além dos testes automatizados.

Atualização posterior: a paginação dos históricos de movimentações e seleções para correção/devolução foi implementada com os cálculos completos no servidor. Consulte [Histórico de movimentações paginado](historico-movimentacoes-paginado.md) para a versão atual e suas evidências.
