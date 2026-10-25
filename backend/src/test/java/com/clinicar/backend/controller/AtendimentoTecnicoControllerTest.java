package com.clinicar.backend.controller;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.mapper.AtendimentoMapper;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.AtendimentoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class AtendimentoTecnicoControllerTest {
    @Test
    void colaboradorNaoPodeConsultarOuAlterarAtendimentoAtribuidoAOutro() {
        var repo = mock(AtendimentoRepository.class);
        var mapper = mock(AtendimentoMapper.class);
        var controller = new AtendimentoTecnicoController(repo, mapper,
                mock(com.clinicar.backend.service.AtendimentoService.class),
                mock(com.clinicar.backend.service.PausaAtendimentoService.class));
        var responsavel = new Usuario();
        responsavel.setId(2L);
        var atendimento = new Atendimento();
        atendimento.setId(10L);
        atendimento.setResponsavel(responsavel);
        when(repo.findById(10L)).thenReturn(Optional.of(atendimento));
        when(repo.buscarParaPrevisao(10L)).thenReturn(Optional.of(atendimento));
        var sessao = new UsuarioResponse();
        sessao.setId(1L);
        sessao.setStatus("ATIVO");
        sessao.setTipo_do_acesso("COLABORADOR");

        var leitura = assertThrows(ResponseStatusException.class, () -> controller.consultar(10L, sessao));
        var escrita = assertThrows(ResponseStatusException.class, () -> controller.salvarRelato(10L,
                new AtendimentoTecnicoController.Relato("diagnóstico", null, null, null, 100), sessao));
        assertEquals(403, leitura.getStatusCode().value());
        assertEquals(403, escrita.getStatusCode().value());
        verify(repo, never()).saveAndFlush(any());
    }
}
