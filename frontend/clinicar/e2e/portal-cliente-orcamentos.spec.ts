import { expect, test } from '@playwright/test';

test('cliente consulta versão do orçamento e registra aceite pelo teclado', async ({ page }) => {
  let decisao: unknown = null;
  let estado = 'PENDENTE';
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 7, nome: 'Cliente Teste', status: 'ATIVO', tipo_do_acesso: 'CLIENTE' } });
    if (path === '/api/auth/csrf') return route.fulfill({ json: { token: 'teste' } });
    if (path.startsWith('/api/setup/')) return route.fulfill({ json: { configurado: true, inicializado: true } });
    if (path === '/api/cliente/portal') return route.fulfill({ json: { usuario: { id: 7, nome: 'Cliente Teste', cpf: '12345678901', email: 'cliente@example.com' }, veiculos: [], alertas: { ativo: false } } });
    if (path === '/api/cliente/portal/atendimentos') return route.fulfill({ json: [{ id: 10, codigo: 'OS-10', placa: 'ABC1234', servico: 'Freios', status: 'AGUARDANDO_APROVACAO' }] });
    if (path === '/api/cliente/portal/orcamentos' && route.request().method() === 'GET') return route.fulfill({ json: [{ id: 30, atendimentoId: 10, versao: 2, status: estado, codigo: 'OS-10', placa: 'ABC1234', servico: 'Freios', diagnostico: 'Troca das pastilhas', itens: 'Peça Pastilha: 1 × R$ 40,00', valorMaoObra: 100, valorPecas: 40, valorTerceiros: 0, desconto: 0, valorTotal: 140, criadoEm: '2026-10-14T12:00:00' }] });
    if (path === '/api/cliente/portal/orcamentos/30/decisao' && route.request().method() === 'POST') {
      decisao = route.request().postDataJSON(); estado = 'APROVADO'; return route.fulfill({ json: { id: 30, status: estado } });
    }
    return route.fulfill({ status: 404, json: { mensagem: 'Consulta não prevista no teste.' } });
  });
  await page.goto('/menuCliente');
  await page.getByRole('button', { name: 'Meus atendimentos' }).click();
  await expect(page.getByRole('article', { name: 'Orçamento OS-10 versão 2' })).toContainText('140,00');
  const aceitar = page.getByRole('article', { name: 'Orçamento OS-10 versão 2' }).getByRole('button', { name: 'Aceitar' });
  await aceitar.focus();
  await expect(aceitar).toBeFocused();
  page.once('dialog', dialog => dialog.accept());
  await page.keyboard.press('Enter');
  await expect(page.getByText('Orçamento aceito.')).toBeVisible();
  expect(decisao).toEqual({ aceitar: true });
  await expect(aceitar).toHaveCount(0);
});
