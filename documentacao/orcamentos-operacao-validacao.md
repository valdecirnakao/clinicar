# Orçamentos, operação e validação

## Decisão do cliente sobre orçamento

Quando a equipe conclui o diagnóstico e solicita aprovação, o sistema grava uma versão do orçamento com serviço, peças, diagnóstico, valores, desconto, total e prazo. Na guia **Meus atendimentos**, o titular vê essa versão e pode aceitá-la ou recusá-la. A decisão registra data, usuário e a versão decidida. Um cliente não pode decidir o orçamento de outro; uma decisão repetida ou de uma versão substituída é recusada. A equipe não pode aprovar em nome do cliente pelo botão antigo.

Se for preciso mudar escopo ou preço antes da execução, a equipe usa **Revisar orçamento**, altera os dados e envia outra versão. A aprovação anterior deixa de valer. A conferência também ocorre no servidor antes do aceite para evitar que uma alteração simultânea seja aceita com valores antigos. O histórico das versões permanece no banco.

Este fluxo exige teste funcional com cliente e equipe usando dados fictícios. Confirmar se os itens e valores exibidos são compreensíveis, se a recusa leva à revisão e se a nova proposta substitui a anterior. Em 16/10/2026, a migração V29 foi aplicada ao banco local após backup verificado e plano de reversão documentado; isso ainda não constitui aceitação pelos usuários. Ver [Plano de reversão local](reversao-local-v29-20261016.md).

## Cópias e restauração

O script `scripts/Backup-CliniCar.ps1 -Destino <pasta externa>` cria uma cópia lógica **criptografada** (`.ccbak`) em uma pasta já existente fora do projeto, com SHA-256. Ele solicita interativamente uma senha de recuperação com ao menos 12 caracteres. O SQL segue diretamente do `mysqldump` para a criptografia AES-256-GCM em blocos; não é salvo em claro no Drive. A senha não deve ser informada no chat, colocada na linha de comando como texto nem guardada no Git. Guarde-a em local seguro independente do computador e do Drive: sem ela, não há recuperação. Nunca guardar esta cópia no Git. A cópia só é aceita se o MySQL do CliniCar estiver saudável.

Em 14/10/2026 foi observado o Drive para computador em `G:\My Drive`, com a pasta `CliniCar\Backups-Banco-de-Dados\2026\10` acessível. A letra da unidade pode mudar; confirme o caminho antes de executar. Após a cópia, confira no Drive pela web se **o `.ccbak` e o `.sha256`** chegaram e se a sincronização terminou. Não compartilhe essa pasta. Para verificar a recuperação, execute `scripts/Testar-Restauracao-CliniCar.ps1 -Arquivo <copia.ccbak>`: o script compara o hash, exige a senha, verifica a autenticação do arquivo e envia o SQL descriptografado diretamente à entrada de um MySQL descartável sem rede/portas; não cria um `.sql` local. Repita a restauração periodicamente e após mudanças de infraestrutura.

Na pasta `C:\TG`, use PowerShell 7 para a primeira execução interativa. Se `pwsh` estiver disponível no terminal:

```powershell
pwsh -NoProfile -File .\scripts\Backup-CliniCar.ps1 -Destino 'G:\My Drive\CliniCar\Backups-Banco-de-Dados\2026\10'
```

No computador de desenvolvimento verificado em 14/10/2026, `pwsh` não está no PATH do Windows PowerShell, mas o PowerShell 7.6.5 incluído no ambiente Codex pode ser executado pelo caminho completo:

```powershell
& 'C:\Users\mi6-a\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe' -NoProfile -File '.\scripts\Backup-CliniCar.ps1' -Destino 'G:\My Drive\CliniCar\Backups-Banco-de-Dados\2026\10'
```

Esse caminho pertence ao ambiente Codex e pode mudar em uma atualização. Para uma rotina permanente, configurar uma instalação estável do PowerShell 7 antes de agendar a cópia. Em 14/10/2026, a primeira execução real criou `clinicar-20261014-150026.ccbak` (123736 bytes) e o manifesto `.sha256` na pasta indicada; o hash calculado corresponde ao manifesto. O ensaio de restauração dessa cópia real foi concluído depois. Para repetir o ensaio, execute no mesmo terminal, na pasta `C:\TG`:

```powershell
& 'C:\Users\mi6-a\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe' -NoProfile -File '.\scripts\Testar-Restauracao-CliniCar.ps1' -Arquivo 'G:\My Drive\CliniCar\Backups-Banco-de-Dados\2026\10\clinicar-20261014-150026.ccbak'
```

O prompt solicita a senha sem exibi-la. Para ensaiar a restauração, passe o caminho do `.ccbak` criado ao script de teste; ele solicitará a mesma senha. Não coloque a senha diretamente em um comando, arquivo `.env`, tarefa agendada ou mensagem.

Na primeira tentativa de restauração da cópia real, o MySQL descartável 8.4 rejeitou a importação; o script então passou a usar por padrão a imagem MySQL 8.0 do CliniCar. Outras tentativas perderam a conexão com o MySQL descartável (erro 2013, em linhas variáveis). O problema foi reproduzido com 44 tabelas e dados totalmente sintéticos: a checagem de prontidão aceitava o servidor temporário de inicialização, que era desligado durante a importação. O script agora aguarda o marcador de conclusão da inicialização antes de conectar pelo socket. Após a correção, o ensaio sintético restaurou 44 tabelas sem erro. O usuário repetiu o ensaio da cópia real e informou o resultado **"Restauração de teste concluída em banco descartável: 44 tabelas verificadas"**. Isso valida a importação técnica dessa cópia, sem substituir conferência funcional dos dados.

Foi observado também que o `mysqldump` do banco em uso emitia um erro de privilégio `PROCESS` ao ler tablespaces, mesmo concluindo com código zero e marcador final. Para as próximas cópias, o gerador usa `--no-tablespaces`, testado sem esse erro, e rejeita a cópia se o `mysqldump` relatar erro. A cópia original foi preservada. Em 14/10/2026, o usuário criou uma nova cópia com o gerador corrigido: `clinicar-20261014-154420.ccbak` (124076 bytes); o arquivo e seu manifesto `.sha256` estão presentes e o hash confere. O usuário informou que o ensaio de restauração dessa nova cópia executou normalmente no banco descartável e confirmou que ambos os arquivos aparecem no Google Drive pela web.

O destino externo, as duas cópias reais e seus ensaios de restauração foram concluídos; a sincronização da segunda cópia foi confirmada pelo usuário no navegador. A tarefa automática foi ativada em 14/10/2026, com retenção de todas as cópias por enquanto. O teste `scripts/Testar-Criptografia-Backup.ps1` usa apenas dados sintéticos; houve também ensaios de restauração com dados sintéticos antes da cópia real.

### Rotina diária ativa

O usuário escolheu executar diariamente às 20h e manter todas as cópias por enquanto. O PowerShell 7 oficial foi instalado em `C:\Program Files\PowerShell\7\pwsh.exe` (versão 7.6.7 verificada em 14/10/2026), pois o executável incluído no Codex pode mudar de caminho. Para ativar a rotina, execute uma vez em `C:\TG`:

```powershell
& 'C:\Program Files\PowerShell\7\pwsh.exe' -NoProfile -File '.\scripts\Configurar-Backup-Automatico-CliniCar.ps1'
```

O configurador solicita localmente a senha de recuperação já guardada pelo usuário, confere-a contra a cópia mais recente, guarda uma versão protegida pela API de proteção de dados do Windows no perfil local e registra uma tarefa para as 20h e para o logon. A tarefa roda apenas na sessão desse usuário, usa scripts copiados para uma pasta privada em `%LOCALAPPDATA%\CliniCar\Backup`, espera Drive e Docker por até dez minutos, cria a pasta do mês se necessário e evita uma segunda cópia íntegra no mesmo dia. Não apaga cópias. Se o computador estiver desligado ou o usuário não estiver conectado às 20h, o gatilho no próximo logon tenta recuperar a execução perdida. Após uma falha, o Agendador fará até 24 novas tentativas, com intervalo de 30 minutos. O Drive e o Docker precisam estar disponíveis; falhas ficam em `%LOCALAPPDATA%\CliniCar\Backup\ultimo-resultado.json` e na tarefa do Windows. Para consultar:

```powershell
& 'C:\Program Files\PowerShell\7\pwsh.exe' -NoProfile -File '.\scripts\Verificar-Backup-Automatico-CliniCar.ps1'
```

A proteção local da senha é vinculada a este usuário e computador; ela permite automação, mas não substitui a cópia independente da senha para recuperação em outro equipamento. Após mudar estes scripts, execute o configurador novamente para atualizar as cópias privadas usadas pela tarefa. Verifique regularmente o resultado, o espaço disponível no Drive e ensaie uma restauração periodicamente. Em 14/10/2026, o Agendador do Windows mostrou a tarefa pronta, com gatilhos de logon e diário às 20h, próxima execução às 20h e último resultado 0. A execução de teste registrou `ja_executado` em `ultimo-resultado.json`: encontrou a cópia íntegra `clinicar-20261014-154420.ccbak` do próprio dia e, corretamente, não gerou outra. A criação de uma cópia nova pela tarefa automática ainda precisa ser observada em um dia seguinte.

Em 16/10/2026, o computador voltou a ser ligado; a tentativa no logon falhou porque Drive ou MySQL não ficou disponível nos dez minutos iniciais. Depois que os serviços ficaram saudáveis, a tarefa foi iniciada novamente e criou `clinicar-20261016-120511.ccbak` com manifesto SHA-256 conferido. Assim, a geração por meio da tarefa foi observada; o disparo das 20h ainda não foi observado nesta etapa. A configuração de repetição após falha foi acrescentada à tarefa existente e ao configurador. Antes da V30, uma segunda cópia, `clinicar-20261016-121608.ccbak`, também foi criada e teve o hash conferido. A sincronização web dessas cópias de 16/10 ainda deve ser conferida pelo responsável.

## Monitoramento

`scripts/Verificar-Operacao-CliniCar.ps1` verifica a resposta web, a saúde do MySQL e contagens de notificações com falha, resultado indeterminado ou pendentes além de 30 minutos. Retorna erro para integração com um agendador/monitor externo. Não reenvia mensagens nem lê destinatários ou conteúdo. Falhas indeterminadas requerem conferência no provedor antes de qualquer reenvio. Configurar responsável, frequência e canal de aviso na implantação; não há envio automático de avisos deste script.

## Aceitação e desempenho

Realizar sessões guiadas com ao menos um administrador, um recepcionista, um mecânico e um cliente, usando dados fictícios. Registrar tarefas concluídas, dificuldades e decisão de aceite em evidência separada, conforme o [Roteiro de aceite](roteiro-aceite-20261016.md). Incluir navegação por teclado, foco visível, leitura por tecnologia assistiva, contraste, zoom de 200% e tela pequena. Testes automatizados não substituem essa aceitação.

Em 16/10/2026, as consultas de agendamentos, atendimentos, estoque e orçamento foram examinadas com `EXPLAIN ANALYZE` em MySQL descartável e dados sintéticos. O fluxo de atendimentos por cliente recebeu o índice composto da V30; a medição antes/depois e seus limites estão em [Medição controlada de consultas](medicao-consultas-20261016.md). Latência HTTP e aceitação com usuários continuam pendentes.
