import { provideZoneChangeDetection, SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SeletorRemotoComponent } from './seletor-remoto.component';

describe('Seleção remota de cadastros', () => {
  let fixture: ComponentFixture<SeletorRemotoComponent>, campo: SeletorRemotoComponent, http: HttpTestingController;
  const pagina = (content: any[], total = 31) => ({content, totalElements:total,totalPages:Math.ceil(total/5),number:0,resumo:{},opcoes:{}});
  beforeEach(async () => {
    await TestBed.configureTestingModule({imports:[SeletorRemotoComponent],providers:[provideZoneChangeDetection(),provideHttpClient(),provideHttpClientTesting()]}).compileComponents();
    fixture=TestBed.createComponent(SeletorRemotoComponent);campo=fixture.componentInstance;campo.recurso='peca';http=TestBed.inject(HttpTestingController);fixture.detectChanges();
  });
  afterEach(()=>{fixture.destroy();http.verify({ignoreCancelled:true});});
  it('não carrega o catálogo ao abrir o formulário e consulta somente cinco registros ao buscar',()=>{
    http.expectNone('/api/peca');campo.abrir();
    const req=http.expectOne(r=>r.url==='/api/peca/pagina');expect(req.request.params.get('tamanho')).toBe('5');expect(req.request.params.get('selecao')).toBe('true');
    req.flush(pagina([{id:1,nome:'Peça 1'}]));campo.pagina=1;campo.carregar();
    const segunda=http.expectOne(r=>r.url==='/api/peca/pagina');expect(segunda.request.params.get('pagina')).toBe('1');segunda.flush(pagina([{id:6,nome:'Peça 6'}]));
    const escolher=jasmine.createSpy('escolher');campo.registerOnChange(escolher);campo.escolher(campo.registros[0]);expect(escolher).toHaveBeenCalledWith(6);expect(campo.aberto).toBeFalse();
  });
  it('cancela a consulta anterior e espera a digitação terminar',fakeAsync(()=>{
    campo.abrir();const antiga=http.expectOne(r=>r.url==='/api/peca/pagina');campo.busca='óleo';campo.pesquisar();expect(antiga.cancelled).toBeTrue();
    tick(249);http.expectNone(r=>r.url==='/api/peca/pagina');tick(1);const atual=http.expectOne(r=>r.url==='/api/peca/pagina');expect(atual.request.params.get('busca')).toBe('óleo');atual.flush(pagina([]));
  }));
  it('recupera uma seleção existente por ID e cancela a hidratação ao alterar o ID',()=>{
    campo.writeValue(8);const antiga=http.expectOne('/api/peca/8');campo.writeValue(9);expect(antiga.cancelled).toBeTrue();
    http.expectOne('/api/peca/9').flush({id:9,nome:'Peça salva'});expect(campo.texto).toBe('Peça salva');http.expectNone('/api/peca');
  });
  it('exibe um registro inicial autorizado pelo formulário sem consultar o cadastro por ID',()=>{
    campo.recurso='usuario';campo.somenteNome=true;
    campo.registroInicial={id:8,nome:'Caio Teste Mecânico'};
    campo.writeValue(8);
    fixture.detectChanges();
    expect(campo.texto).toBe('Caio Teste Mecânico');
    expect((fixture.nativeElement.querySelector('.form-control') as HTMLInputElement).value).toBe('Caio Teste Mecânico');
    http.expectNone('/api/usuario/8');
  });
  it('formata CPF e CNPJ ao listar e ao reabrir uma seleção sem alterar o cadastro',()=>{
    campo.recurso='usuario';
    const usuario={id:5,nome:'Colaborador',cpf:'11111111111'};
    expect(campo.descricao(usuario)).toBe('Colaborador · 111.111.111-11');
    expect(campo.descricao({id:6,nome:'Empresa',cnpj:'11222333000144'})).toBe('Empresa · 11.222.333/0001-44');
    campo.writeValue(5);
    http.expectOne('/api/usuario/5').flush(usuario);
    expect(campo.texto).toBe('Colaborador · 111.111.111-11');
    expect(usuario.cpf).toBe('11111111111');
  });
  it('fecha a busca quando desabilitado e preserva o valor selecionado',()=>{
    campo.writeValue(7);http.expectOne('/api/peca/7').flush({id:7,nome:'Peça'});campo.setDisabledState(true);campo.abrir();expect(campo.aberto).toBeFalse();expect(campo.valor).toBe(7);
  });
  it('mostra somente o nome do fornecedor no campo selecionado',()=>{
    campo.somenteNome=true;campo.recurso='fornecedor';
    campo.escolher({id:8,razaoSocial:'Oficina Parceira',cnpj:'98765432000198'});
    fixture.detectChanges();
    expect(campo.texto).toBe('Oficina Parceira');
    expect((fixture.nativeElement.querySelector('.form-control') as HTMLInputElement).title).toBe('Oficina Parceira');
    campo.writeValue(9);
    http.expectOne('/api/fornecedor/9').flush({id:9,razaoSocial:'Outra oficina',cnpj:'12345678000195'});
    expect(campo.texto).toBe('Outra oficina');
  });
  it('abre a seleção externa sem consultar a lista embutida',()=>{
    campo.selecaoEmModal=true;
    const abrir=jasmine.createSpy('abrir');campo.abrirSelecao.subscribe(abrir);
    campo.abrir();expect(abrir).toHaveBeenCalled();expect(campo.aberto).toBeFalse();
    http.expectNone(r=>r.url==='/api/peca/pagina');
  });
  it('disponibiliza preço e vínculo antes de notificar o formulário',()=>{
    campo.comFornecimento=true;let registro:any;campo.selecionado.subscribe(item=>registro=item);const alterar=jasmine.createSpy().and.callFake(()=>expect(registro.fornecimentoPreferido.valorCusto).toBe(20));campo.registerOnChange(alterar);
    campo.escolher({id:12,nome:'Óleo'});expect(alterar).not.toHaveBeenCalled();
    const req=http.expectOne(r=>r.url==='/api/fornecimento-pecas/pagina');expect(req.request.params.get('peca.id')).toBe('12');expect(req.request.params.get('ativo')).toBe('true');expect(req.request.params.get('tamanho')).toBe('1');req.flush(pagina([{id:3,valorCusto:20}],1));expect(alterar).toHaveBeenCalledWith(12);
  });
  it('cancela um fornecimento pendente quando o usuário muda a peça',()=>{
    campo.comFornecimento=true;campo.escolher({id:12});const antigo=http.expectOne(r=>r.url==='/api/fornecimento-pecas/pagina');campo.escolher(null);expect(antigo.cancelled).toBeTrue();expect(campo.valor).toBeNull();expect(campo.carregando).toBeFalse();
  });
});
