import { expect, test } from '@playwright/test';

test('cliente cadastra agendamento com preferência opcional sem definir peças de estoque', async ({ page }) => {
  let criado: Record<string, unknown> | null = null;
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 7, nome: 'Cliente Teste', status: 'ATIVO', tipo_do_acesso: 'CLIENTE' } });
    if (path === '/api/auth/csrf') return route.fulfill({ json: { token: 'teste' } });
    if (path.startsWith('/api/setup/')) return route.fulfill({ json: { configurado: true, inicializado: true } });
    if (path === '/api/cliente/portal') return route.fulfill({ json: { usuario: { id: 7, nome: 'Cliente Teste', cpf: '12345678901', telefone: '5511987654321', email: 'cliente@example.com' },
      veiculos: [{ id: 21, placa: 'ABC1234', fabricante: 'VW', modelo: 'Gol', cor: 'Azul', anoModeloCombustivel: '2020 Flex' }], alertas: { ativo: false } } });
    if (path === '/api/cliente/agendamentos' && route.request().method() === 'GET') return route.fulfill({ json: { itens: [], total: 0, pagina: 0, tamanho: 10, indicadores: {} } });
    if (path === '/api/cliente/agendamentos/catalogos') return route.fulfill({ json: { servicos: [{ id: 3, nome: 'Revisão', materiaisReferencia: 'Filtro e óleo conforme o veículo', duracaoEstimada: 1.5, unidadeDuracao: 'HORA' }],
      responsaveis: [{ id: 5, nome: 'Mecânico Teste' }] } });
    if (path === '/api/cliente/agendamentos/disponibilidade') return route.fulfill({ json: [] });
    if (path === '/api/cliente/agendamentos' && route.request().method() === 'POST') {
      criado = route.request().postDataJSON(); return route.fulfill({ status: 201, json: { agendamento: { id: 90 }, pecas: [] } });
    }
    return route.fulfill({ status: 404, json: { mensagem: 'Consulta não prevista no teste.' } });
  });

  await page.goto('/menuCliente');
  const nav = page.getByRole('navigation', { name: 'Navegação do cliente' });
  await expect(nav.getByRole('button', { name: 'Meus agendamentos' })).toBeVisible();
  const yDados = (await nav.getByRole('button', { name: 'Meus dados' }).boundingBox())?.y;
  const yAgenda = (await nav.getByRole('button', { name: 'Meus agendamentos' }).boundingBox())?.y;
  expect(yDados).toBe(yAgenda);
  await nav.getByRole('button', { name: 'Meus agendamentos' }).click();
  await expect(page.getByText('Nenhum agendamento encontrado.')).toBeVisible();
  await page.getByRole('button', { name: 'Novo Agendamento' }).click();
  await expect(page.getByRole('progressbar', { name: 'Progresso do agendamento' })).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByRole('button', { name: 'Materiais (opcional)' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Informações adicionais' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Revisão' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Próximo/ })).toBeDisabled();
  await expect(page.getByRole('dialog', { name: 'Novo Agendamento' }).locator('.agenda-subtitulo')).toContainText('Cliente Teste');
  await expect(page.locator('section[aria-label="Resumo do cliente"]')).toHaveCount(0);
  await expect(page.locator('section[aria-label="Resumo do veículo"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Salvar agendamento' })).toBeDisabled();
  await page.getByRole('button', { name: 'Buscar veículo' }).click();
  await page.getByRole('dialog', { name: /Selecionar veículo/ }).getByRole('button', { name: /Selecionar/ }).click();
  await expect(page.locator('#agendaVeiculo')).toHaveValue('ABC-1234 · Gol');
  await page.locator('#agendaServico').selectOption({ index: 1 });
  await expect(page.getByText('Filtro e óleo conforme o veículo').first()).toBeVisible();
  await page.locator('#agendaInicio').fill('2030-10-01T09:00');
  await expect(page.locator('#agendaDuracao')).toHaveValue('90');
  await expect(page.locator('#agendaFim')).toHaveValue('2030-10-01T10:30');
  await expect(page.locator('#agendaResponsavel')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Materiais (opcional)' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Informações adicionais' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Próximo/ })).toBeEnabled();
  await page.getByRole('button', { name: /Próximo/ }).click();
  await expect(page.getByRole('button', { name: 'Informações adicionais' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Revisão' })).toBeDisabled();
  await page.locator('#agendaSugestaoMateriais').fill('Prefiro óleo da marca X; a oficina deve conferir o filtro.');
  await page.getByRole('button', { name: /Próximo/ }).click();
  await page.locator('#agendaPreferenciaExecucao').fill('Prefiro atendimento na oficina.');
  await page.getByRole('button', { name: /Próximo/ }).click();
  await expect(page.getByRole('heading', { name: 'Cliente e veículo' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Progresso do agendamento' })).toHaveAttribute('aria-valuenow', '100');
  await page.getByRole('button', { name: 'Salvar agendamento' }).click();
  await expect(page.getByText('Solicitação enviada. A oficina definirá a execução antes da confirmação.')).toBeVisible();
  expect(criado).toMatchObject({ idVeiculo: 21, idServico: 3,
    dataHoraFim: '2030-10-01T10:30', sugestaoMateriaisCliente: 'Prefiro óleo da marca X; a oficina deve conferir o filtro.',
    preferenciaExecucaoCliente: 'Prefiro atendimento na oficina.' });
  expect(criado).not.toHaveProperty('idResponsavel');
  expect(criado).not.toHaveProperty('pecasPrevistas');
});
