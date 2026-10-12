# Revisão de responsividade visual

Revisão realizada em 12/10/2026, preservando as cores, bordas, indicadores, componentes e estilo do CliniCar.

## Ajustes

- Configuração de largura real do dispositivo e idioma português brasileiro no documento da aplicação.
- Menu recolhido abaixo de 1.200 pixels, com altura flexível, rolagem quando necessário e fechamento após a navegação.
- Remoção dos limites de altura de computador nas páginas exibidas em telas menores e em telas baixas.
- Indicadores organizados em duas colunas no celular; filtros e ações podem ocupar mais de uma linha.
- Modais limitados à área disponível da tela, usando unidades de altura dinâmica, inclusive na orientação horizontal.
- Formulários no celular permitem rolar a área completa, incluindo ajuda e guias, para acessar os campos sem comprimi-los entre o cabeçalho e o rodapé.
- Guias com rolagem horizontal, botões do rodapé distribuídos conforme o espaço e campos maiores para uso por toque.
- Ajuda com espaço reservado mais compacto no celular, mantendo a estabilidade entre campos e guias.
- Login com separação horizontal entre acesso e cadastro no celular.
- Tabelas largas conservam a rolagem em seu próprio contêiner; as listas que já possuem cartões móveis continuam usando esses cartões.

## Cobertura verificada

Chrome com larguras de 360, 390, 768, 844, 1.024 e 1.440 pixels, incluindo telas na horizontal. Nas telas públicas e de Minha conta, também foi utilizada emulação móvel com toque e conferência da largura real do navegador.

Foram verificadas as 17 telas administrativas: Painel, Usuários, Veículos, Fornecedores, Peças, Serviços, Fornecimento de peças, Fornecimento de serviços, Controle de estoque, Agendamentos, Atendimentos, Manutenção preventiva, Histórico veicular, Auditoria, Alertas de clientes, Alertas de colaboradores e Solicitações de acesso. A revisão incluiu os modais iniciais de cadastro disponíveis nessas telas.

Também foram verificadas Login, Recuperação e Redefinição de senha, Primeiro acesso, Ativação da conta, Cadastro de cliente, Minha conta de cliente e de colaborador e Verificação de 2FA.

Resultado: 168 verificações administrativas e 36 verificações de acesso e conta, sem excesso de largura da página, sobreposição da navegação, cortes nas bordas dos modais ou erros de JavaScript nos cenários verificados. Dados e respostas da API foram simulados, sem gravar cadastros ou enviar notificações reais.

Os testes de navegador incluem navegação pelo menu móvel, fechamento após a seleção, acesso por rolagem aos campos e botões do cadastro de usuário e posicionamento da navegação na horizontal. Os fluxos existentes de senha, paginação, Painel e seleção de fornecedor também foram executados.

Essa verificação visual cobre os estados descritos acima em navegador com emulação de tela; não representa a execução de todas as combinações de dados, guias e fluxos de negócio em aparelhos físicos.
