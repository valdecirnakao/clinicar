import { podeAcessarEtapa } from './etapas-cadastro';

describe('Navegação das etapas de cadastro', () => {
  const ordem = ['dados', 'contato', 'revisao'] as const;
  it('impede pular uma etapa obrigatória mesmo que a etapa atual esteja válida', () => {
    expect(podeAcessarEtapa(ordem, 'dados', 'revisao', etapa => etapa === 'dados')).toBeFalse();
    expect(podeAcessarEtapa(ordem, 'dados', 'contato', etapa => etapa === 'dados')).toBeTrue();
  });
  it('permite voltar para corrigir e bloqueia novamente o avanço após invalidar dados anteriores', () => {
    expect(podeAcessarEtapa(ordem, 'revisao', 'dados', () => false)).toBeTrue();
    expect(podeAcessarEtapa(ordem, 'contato', 'revisao', etapa => etapa === 'contato')).toBeFalse();
    expect(podeAcessarEtapa(ordem, 'dados', 'revisao', () => true)).toBeTrue();
  });
});
