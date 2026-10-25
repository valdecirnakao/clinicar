import { provideZoneChangeDetection } from '@angular/core';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfiguracaoAlertasComponent } from './configuracao-alertas.component';
import { ConfiguracaoAlertasEstoqueComponent } from './configuracao-alertas-estoque.component';

@Component({standalone:true, selector:'app-configuracao-alertas-estoque', template:''})
class EstoqueTeste {}

describe('Ajuda nos campos de alertas', () => {
  it('explica o destinatário e os parâmetros e limpa ao perder foco', async () => {
    await TestBed.configureTestingModule({imports:[ConfiguracaoAlertasComponent], providers:[provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting()]})
      .overrideComponent(ConfiguracaoAlertasComponent, {remove:{imports:[ConfiguracaoAlertasEstoqueComponent]}, add:{imports:[EstoqueTeste]}}).compileComponents();
    const fixture=TestBed.createComponent(ConfiguracaoAlertasComponent); fixture.detectChanges();
    const http=TestBed.inject(HttpTestingController);
    http.expectNone('/api/usuario');
    const foco=(id:string)=>{fixture.nativeElement.querySelector('#'+id).dispatchEvent(new Event('focus')); fixture.detectChanges();};
    foco('usuarioManutencao');
    expect(fixture.nativeElement.querySelector('.field-help-text').textContent).toContain('histórico são individuais');
    fixture.componentInstance.usuarioId=2; fixture.componentInstance.carregar();
    http.expectOne('/api/configuracao-alerta-manutencao?usuarioId=2').flush({id:2,versao:0,ativo:false,antecedenciaDias:15,intervaloDias:7,maximoEnvios:3,diasAposVencimento:30,horaInicio:9,horaFim:18,fusoHorario:'America/Sao_Paulo'});
    http.expectOne('/api/configuracao-alerta-manutencao/historico?usuarioId=2').flush([]); fixture.detectChanges();
    for (const [id,trecho] of [['antecedencia','antes da data'],['intervalo','mínimo de dias'],['maximo','máxima de avisos'],['apos','após a data'],['inicio','09:00'],['fim','18:00'],['fuso','Região usada']]) {
      foco(id); expect(fixture.nativeElement.querySelector('.field-help-text').textContent).toContain(trecho);
    }
    fixture.nativeElement.querySelector('#fuso').dispatchEvent(new Event('blur')); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.field-help-panel')).toBeNull(); fixture.destroy(); http.verify({ignoreCancelled:true});
  });
});
