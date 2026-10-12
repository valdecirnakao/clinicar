import { expect, test } from '@playwright/test';

// Dados controlados: testa o navegador sem gravar dados ou enviar mensagens reais.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 1, nome: 'Administrador de testes', status: 'ATIVO', tipo_do_acesso: 'ADMINISTRADOR', mfaAtivo: true } });
    if (path === '/api/auth/csrf') return route.fulfill({ json: { token: 'token-exclusivo-de-teste' } });
    if (path.startsWith('/api/setup/')) return route.fulfill({ json: { configurado: true, inicializado: true } });
    return route.fulfill({ status: 404, json: { mensagem: 'Endpoint não previsto neste teste.' } });
  });
});

test('link de senha utilizado apresenta mensagem e bloqueia os campos', async ({ page }) => {
  await page.route('**/api/auth/redefinir-senha/validar?*', route => route.fulfill({ status: 409, json: { mensagem: 'Token já utilizado.', dataHoraUtilizacao: '2026-10-01T17:45:28.535358826' } }));
  await page.goto('/redefinir-senha?token=token-de-teste');
  await expect(page.getByText('Token já utilizado em 01/10/2026 às 17:45:28.')).toBeVisible();
  await expect(page.locator('#novaSenha')).toBeDisabled();
  await expect(page.locator('#confirmarSenha')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Salvar nova senha' })).toBeDisabled();
  await expect(page.getByAltText('CliniCar')).toBeVisible();
});

test('lista consulta páginas no servidor e mantém os indicadores globais', async ({ page }) => {
  const consultas: string[] = [];
  await page.route('**/api/peca/pagina?*', route => {
    const url = new URL(route.request().url()); consultas.push(url.search);
    const segunda = url.searchParams.get('pagina') === '1';
    return route.fulfill({ json: { content: [{ id: segunda ? 11 : 1, nome: segunda ? 'Peça da segunda página' : 'Peça da primeira página', fabricante: 'Fabricante', modelo: 'Modelo', unidade: 'Unidade', tipo: 'Peça Automotiva', controleVersao: 0 }], totalElements: 11, totalPages: 2, number: segunda ? 1 : 0, resumo: { total: 11, tipos: 1, fabricantes: 1, comNorma: 0 }, opcoes: { tipo: ['Peça Automotiva'], unidade: ['Unidade'] } } });
  });
  await page.goto('/menuAdministrador/peca');
  await expect(page.getByText('Peça Da Primeira Página', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: /Próxima/ }).click();
  await expect(page.getByText('Peça Da Segunda Página', { exact: true }).first()).toBeVisible();
  expect(consultas.some(query => query.includes('pagina=1'))).toBeTruthy();
  await page.locator('#filtro-pecas').fill('filtro aplicado');
  await expect.poll(() => consultas.at(-1)).toContain('busca=filtro');
  expect(consultas.at(-1)).toContain('pagina=0');
});

test('painel apresenta pendências e não oferece reenvio de mensagens já entregues', async ({ page }) => {
  await page.route('**/api/painel-operacional', route => route.fulfill({ json: { agendamentos: 2, atendimentos: 1, estoqueCritico: 3, notificacoesPendentes: 1, notificacoesComFalha: 1, cadastrosPendentes: [{ id: 1, titulo: 'Concluir controle de estoque', rota: '/menuAdministrador/controleEstoquePecas', contexto: '{"continuarEstoque":"1","pecaId":"12"}' }] } }));
  await page.route('**/api/notificacoes?*', route => route.fulfill({ json: { itens: [{ id: 1, canal: 'WHATSAPP', template: 'alerta_estoque', estado: 'ENTREGUE', tentativas: 1, criado_em: '2026-10-11T10:00:00' }], total: 1 } }));
  await page.goto('/menuAdministrador/painel');
  await expect(page.getByText('Concluir controle de estoque')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reenviar', exact: true })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Auditoria', exact: true })).toHaveCount(1);
});

test('seleciona fornecedor em páginas e preserva as opções de retornar ou cadastrar outro',async({page})=>{
  const consultas:string[]=[];
  await page.route('**/api/fornecimento-pecas/pagina?*',route=>route.fulfill({json:{content:[],totalElements:0,totalPages:0,number:0,resumo:{},opcoes:{}}}));
  await page.route('**/api/fornecedor/pagina?*',route=>{
    const url=new URL(route.request().url());consultas.push(url.search);
    return route.fulfill({json:{content:[{id:7,razaoSocial:'Fornecedor selecionado',cnpj:'12345678000190',ativo:true,controleVersao:0}],totalElements:1,totalPages:1,number:0,resumo:{},opcoes:{}}});
  });
  await page.goto('/menuAdministrador/fornecimentoPecas');
  expect(consultas).toHaveLength(0);
  await page.getByRole('button',{name:/Novo Fornecimento/}).click();
  await page.locator('#fornecedorCadastroInput').getByRole('button',{name:'Selecionar',exact:true}).click();
  const modal=page.locator('#modalFornecedor');
  await expect(modal.getByRole('button',{name:'Cadastrar novo fornecedor'})).toBeVisible();
  await expect(modal.getByRole('button',{name:'Voltar ao fornecimento'})).toBeVisible();
  await expect(modal.getByText('Fornecedor selecionado',{exact:true})).toBeVisible();
  expect(consultas[0]).toContain('tamanho=5');expect(consultas[0]).toContain('ativo=true');
  await modal.getByRole('button',{name:'Selecionar',exact:true}).click();
  await expect(page.locator('#fornecedorCadastroInput')).toContainText('Fornecedor selecionado');
  await expect(page.locator('#modalCadastroFornecimento')).toBeVisible();
});
