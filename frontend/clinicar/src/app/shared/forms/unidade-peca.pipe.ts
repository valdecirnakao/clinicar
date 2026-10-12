import { Pipe, PipeTransform } from '@angular/core';

export function formatarUnidadePeca(valor: unknown): string {
  const texto = String(valor ?? '').trim();
  if (!texto) return '—';
  const chave = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const unidades: Record<string, string> = {
    unidade: 'Unidade(s)', litro: 'Litro(s)', mililitro: 'Mililitro(s)',
    quilograma: 'Quilograma(s)', grama: 'Grama(s)', metro: 'Metro(s)',
    centimetro: 'Centímetro(s)', par: 'Par(es)', jogo: 'Jogo(s)', kit: 'Kit(s)',
    frasco: 'Frasco(s)', galao: 'Galão(ões)', caixa: 'Caixa(s)', pacote: 'Pacote(s)'
  };
  return unidades[chave] || texto;
}

@Pipe({ name: 'unidadePeca', standalone: true })
export class UnidadePecaPipe implements PipeTransform {
  transform(valor: unknown): string { return formatarUnidadePeca(valor); }
}
