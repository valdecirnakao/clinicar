// Mesma apresentação e regra de formato utilizadas no gerenciamento de usuários.
export function exibirTelefoneFormatado(telefone: string | null | undefined): string {
  if (!telefone) return '';
  const n = telefone.replace(/\D/g, '');
  if (n.length >= 11) return `+55 (${n.slice(-11, -9)}) ${n.slice(-9, -4)}-${n.slice(-4)}`;
  if (n.length >= 10) return `+55 (${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6, 10)}`;
  if (n.length >= 8) return `+55 (11) ${n.slice(0, -4)}-${n.slice(-4)}`;
  return n;
}

export function telefoneWhatsappValido(telefone: string | null | undefined): boolean {
  let numero = (telefone ?? '').replace(/\D/g, '');
  if (numero && !numero.startsWith('55')) {
    if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
    else if (numero.length === 8 || numero.length === 9) numero = `5511${numero}`;
  }
  return numero.length === 12 || numero.length === 13;
}
