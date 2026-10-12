import { TestBed } from '@angular/core/testing';
import { FormulariosPendentesService } from './formularios-pendentes.service';

describe('Proteção de rascunhos nos cadastros integrados',()=>{
  let modal:HTMLDivElement,service:FormulariosPendentesService;
  beforeEach(()=>{
    service=TestBed.inject(FormulariosPendentesService);service.instalar();
    modal=document.createElement('div');modal.className='modal show';modal.innerHTML='<input id="nome" value="Inicial"><input type="search"><input readonly value="Resumo">';document.body.appendChild(modal);
    modal.dispatchEvent(new Event('shown.bs.modal',{bubbles:true}));
  });
  afterEach(()=>modal.remove());
  it('mantém o aviso ao ocultar temporariamente o cadastro para selecionar outro item',()=>{
    const nome=modal.querySelector<HTMLInputElement>('#nome')!;nome.value='Alterado';nome.dispatchEvent(new Event('input',{bubbles:true}));
    modal.classList.remove('show');modal.dispatchEvent(new Event('hidden.bs.modal',{bubbles:true}));
    const confirmar=spyOn(window,'confirm').and.returnValue(false);
    expect(service.podeSair()).toBeFalse();expect(confirmar).toHaveBeenCalledTimes(1);
    modal.classList.add('show');modal.dispatchEvent(new Event('shown.bs.modal',{bubbles:true}));
    expect(service.alterado(modal)).toBeTrue();
    service.salvo(service.capturar());expect(service.podeSair()).toBeTrue();
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
});
