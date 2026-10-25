import {expect,test} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/auth/me')return route.fulfill({json:{id:1,nome:'Administrador teste',status:'ATIVO',tipo_do_acesso:'ADMINISTRADOR',mfaAtivo:true}});
  if(path.startsWith('/api/setup/'))return route.fulfill({json:{configurado:true,inicializado:true}});
  if(path==='/api/auth/csrf')return route.fulfill({json:{token:'teste'}});
  if(path==='/api/estoque-pecas/pagina')return route.fulfill({json:{content:[{id:20,idPeca:1,nomePeca:'Peça teste',unidadePeca:'Unidade',nomeLocalEstoque:'Local teste',quantidadeAtual:100,quantidadeReservada:0,custoMedio:30,statusEstoque:'NORMAL',ativo:true}],totalElements:1,totalPages:1,number:0,resumo:{total:1,normal:1},opcoes:{}}});
  if(path.endsWith('/pagina'))return route.fulfill({json:{content:[],totalElements:0,totalPages:0,number:0,resumo:{},opcoes:{}}});
  return route.fulfill({json:[]});
 });
});
test('histórico mantém saldo e identificação do responsável ao navegar e pesquisar',async({page})=>{
 const consultas:string[]=[];let completos=0;
 page.on('request',req=>{if(new URL(req.url()).pathname==='/api/estoque-pecas/20/movimentacoes')completos++;});
 await page.route('**/api/estoque-pecas/20/movimentacoes/pagina?*',route=>{
  const url=new URL(route.request().url());consultas.push(url.search);const segunda=url.searchParams.get('pagina')==='1';
  return route.fulfill({json:{content:[{id:segunda?13:23,tipoMovimento:'ENTRADA',quantidade:1,saldoAnterior:10,saldoPosterior:11,nomeUsuario:segunda?'Responsável segunda página':'Responsável primeira página',idUsuario:7,origem:'COMPRA',criadoEm:'2026-10-12T10:00:00'}],totalElements:23,totalPages:3,number:segunda?1:0,resumo:{},opcoes:{}}});
 });
 await page.goto('/menuAdministrador/controleEstoquePecas');await page.getByTitle('Histórico',{exact:true}).click();const modal=page.locator('#modalHistoricoMovimentacoes');
 await expect(modal.getByText('Responsável primeira página')).toBeVisible();await expect(modal.getByText('100 Unidade(s)',{exact:true})).toBeVisible();
 await modal.getByRole('button',{name:'Próxima',exact:true}).click();await expect(modal.getByText('Responsável segunda página')).toBeVisible();
 await expect(modal.getByText('100 Unidade(s)',{exact:true})).toBeVisible();expect(completos).toBe(0);
 await modal.getByLabel('Buscar no histórico de movimentações').fill('compra');await modal.getByRole('button',{name:'Consultar',exact:true}).click();
 await expect.poll(()=>consultas.at(-1)).toContain('busca=compra');expect(consultas.at(-1)).toContain('pagina=0');
});
test('devolução pesquisa recebimentos e usa o saldo completo recebido do servidor',async({page})=>{
 await page.route('**/api/estoque-pecas/20/movimentacoes/pagina?*',route=>route.fulfill({json:{content:[{id:8,tipoMovimento:'ENTRADA',origem:'COMPRA',quantidade:10,quantidadeDisponivelOriginal:5,idFornecedor:3,nomeFornecedor:'Fornecedor teste',valorUnitario:30,criadoEm:'2026-10-12T10:00:00'}],totalElements:1,totalPages:1,number:0,resumo:{},opcoes:{}}}));
 await page.goto('/menuAdministrador/controleEstoquePecas');await page.getByTitle('Saída',{exact:true}).click();
 await page.locator('#movimentoOrigem').selectOption('DEVOLUCAO_FORNECEDOR');const seletor=page.locator('app-seletor-remoto').filter({has:page.locator('#movimentoRecebimentoFornecedor')});
 await seletor.getByRole('button',{name:'Buscar Movimentação original',exact:true}).click();await seletor.getByRole('button',{name:/ENTRADA #8/}).click();
 await page.locator('#movimentoMotivo').fill('Produto não utilizado');await page.locator('#movimentoQuantidade').fill('6');await expect(page.getByRole('button',{name:/Confirmar Movimentação/})).toBeDisabled();
 await page.locator('#movimentoQuantidade').fill('5');await expect(page.getByRole('button',{name:/Confirmar Movimentação/})).toBeEnabled();
});
test('histórico no celular mantém filtros e paginação acessíveis',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/menuAdministrador/controleEstoquePecas');await page.getByTitle('Histórico',{exact:true}).click();
 const modal=page.locator('#modalHistoricoMovimentacoes');await expect(modal.getByRole('button',{name:'Consultar',exact:true})).toBeVisible();
 await expect(modal.getByLabel('Registros por página')).toBeVisible();await modal.getByLabel('Registros por página').selectOption('5');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
 const rect=await modal.locator('.modal-footer').boundingBox();expect(rect!.y+rect!.height).toBeLessThanOrEqual(845);
});
