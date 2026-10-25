export function formatarPlacaExibicao(valor: string | null | undefined): string {
  const placa = (valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  return placa.length > 3 ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
}
