const pecas = new Set([
  'peças automotivas', 'óleos e lubrificantes', 'fluidos automotivos',
  'peças e lubrificantes', 'equipamentos e ferramentas', 'materiais de consumo',
  'peças e serviços', 'peça ou insumo'
]);
const servicos = new Set(['serviços automotivos', 'peças e serviços', 'serviço']);

export function fornecedorAtende(item: string | null | undefined, tipo: 'peca' | 'servico'): boolean {
  const categoria = (item || '').trim().toLocaleLowerCase('pt-BR');
  return (tipo === 'peca' ? pecas : servicos).has(categoria);
}
