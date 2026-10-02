# CliniCar

Para a instalação atual em `C:\TG`, leia primeiro [o guia de atualização e recuperação](entrega-2026-09-30/LEIA-ME.md).

Sistema web desenvolvido como Trabalho de Conclusão de Curso para apoio à gestão de oficinas mecânicas.

O CliniCar reúne funcionalidades relacionadas a clientes, usuários, veículos, fornecedores, peças, serviços, estoque, agendamentos, atendimentos, manutenção preventiva e autenticação segura.

## Tecnologias utilizadas

### Backend

- Java 23
- Spring Boot 3.5.5
- Spring Data JPA
- Hibernate
- Maven
- MySQL 8.0.42

### Frontend

- Angular 18
- TypeScript
- Bootstrap
- Bootstrap Icons
- Nginx

### Infraestrutura

- Docker
- Docker Compose
- Mailpit

## Requisitos para execução

Para executar o projeto pelo procedimento recomendado é necessário possuir:

- Docker Desktop instalado e em execução;
- Docker Compose disponível.

Não é necessário instalar localmente Java, Maven, Node.js, Angular CLI ou MySQL.

## Como executar

Clone o repositório:

```powershell
git clone https://github.com/valdecirnakao/clinicar
cd clinicar
```

Antes de iniciar, configure o arquivo `.env` a partir de `.env.example`. Em instalações existentes, preserve o `.env` original e o volume MySQL.

Para compilar o código local, use os dois arquivos Compose:

```powershell
docker compose --env-file .env -f compose.yaml -f compose.dev.yaml up -d --build
```

Na primeira execução, o Docker realizará o download das imagens necessárias, compilará o backend e o frontend, criará o banco de dados e inicializará os serviços.

Aguarde até que os serviços estejam iniciados.

## Endereços da aplicação

### CliniCar

```text
http://localhost
```

### Mailpit

```text
http://localhost:8025
```

O Mailpit é utilizado no ambiente acadêmico/local para capturar os e-mails enviados pela aplicação.

## Primeiro acesso

Em uma instalação nova:

1. Acesse `http://localhost`.
2. Na tela de login, clique em `Primeiro acesso?`.
3. Preencha o cadastro do administrador inicial.
4. Abra a caixa de e-mail do administrador (ou o Mailpit se `MAIL_HOST=mailpit`).
5. Abra o e-mail de ativação recebido.
6. Clique no link de ativação.
7. Defina a senha do administrador.
8. Retorne à tela de login.
9. Faça o primeiro login.
10. Configure a autenticação multifator TOTP utilizando um aplicativo autenticador.
11. Informe o código TOTP solicitado.
12. Após a validação, o Menu Administrador será carregado.

Nos acessos seguintes, o usuário utiliza e-mail e senha e informa o código TOTP já configurado. O QR Code de configuração não é apresentado novamente.

## Arquitetura Docker

A solução é composta por quatro serviços principais:

```text
Navegador
    |
    v
Frontend / Nginx
    |
    | /api
    v
Backend Spring Boot
    |
    +------> MySQL
    |
    +------> Mailpit
```

### frontend

Aplicação Angular compilada e servida pelo Nginx.

### backend

API REST desenvolvida com Spring Boot.

### mysql

Banco de dados relacional utilizado pela aplicação.

### mailpit

Servidor SMTP local utilizado para captura dos e-mails durante testes e demonstrações.

## Verificar os serviços

Em outro terminal:

```powershell
docker compose ps
```

O MySQL, o Mailpit e o backend devem aparecer como `healthy`. O frontend deve aparecer como `Up`.

## Encerrar a aplicação

Para parar os containers preservando os dados:

```powershell
docker compose down
```

## Iniciar novamente

```powershell
docker compose --env-file .env -f compose.yaml -f compose.dev.yaml up -d --build
```

Os dados permanecem armazenados no volume Docker.

## Configuração obrigatória por `.env`

O Compose exige `MYSQL_ROOT_PASSWORD` e `MYSQL_APP_PASSWORD` no `.env`.
Alterar esses valores não redefine contas em um volume já inicializado.
Não versionar o `.env` nem senhas/tokens. Preserve a chave MFA da instalação.

Se MySQL estiver unhealthy com ERROR 1045, siga
[documentacao/recuperacao-ambiente.md](documentacao/recuperacao-ambiente.md).
O guia inclui diagnóstico e recuperação com backup integral, sem apagar o volume.

## E-mails no ambiente local

O servidor SMTP é configurado pelas variáveis `MAIL_*` do `.env`. Para Gmail use `smtp.gmail.com:587`, autenticação, STARTTLS e senha de app.

Com `MAIL_HOST=mailpit`, os e-mails são capturados pelo Mailpit.

Os e-mails capturados pelo Mailpit podem ser consultados em:

```text
http://localhost:8025
```

## Segurança

O projeto implementa controles como:

- armazenamento de senhas com BCrypt;
- sessões autenticadas no backend;
- cookies HttpOnly;
- autenticação multifator TOTP;
- criptografia do segredo MFA;
- tokens de ativação armazenados por hash;
- expiração e consumo único de desafios de autenticação;
- controle de acesso de acordo com o perfil do usuário;
- ativação do administrador inicial;
- bloqueio do fluxo de primeiro acesso após a conclusão da configuração.

## Ambiente acadêmico

As configurações padrão presentes no Docker Compose foram preparadas para facilitar a execução e demonstração acadêmica do projeto.

Elas não devem ser utilizadas como configuração de produção.

Em uma implantação real devem ser utilizados, entre outros recursos:

- segredos próprios e seguros;
- gerenciamento apropriado de credenciais;
- HTTPS;
- cookies com configuração de produção;
- servidor SMTP real;
- infraestrutura e políticas de rede adequadas.

## Projeto acadêmico

**CliniCar — Sistema de gestão para oficina mecânica**

Trabalho de Conclusão de Curso.
