import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { UsuarioComponent } from '../../pages/menu-administrador/usuario/usuario.component';
import { FornecedorComponent } from '../../pages/menu-administrador/fornecedor/fornecedor.component';
import { VeiculoComponent } from '../../pages/menu-administrador/veiculo/veiculo.component';
import { PecaComponent } from '../../pages/menu-administrador/peca/peca.component';
import { ServicoComponent } from '../../pages/menu-administrador/servico/servico.component';
import { ControleEstoquePecasComponent } from '../../pages/menu-administrador/controle-estoque-pecas/controle-estoque-pecas.component';
import { FornecimentoPecasComponent } from '../../pages/menu-administrador/fornecimento-pecas/fornecimento-pecas.component';
import { FornecimentoServicoComponent } from '../../pages/menu-administrador/fornecimento-servico/fornecimento-servico.component';
import { AgendamentoComponent } from '../../pages/menu-administrador/agendamento/agendamento.component';
import { AtendimentoComponent } from '../../pages/menu-administrador/atendimento/atendimento.component';

describe('Bloqueio das guias nos novos cadastros', () => {
  const casos: Array<[any, string, string, string, string, string | null]> = [
    [UsuarioComponent, 'abaCadastroUsuario', 'trocarAbaCadastroUsuario', 'dados', 'seguranca', 'cadastroAbaProxima'],
    [FornecedorComponent, 'abaCadastroFornecedor', 'trocarAbaCadastroFornecedor', 'dados', 'revisao', 'proximaAbaCadastro'],
    [VeiculoComponent, 'abaCadastroVeiculo', 'trocarAbaCadastroVeiculo', 'veiculo', 'revisao', 'proximaAbaCadastroVeiculo'],
    [PecaComponent, 'abaCadastroPeca', 'trocarAbaCadastroPeca', 'dados', 'revisao', 'proximaAbaCadastro'],
    [ServicoComponent, 'abaCadastroServico', 'trocarAbaCadastroServico', 'dados', 'revisao', 'cadastroAbaProxima'],
    [ControleEstoquePecasComponent, 'abaCadastroEstoque', 'trocarAbaCadastroEstoque', 'identificacao', 'revisao', 'avancarAbaCadastroEstoque'],
    [FornecimentoPecasComponent, 'abaCadastroFornecimento', 'trocarAbaCadastroFornecimento', 'vinculo', 'revisao', 'cadastroAbaProxima'],
    [FornecimentoServicoComponent, 'abaCadastroFornecimento', 'trocarAbaCadastroFornecimento', 'vinculo', 'revisao', 'cadastroAbaProxima'],
    [AgendamentoComponent, 'abaNovoAgendamento', 'trocarAbaNovoAgendamento', 'agendamento', 'adicionais', null],
    [AtendimentoComponent, 'abaNovoAtendimento', 'trocarAbaNovoAtendimento', 'atendimento', 'adicionais', null]
  ];

  beforeEach(() => TestBed.configureTestingModule({
    imports: casos.map(caso => caso[0]),
    providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
  }));

  for (const [tipo, estado, trocar, primeira, ultima, proxima] of casos) {
    it(`${tipo.name}: impede avançar ou pular guias com campos obrigatórios vazios`, () => {
      const fixture = TestBed.createComponent(tipo);
      const component: any = fixture.componentInstance;
      expect(component.podeAvancarCadastro).toBeFalse();
      component[trocar](ultima);
      expect(component[estado]).toBe(primeira);
      if (proxima) component[proxima]();
      expect(component[estado]).toBe(primeira);
      fixture.destroy();
    });
  }

  it('exige a classificação técnica do óleo antes da revisão e mantém os campos opcionais livres', () => {
    const component = TestBed.createComponent(PecaComponent).componentInstance;
    component.novaPeca = { nome: 'Óleo', fabricante: 'Fabricante', unidade: 'LITRO' };
    component.proximaAbaCadastro();
    expect(component.abaCadastroPeca).toBe('classificacao');
    component.novaPeca.tipo = 'Óleo de motor';
    expect(component.podeAvancarCadastro).toBeFalse();
    component.novaPeca.tipo = 'Filtro';
    component.proximaAbaCadastro();
    expect(component.abaCadastroPeca).toBe('revisao');
    component.abaAnteriorCadastro();
    component.novaPeca.tipo = '';
    component.proximaAbaCadastro();
    expect(component.abaCadastroPeca).toBe('classificacao');
  });
});
