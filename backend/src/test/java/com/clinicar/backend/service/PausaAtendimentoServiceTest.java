package com.clinicar.backend.service;

import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.AtendimentoPausa;
import com.clinicar.backend.repository.AtendimentoPausaRepository;
import com.clinicar.backend.repository.AtendimentoRepository;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PausaAtendimentoServiceTest {
    @Test void pausaExigeMotivoERegistraAutorDaRetomada() {
        var ordens = mock(AtendimentoRepository.class);
        var registros = mock(AtendimentoPausaRepository.class);
        var service = new PausaAtendimentoService(ordens, registros);
        var ordem = new Atendimento(); ordem.setId(12L); ordem.setStatusAtendimento("EM_EXECUCAO");
        when(ordens.buscarParaPrevisao(12L)).thenReturn(Optional.of(ordem));
        when(ordens.save(ordem)).thenReturn(ordem);
        assertThrows(IllegalArgumentException.class, () -> service.pausar(12L, 3L, " "));
        service.pausar(12L, 3L, "Aguardando peça");
        assertEquals("PAUSADO", ordem.getStatusAtendimento());
        var captor = org.mockito.ArgumentCaptor.forClass(AtendimentoPausa.class);
        verify(registros).save(captor.capture());
        var pausa = captor.getValue();
        assertEquals(3L, pausa.getAutorId());
        assertEquals("Aguardando peça", pausa.getMotivo());
        assertNotNull(pausa.getPausadoEm());
        when(registros.findFirstByAtendimentoIdAndRetomadoEmIsNullOrderByPausadoEmDesc(12L))
                .thenReturn(Optional.of(pausa));
        service.retomar(12L, 5L);
        assertEquals("EM_EXECUCAO", ordem.getStatusAtendimento());
        assertEquals(5L, pausa.getRetomadoPorId());
        assertNotNull(pausa.getRetomadoEm());
    }
}
