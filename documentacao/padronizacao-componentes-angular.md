# Padronização dos componentes Angular

As telas com o prefixo `Exibe` foram renomeadas para representar suas entidades. Os sufixos `Component` e `Service` foram mantidos. Pastas, arquivos, seletores, imports, testes e navegações internas utilizam os novos nomes.

| Componente anterior | Componente atual | Rota atual em `/menuAdministrador/` |
| --- | --- | --- |
| ExibeUsuarioComponent | UsuarioComponent | usuario |
| ExibeFornecedorComponent | FornecedorComponent | fornecedor |
| ExibeVeiculoComponent | VeiculoComponent | veiculo |
| ExibePecaComponent | PecaComponent | peca |
| ExibeServicoComponent | ServicoComponent | servico |
| ExibeAgendamentosComponent | AgendamentoComponent | agendamento |
| ExibeAtendimentosComponent | AtendimentoComponent | atendimento |
| ExibeFornecimentoPecaComponent | FornecimentoPecasComponent | fornecimentoPecas |
| ExibeFornecimentoServicosComponent | FornecimentoServicoComponent | fornecimentoServico |
| ExibeControleEstoquePecasComponent | ControleEstoquePecasComponent | controleEstoquePecas |
| ExibeRegrasManutencaoComponent | RegraManutencaoComponent | regraManutencao |

Os endereços anteriores com `exibe` redirecionam para as rotas atuais, preservando os parâmetros da consulta e o fragmento. A proteção de acesso administrativo continua aplicada às páginas. Os contratos da API e os dados armazenados permanecem iguais.

## Verificação manual

1. Acesse cada opção do menu administrativo e confirme a abertura da tela correspondente.
2. Abra um endereço antigo, como `/menuAdministrador/exibeUsuario`, e confira o redirecionamento para `/menuAdministrador/usuario`.
3. Percorra os fluxos de fornecedor, peça, serviço, fornecimento e estoque, verificando a continuidade dos cadastros.
4. Abra o histórico a partir de um veículo e um atendimento a partir de um agendamento, verificando que o registro selecionado é preservado.
