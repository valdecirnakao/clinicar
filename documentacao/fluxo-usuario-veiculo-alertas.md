# Cadastro integrado de usuário, veículo e alertas

O cadastro do usuário continua independente. Após a confirmação pelo servidor, a opção **Cadastrar veículo** abre o mesmo formulário do gerenciamento de veículos, com o proprietário fixado no usuário recém-cadastrado. Cada etapa é salva separadamente.

- **Cliente, administrador ou colaborador:** usuário → veículo → configuração de alertas de manutenção preventiva do usuário.
- **Concluir por enquanto:** preserva os registros já salvos. Veículos podem ser cadastrados depois em Veículos; configurações de clientes, em Alertas → Clientes.
- Cancelar o formulário do veículo retorna à continuação do usuário. A placa continua sujeita à validação de duplicidade.
- A configuração de alertas pertence ao usuário e se aplica aos seus veículos. Criar o veículo não ativa os alertas automaticamente.

## Verificação manual

1. Cadastre um cliente e clique em Cadastrar veículo. Confira nome, documento e contatos do proprietário; a troca de proprietário deve estar desabilitada.
2. Preencha o veículo, confirme a placa e salve. Confira que o veículo aparece associado ao cliente em Veículos.
3. Na configuração de alertas, ajuste os parâmetros e salve. Em Alertas → Clientes, confira os valores apenas para esse cliente.
4. Repita para um administrador e um colaborador: após salvar o veículo, configure e salve os alertas vinculados ao usuário recém-cadastrado.
5. Cadastre outro usuário e clique em Concluir por enquanto: o usuário deve permanecer na tabela sem criação de veículo.
6. Cancele o veículo antes de salvar: a opção de continuar deve reaparecer e o usuário deve continuar salvo.
7. Tente uma placa existente: corrija a placa antes de avançar; nenhum veículo duplicado nem configuração de alertas deve ser criado.
8. Salve um veículo de cliente e conclua sem salvar os alertas: o usuário e o veículo devem permanecer cadastrados; a configuração pode ser realizada depois.
9. Na configuração de alertas, apague um campo obrigatório: a borda e a mensagem devem indicar o problema, o progresso deve diminuir e Salvar configuração deve ficar desabilitado. Corrija o valor para recuperar o progresso. Verifique também um intervalo fracionário e uma hora final menor ou igual à inicial.

Os testes automatizados verificam o identificador devolvido pelo servidor, as ramificações por perfil, a associação do proprietário, a prevenção de envio duplo e a preservação do fluxo quando o servidor recusa o cadastro.
