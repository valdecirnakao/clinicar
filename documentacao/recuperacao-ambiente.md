# Diagnóstico e recuperação do ambiente Docker

O projeto usa o `.env` na raiz para as senhas MySQL, a chave de criptografia MFA e a configuração de notificações. Os exemplos `.env.example` e `.env.gmail.example` não contêm senhas. Em instalações existentes, preserve o `.env` e a chave MFA: trocar variáveis não atualiza as contas de um volume MySQL já inicializado.

## Diagnóstico

Na raiz do projeto, com Docker Desktop iniciado:

```powershell
.\scripts\Validar-Scripts.ps1
.\scripts\Diagnosticar-CliniCar.ps1
```

A validação verifica a sintaxe dos scripts e o escape de literais SQL sem modificar o banco. O diagnóstico consulta a saúde dos contêineres, compara a configuração recebida com o Compose e verifica autenticação. Não imprime os valores das senhas.

## Recuperação de credenciais MySQL

Use este procedimento somente quando o diagnóstico confirmar incompatibilidade das credenciais, como erro 1045. Confira primeiro os valores desejados no `.env`; variáveis `MYSQL_ROOT_PASSWORD` e `MYSQL_APP_PASSWORD` definidas na sessão PowerShell devem ser removidas dessa sessão para evitar precedência sobre o arquivo.

Para consultar a orientação inicial sem aplicar alterações:

```powershell
.\scripts\Recuperar-MySql.ps1
```

Para executar a recuperação deliberadamente, em uma janela de manutenção:

```powershell
.\scripts\Recuperar-MySql.ps1 -Aplicar
```

O script interrompe a aplicação e o MySQL, cria e verifica uma cópia física integral em `backup`, sincroniza as contas do banco com o `.env` e confirma saúde e autenticação antes de liberar o reinício da aplicação. O volume e as tabelas são preservados. O procedimento exige um volume Docker em `/var/lib/mysql` e verifica a identidade do Compose e a imagem do servidor.

Após sucesso:

```powershell
docker compose --env-file .env -f compose.yaml -f compose.dev.yaml up -d --build --no-deps backend frontend
.\scripts\Diagnosticar-CliniCar.ps1
```

Se houver falha, preserve o backup e siga a etapa indicada pelo script. Não inicie dois servidores MySQL sobre o mesmo volume. O script tenta encerrar o servidor auxiliar mesmo quando a recuperação falha e informa quando essa limpeza exige atenção.

## Atualização do esquema

Recuperar credenciais não aplica as migrações de funcionalidades. Para um banco existente, aplique as migrações pendentes em ordem numérica, seguindo as instruções associadas em `bd/migrations`, antes de iniciar a versão atualizada do backend. Bancos novos usam `bd/init.sql`.

Para notificações reais, configure o SMTP e os templates WhatsApp adequados no `.env`. Confirme o funcionamento antes de habilitar o agendador de manutenção. Não versione credenciais, backups ou arquivos de sessão.
