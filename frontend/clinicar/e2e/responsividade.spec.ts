import { expect, test } from '@playwright/test';

// Navegação e campos reais da interface, com API simulada e sem alterar cadastros.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 1, nome: 'Administrador de testes', status: 'ATIVO', tipo_do_acesso: 'ADMINISTRADOR', mfaAtivo: true } });
    if (path === '/api/auth/csrf') return route.fulfill({ json: { token: 'token-de-teste' } });
    if (path === '/api/painel-operacional') return route.fulfill({ json: { agendamentos: 0, atendimentos: 0, estoqueCritico: 0, notificacoesPendentes: 0, notificacoesComFalha: 0, cadastrosPendentes: [] } });
    if (path === '/api/notificacoes') return route.fulfill({ json: { itens: [], total: 0 } });
    if (path.endsWith('/pagina')) return route.fulfill({ json: { content: [], totalElements: 0, totalPages: 0, number: 0, resumo: {}, opcoes: {} } });
    return route.fulfill({ json: [] });
  });
});

test('menu móvel abre, permite navegar e se recolhe após a seleção', async ({ page }) => {
  await page.goto('/menuAdministrador/painel');
  await expect(page.locator('.page-title-card')).toBeVisible();
  expect(await page.evaluate(() => innerWidth)).toBe(390);
  await page.getByRole('button', { name: 'Alternar navegação' }).click();
  await expect(page.locator('#topNav')).toHaveClass(/show/);
  await page.locator('#topNav').getByRole('button', { name: 'Usuários', exact: true }).click();
  await page.waitForURL('**/usuario');
  await expect(page.locator('#topNav')).not.toHaveClass(/show/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
});

test('cadastro no celular mantém botões acessíveis e permite rolar até os campos', async ({ page }) => {
  await page.goto('/menuAdministrador/usuario');
  await page.getByRole('button', { name: /Novo Usuário/ }).click();
  const modal = page.locator('.modal.show');
  await expect(modal).toBeVisible();
  const campo = modal.locator('input:not([type=hidden])').first();
  await campo.scrollIntoViewIfNeeded();
  await campo.focus();
  const limites = await modal.evaluate(elemento => {
    const header = elemento.querySelector('.modal-header')!.getBoundingClientRect();
    const footer = elemento.querySelector('.modal-footer')!.getBoundingClientRect();
    const campo = elemento.querySelector('input:not([type=hidden])')!.getBoundingClientRect();
    return { header: header.bottom, footer: footer.top, campoTop: campo.top, campoBottom: campo.bottom,
      botoes: [...elemento.querySelectorAll('.modal-footer button')].map(botao => {
        const r = botao.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
      }) };
  });
  expect(limites.campoTop).toBeGreaterThanOrEqual(limites.header);
  expect(limites.campoBottom).toBeLessThanOrEqual(limites.footer);
  expect(limites.botoes.every(Boolean)).toBeTruthy();
});

test('tela na horizontal não sobrepõe a navegação ao conteúdo', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/menuAdministrador/painel');
  await expect(page.locator('.page-title-card')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Alternar navegação' })).toBeVisible();
  const posicoes = await page.evaluate(() => ({
    header: document.querySelector('.top-nav-clinicar')!.getBoundingClientRect().bottom,
    titulo: document.querySelector('.page-title-card')!.getBoundingClientRect().top
  }));
  expect(posicoes.titulo).toBeGreaterThanOrEqual(posicoes.header);
});
