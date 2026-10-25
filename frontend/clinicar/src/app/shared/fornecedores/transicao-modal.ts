import { DestroyRef } from '@angular/core';

export function aposFecharModal(id: string, modal: { hide(): void } | undefined,
  acao: () => void, destroyRef: DestroyRef): void {
  const elemento = document.getElementById(id);
  if (!elemento?.classList.contains('show')) {
    modal?.hide();
    acao();
    return;
  }
  // A troca por um seletor ou etapa auxiliar mantém o formulário de origem.
  // Fechamentos comuns (Cancelar/Fechar) não recebem esta marcação.
  elemento.setAttribute('data-preservar-rascunho', 'true');
  const concluir = () => { cancelarDestruicao(); acao(); };
  const cancelarDestruicao = destroyRef.onDestroy(() => elemento.removeEventListener('hidden.bs.modal', concluir));
  elemento.addEventListener('hidden.bs.modal', concluir, { once: true });
  modal?.hide();
}
