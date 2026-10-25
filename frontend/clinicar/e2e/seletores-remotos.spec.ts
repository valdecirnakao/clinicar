import { expect, test } from '@playwright/test';

test.beforeEach(async ({page})=>{
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/auth/me')return route.fulfill({json:{id:1,nome:'Administrador teste',status:'ATIVO',tipo_do_acesso:'ADMINISTRADOR',mfaAtivo:true}});
    if(path==='/api/auth/csrf')return route.fulfill({json:{token:'teste'}});
    if(path.startsWith('/api/setup/'))return route.fulfill({json:{configurado:true,inicializado:true}});
    if(path.endsWith('/pagina'))return route.fulfill({json:{content:[],totalElements:0,totalPages:0,number:0,resumo:{},opcoes:{}}});
    return route.fulfill({status:404,json:{mensagem:'Consulta não prevista no teste.'}});
  });
});

test('histórico busca e seleciona veículo além da primeira página sem carregar o catálogo',async({page})=>{
  const consultas:string[]=[];let catalogos=0;
  page.on('request',req=>{if(new URL(req.url()).pathname==='/api/veiculo')catalogos++;});
  await page.route('**/api/veiculo/pagina?*',route=>{
    const url=new URL(route.request().url());consultas.push(url.search);
    const segunda=url.searchParams.get('pagina')==='1';
    return route.fulfill({json:{content:[{id:segunda?6:1,placa:segunda?'DEF1D23':'ABC1234',modelo:'Modelo teste'}],totalElements:6,totalPages:2,number:segunda?1:0,resumo:{},opcoes:{}}});
  });
  await page.goto('/menuAdministrador/historicoVeicular');expect(consultas).toHaveLength(0);
  const seletor=page.locator('app-seletor-remoto');await seletor.getByRole('button',{name:'Buscar Veículo',exact:true}).click();
  await expect(seletor.getByText('ABC-1234 · Modelo teste',{exact:true})).toBeVisible();
  await seletor.getByRole('button',{name:'Próxima',exact:true}).click();
  await seletor.getByRole('button',{name:'DEF-1D23 · Modelo teste',exact:true}).click();
  await expect(page.locator('#historicoVeiculo')).toHaveValue('DEF-1D23 · Modelo teste');
  await expect(page.getByRole('button',{name:/Consultar histórico/})).toBeEnabled();
  expect(catalogos).toBe(0);expect(consultas.every(q=>q.includes('selecao=true')&&q.includes('tamanho=5'))).toBeTruthy();
});

for(const rota of ['agendamento','atendimento','regraManutencao']){
  test(`formulário de ${rota} abre sem transferir catálogos completos`,async({page})=>{
    const completos:string[]=[];
    page.on('request',req=>{const path=new URL(req.url()).pathname;if(['/api/usuario','/api/veiculo','/api/peca','/api/servico','/api/fornecedor','/api/fornecimento-pecas','/api/agendamento'].includes(path))completos.push(path);});
    await page.goto('/menuAdministrador/'+rota);
    await page.getByRole('button',{name:rota==='agendamento'?/Novo Agendamento/:rota==='atendimento'?/Novo Atendimento/:/Nova Regra/}).click();
    await expect(page.locator('.modal.show')).toBeVisible();expect(completos).toEqual([]);
  });
}

for(const width of [360,768,1366]){
  test(`busca remota preserva largura disponível em ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:800});
    await page.route('**/api/veiculo/pagina?*',route=>route.fulfill({json:{content:[{id:1,placa:'ABC1234',modelo:'Nome de modelo extenso para verificar quebra de linha no celular'}],totalElements:1,totalPages:1,number:0,resumo:{},opcoes:{}}}));
    await page.goto('/menuAdministrador/historicoVeicular');await page.locator('app-seletor-remoto').getByRole('button',{name:'Buscar Veículo',exact:true}).click();
    await expect(page.getByText('ABC-1234 · Nome de modelo extenso para verificar quebra de linha no celular',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
  });
}
