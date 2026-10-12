export function podeAcessarEtapa<T extends string>(
  ordem: readonly T[], atual: T, destino: T, etapaValida: (etapa: T) => boolean
): boolean {
  const indice = ordem.indexOf(destino);
  if (indice < 0 || ordem.indexOf(atual) < 0) return false;
  if (indice <= ordem.indexOf(atual)) return true;
  return ordem.slice(0, indice).every(etapaValida);
}
