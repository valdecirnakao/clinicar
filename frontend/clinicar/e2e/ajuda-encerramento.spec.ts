import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 1, nome: 'Administrador de testes', status: 'ATIVO', tipo_do_acesso: 'ADMINISTRADOR', mfaAtivo: true } });
    if (path === '/api/auth/csrf') return route.fulfill({ json: { token: 'token-de-teste' } });
    if (path === '/api/auth/logout') return route.fulfill({ status: 200, body: 'Sessão encerrada.' });
    if (path.endsWith('/pagina')) return route.fulfill({ json: { content: [], totalElements: 0, totalPages: 0, number: 0, resumo: {}, opcoes: {} } });
    return route.fulfill({ json: [] });
  });
});

test('ajuda descreve o modal e volta à orientação geral após o campo perder o foco', async ({ page }) => {
  await page.goto('/menuAdministrador/usuario');
  await page.getByRole('button', { name: /Novo Usuário/ }).click();
  const modal = page.locator('.modal.show');
  await expect(modal.locator('.field-help-title')).toHaveText('Dados do usuário');
  const campo = modal.locator('input.form-control').first();
  await campo.focus();
  await expect(modal.locator('.field-help-title')).not.toHaveText('Dados do usuário');
  await modal.locator('.modal-title').click();
  await expect(modal.locator('.field-help-title')).toHaveText('Dados do usuário');
});

test('encerrar faz logoff e retorna ao login mantendo a guia aberta', async ({ page }) => {
  await page.goto('/menuAdministrador/usuario');
  const logout = page.waitForRequest('**/api/auth/logout');
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await logout;
  await page.waitForURL('**/login');
  await expect(page.locator('#loginEmail')).toBeVisible();
  expect(page.isClosed()).toBeFalsy();
});

test('falha no logout mantém a guia aberta e permite tentar novamente', async ({ page, context }) => {
  await context.route('**/api/auth/logout', route => route.fulfill({ status: 503, json: { mensagem: 'Falha simulada.' } }));
  await page.goto('/menuAdministrador/usuario');
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await expect(page.getByText('Não foi possível encerrar a sessão. Tente novamente.')).toBeVisible();
  expect(page.isClosed()).toBeFalsy();
  expect(page.url()).toContain('/menuAdministrador/usuario');
});
