import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ExibeVeiculoComponent } from './exibe-veiculo.component';

describe('Verificação de placa no cadastro e na edição', () => {
  let fixture: ComponentFixture<ExibeVeiculoComponent>, component: ExibeVeiculoComponent, http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports:[ExibeVeiculoComponent], providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])] }).compileComponents();
    fixture=TestBed.createComponent(ExibeVeiculoComponent); component=fixture.componentInstance; http=TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/usuario').flush([]);
    http.expectOne('/api/veiculo').flush([]);
    http.expectOne('https://fipe.parallelum.com.br/api/v2/cars/brands').flush([]);
  });
  afterEach(()=>http.verify());
  it('consulta ao sair do campo, destaca duplicidade e bloqueia salvamento',()=>{
    component.novoVeiculo.placa='abc1234'; fixture.detectChanges();
    const input: HTMLInputElement=fixture.nativeElement.querySelector('input[placeholder="ABC-1D23"]');
    input.dispatchEvent(new Event('blur')); fixture.detectChanges();
    const req=http.expectOne(r=>r.url==='/api/veiculo/verificar-placa');
    expect(req.request.params.get('placa')).toBe('ABC1234'); expect(req.request.params.has('ignorarId')).toBeFalse();
    expect(req.request.withCredentials).toBeTrue(); expect(component.cadastroVeiculoProntoParaSalvar).toBeFalse();
    req.flush({cadastrada:true}); fixture.detectChanges(); expect(input.classList.contains('is-invalid')).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Placa já cadastrada anteriormente.');
    component.salvarCadastroVeiculo(); http.expectNone(r=>r.method==='POST');
    expect(component.mensagemErroModal).toBe('Placa já cadastrada anteriormente.');
  });
  it('edicao envia id a ignorar, aceita a propria placa e rejeita placa de outro',()=>{
    component.editId=42; component.edit.placa='ABC-1234'; component.verificarPlaca('edicao');
    let req=http.expectOne(r=>r.url==='/api/veiculo/verificar-placa'); expect(req.request.params.get('ignorarId')).toBe('42');
    req.flush({cadastrada:false}); expect(component.placaEdicaoInvalida()).toBeFalse();
    component.edit.placa='DEF1D23'; component.verificarPlaca('edicao'); req=http.expectOne(r=>r.url==='/api/veiculo/verificar-placa');
    req.flush({cadastrada:true}); expect(component.placaEdicaoInvalida()).toBeTrue();
    component.salvarEdicaoModal(); http.expectNone(r=>r.method==='PUT'); expect(component.mensagemErroModal).toBe('Placa já cadastrada anteriormente.');
  });
  it('corrigir placa cancela consulta anterior e remove resultado antigo',()=>{
    component.novoVeiculo.placa='ABC1234'; component.verificarPlaca('cadastro');
    const antiga=http.expectOne(r=>r.url==='/api/veiculo/verificar-placa');
    component.novoVeiculo.placa='DEF1D23'; component.alterarPlaca('cadastro'); expect(antiga.cancelled).toBeTrue();
    expect(component.consultaPlaca.cadastro.consultando).toBeFalse(); component.verificarPlaca('cadastro');
    http.expectOne(r=>r.url==='/api/veiculo/verificar-placa').flush({cadastrada:true});
    component.alterarPlaca('cadastro'); expect(component.consultaPlaca.cadastro.duplicada).toBeFalse();
  });
  it('não consulta placa incompleta e informa falha sem bloquear validação no servidor',()=>{
    component.novoVeiculo.placa='ABC'; component.verificarPlaca('cadastro'); http.expectNone(r=>r.url==='/api/veiculo/verificar-placa');
    component.novoVeiculo.placa='ABC1234'; component.verificarPlaca('cadastro');
    http.expectOne(r=>r.url==='/api/veiculo/verificar-placa').flush({}, {status:500,statusText:'Error'});
    expect(component.consultaPlaca.cadastro.consultando).toBeFalse(); expect(component.consultaPlaca.cadastro.aviso).toContain('ao salvar');
    expect(component.placaCadastroInvalida()).toBeFalse();
  });
  it('fechar edição cancela consulta e limpa estado para o próximo veículo',()=>{
    component.editId=42; component.edit.placa='ABC1234'; component.verificarPlaca('edicao');
    const req=http.expectOne(r=>r.url==='/api/veiculo/verificar-placa'); component.cancelarEdicao();
    expect(req.cancelled).toBeTrue(); expect(component.consultaPlaca.edicao.consultando).toBeFalse(); expect(component.editId).toBeNull();
  });
});
