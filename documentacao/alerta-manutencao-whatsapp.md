# Alertas de manutenção preventiva por WhatsApp

O menu **Alertas** oferece **Clientes** e **Colaboradores**. Em Clientes, a tabela inclui todos os usuários com perfil CLIENTE, ativos e inativos, inclusive os que ainda não têm configuração salva. A busca, ordenação por nome/e-mail e paginação ocorrem no servidor. Os botões de detalhes e edição abrem somente as regras e o histórico do cliente selecionado; detalhes não permite salvar ou conciliar envios.

Em Colaboradores, a tabela mostra a configuração única de estoque, com responsável, telefone, ativação, intervalo e estado da integração. Há detalhes, edição e reenvio das pendências. Mantém-se um único responsável ativo, administrador ou colaborador, sem replicar avisos para vários usuários. O link antigo da configuração continua redirecionando para as novas telas, incluindo o acesso originado nos alertas de estoque. Esta divisão não exige nova migração nem altera configurações existentes.

Na opção **Alertas > Clientes**, use a ação **Editar configuração** do cliente desejado. Ativação, antecedência, intervalo, limite por previsão, tolerância após vencimento, horário e fuso pertencem exclusivamente a esse usuário e abrangem seus veículos atuais. O histórico mostra somente os envios destinados a ele. A transferência do veículo passa a usar as preferências do novo proprietário e sua própria contagem, preservando os envios antigos.

Aplicar `bd/migrations/019_alertas_manutencao_por_usuario.sql` antes de atualizar o backend. A primeira execução copia a configuração global para cada usuário existente, mantendo o comportamento anterior e todo o histórico. A tabela antiga fica preservada e deixa de controlar os envios. Reexecuções não sobrescrevem preferências individuais nem ativam usuários posteriores. Usuários novos recebem parâmetros iniciais com envio **desativado**, até o administrador salvar sua configuração. Usuários inativos ou sem telefone não recebem mensagens.

O template `alerta_manutencao_preventiva` foi informado como aprovado na Meta. O ambiente local foi configurado para utilizá-lo, com:

```dotenv
CLINICAR_MANUTENCAO_AGENDADOR_HABILITADO=true
CLINICAR_MANUTENCAO_WHATSAPP_HABILITADO=true
WHATSAPP_TEMPLATE_ALERTA_MANUTENCAO=alerta_manutencao_preventiva
```

As credenciais WhatsApp existentes são preservadas. Após modificar esses parâmetros no `.env`, é necessário recriar o serviço backend para atualizar o ambiente do container. O `.env.example` mantém os avisos desligados por padrão para que novas instalações sejam habilitadas quando suas próprias credenciais e templates estiverem disponíveis.

O processamento verifica previsões a cada minuto, enquanto o backend estiver em execução. O envio depende também da opção **Ativo** na tela **Alertas**, das previsões elegíveis, de proprietário ativo com telefone, da janela de horários, da antecedência, do intervalo entre mensagens e do limite de envios. A aprovação do template não altera essas preferências no banco.

Para validar, configure os parâmetros na tela Alertas e use uma previsão de teste elegível para um proprietário com telefone sob seu controle, dentro da janela de envio. Consulte o histórico dos avisos na mesma tela. O status **ENVIADO** confirma a aceitação pela API; recebimento e leitura dependem do WhatsApp/Meta. Resultados incertos não são repetidos automaticamente: devem ser conciliados pelo administrador após verificar o provedor.
