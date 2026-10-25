import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormulariosPendentesService, formularioSalvoInterceptor } from './formularios-pendentes.service';

describe('Proteção de rascunhos nos cadastros integrados',()=>{
  let modal:HTMLDivElement,service:FormulariosPendentesService;
  beforeEach(()=>{
    TestBed.configureTestingModule({providers:[provideHttpClient(withInterceptors([formularioSalvoInterceptor])),provideHttpClientTesting()]});
    service=TestBed.inject(FormulariosPendentesService);service.instalar();
    modal=document.createElement('div');modal.className='modal show';modal.innerHTML='<input id="nome" value="Inicial"><input type="search"><input readonly value="Resumo">';document.body.appendChild(modal);
    modal.dispatchEvent(new Event('shown.bs.modal',{bubbles:true}));
  });
  afterEach(()=>modal.remove());
  it('mantém o aviso ao ocultar temporariamente o cadastro para selecionar outro item',()=>{
    const nome=modal.querySelector<HTMLInputElement>('#nome')!;nome.value='Alterado';nome.dispatchEvent(new Event('input',{bubbles:true}));
    modal.setAttribute('data-preservar-rascunho','true');
    modal.classList.remove('show');modal.dispatchEvent(new Event('hidden.bs.modal',{bubbles:true}));
    const confirmar=spyOn(window,'confirm').and.returnValue(false);
    expect(service.podeSair()).toBeFalse();expect(confirmar).toHaveBeenCalledTimes(1);
    modal.classList.add('show');modal.dispatchEvent(new Event('shown.bs.modal',{bubbles:true}));
    expect(service.alterado(modal)).toBeTrue();
    service.salvo(service.capturar());expect(service.podeSair()).toBeTrue();
  });
  it('não deixa uma edição cancelada pendente após fechar o modal',()=>{
    const nome=modal.querySelector<HTMLInputElement>('#nome')!;nome.value='Alterado';nome.dispatchEvent(new Event('input',{bubbles:true}));
    expect(service.alterado(modal)).toBeTrue();
    const confirmar=spyOn(window,'confirm').and.returnValue(true);
    const cancelar=document.createElement('button');cancelar.textContent='Cancelar';cancelar.setAttribute('data-bs-dismiss','modal');modal.appendChild(cancelar);
    cancelar.click();
    modal.classList.remove('show');modal.dispatchEvent(new Event('hidden.bs.modal',{bubbles:true}));
    expect(service.podeSair()).toBeTrue();expect(confirmar).toHaveBeenCalledTimes(1);
  });
  it('ignora um modal fechado mesmo se o evento de fechamento não chegar',()=>{
    const nome=modal.querySelector<HTMLInputElement>('#nome')!;nome.value='Alterado';nome.dispatchEvent(new Event('input',{bubbles:true}));
    modal.classList.remove('show');
    const confirmar=spyOn(window,'confirm');
    expect(service.podeSair()).toBeTrue();expect(confirmar).not.toHaveBeenCalled();
  });
  it('buscar um item e atualizar um resumo não cria alteração de cadastro',()=>{
    const busca=modal.querySelector<HTMLInputElement>('[type=search]')!;busca.value='Filtro';busca.dispatchEvent(new Event('input',{bubbles:true}));
    modal.querySelector<HTMLInputElement>('[readonly]')!.value='Resumo atualizado';
    const confirmar=spyOn(window,'confirm');expect(service.podeSair()).toBeTrue();expect(confirmar).not.toHaveBeenCalled();
  });
  it('mantém os valores das guias anteriores sem confundir mudança de guia com edição',()=>{
    modal.querySelector('#nome')!.remove();
    const outro=document.createElement('input');outro.id='outraGuia';outro.value='Valor inicial';modal.appendChild(outro);
    outro.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));
    const confirmar=spyOn(window,'confirm').and.returnValue(false);
    expect(service.podeSair()).toBeTrue();expect(confirmar).not.toHaveBeenCalled();
    outro.value='Edição';outro.dispatchEvent(new Event('input',{bubbles:true}));
    expect(service.podeSair()).toBeFalse();
  });
  it('descartar confirma uma vez e encerra a pendência sem novos avisos',()=>{
    const nome=modal.querySelector<HTMLInputElement>('#nome')!;nome.value='Alterado';nome.dispatchEvent(new Event('input',{bubbles:true}));
    const confirmar=spyOn(window,'confirm').and.returnValue(true);
    expect(service.podeSair()).toBeTrue();
    modal.dispatchEvent(new Event('hidden.bs.modal',{bubbles:true}));
    expect(service.podeSair()).toBeTrue();expect(confirmar).toHaveBeenCalledTimes(1);
  });
  it('cancelar um cadastro com erro de duplicidade não deixa aviso pendente após redefinir o formulário',()=>{
    const nome=modal.querySelector<HTMLInputElement>('#nome')!;
    const cancelar=document.createElement('button');cancelar.textContent='Cancelar';cancelar.setAttribute('data-bs-dismiss','modal');modal.appendChild(cancelar);
    nome.value='Duplicado';nome.dispatchEvent(new Event('input',{bubbles:true}));
    const confirmar=spyOn(window,'confirm').and.returnValue(true);
    cancelar.click();
    nome.value='';
    modal.classList.remove('show');modal.dispatchEvent(new Event('hidden.bs.modal',{bubbles:true}));
    expect(service.podeSair()).toBeTrue();expect(confirmar).toHaveBeenCalledTimes(1);
    modal.classList.add('show');modal.dispatchEvent(new Event('shown.bs.modal',{bubbles:true}));
    nome.value='Novo rascunho';nome.dispatchEvent(new Event('input',{bubbles:true}));
    expect(service.alterado(modal)).toBeTrue();
  });
  it('não pede descarte ao interagir com um modal de fornecedor que não fecha pelo fundo ou por Esc',()=>{
    modal.setAttribute('data-bs-backdrop','static');modal.setAttribute('data-bs-keyboard','false');
    const nome=modal.querySelector<HTMLInputElement>('#nome')!;nome.value='Alterado';nome.dispatchEvent(new Event('input',{bubbles:true}));
    const confirmar=spyOn(window,'confirm').and.returnValue(true);
    nome.click();modal.click();nome.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    expect(confirmar).not.toHaveBeenCalled();
    expect(service.alterado(modal)).toBeTrue();
    const cancelar=document.createElement('button');cancelar.textContent='Cancelar';cancelar.setAttribute('data-bs-dismiss','modal');modal.appendChild(cancelar);
    cancelar.click();expect(confirmar).toHaveBeenCalledTimes(1);
  });
  it('limpa o rascunho após gravar mesmo quando o formulário muda automaticamente durante a resposta',()=>{
    const nome=modal.querySelector<HTMLInputElement>('#nome')!;nome.value='Salvo';nome.dispatchEvent(new Event('input',{bubbles:true}));
    const envio=service.capturar();
    nome.value='Salvo formatado';
    service.salvo(envio);
    modal.classList.remove('show');modal.dispatchEvent(new Event('hidden.bs.modal',{bubbles:true}));
    const confirmar=spyOn(window,'confirm');
    expect(service.podeSair()).toBeTrue();expect(confirmar).not.toHaveBeenCalled();
  });
  it('preserva o aviso se o usuário editar novamente enquanto a gravação está em andamento',()=>{
    const nome=modal.querySelector<HTMLInputElement>('#nome')!;nome.value='Enviado';nome.dispatchEvent(new Event('input',{bubbles:true}));
    const envio=service.capturar();
    nome.value='Nova edição';nome.dispatchEvent(new Event('input',{bubbles:true}));
    service.salvo(envio);
    const confirmar=spyOn(window,'confirm').and.returnValue(false);
    expect(service.podeSair()).toBeFalse();expect(confirmar).toHaveBeenCalledTimes(1);
  });
  it('não deixa rascunho pendente após salvar uma movimentação de estoque',()=>{
    const nome=modal.querySelector<HTMLInputElement>('#nome')!;
    nome.value='Entrada de estoque';nome.dispatchEvent(new Event('input',{bubbles:true}));
    TestBed.inject(HttpClient).post('/api/estoque-pecas/1/entrada',{quantidade:4}).subscribe();
    TestBed.inject(HttpTestingController).expectOne('/api/estoque-pecas/1/entrada').flush({id:1});
    modal.classList.remove('show');modal.dispatchEvent(new Event('hidden.bs.modal',{bubbles:true}));
    const confirmar=spyOn(window,'confirm');
    expect(service.podeSair()).toBeTrue();expect(confirmar).not.toHaveBeenCalled();
  });
});
