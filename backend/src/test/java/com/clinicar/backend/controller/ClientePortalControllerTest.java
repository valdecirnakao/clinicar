package com.clinicar.backend.controller;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.mapper.UsuarioMapper;
import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.UsuarioRepository;
import com.clinicar.backend.repository.VeiculoRepository;
import com.clinicar.backend.service.AlertaManutencaoService;
import com.clinicar.backend.service.UsuarioService;
import com.clinicar.backend.service.VeiculoService;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class ClientePortalControllerTest {
    @Test
    void preferenciaWhatsappPertenceSomenteAoClienteLogado() {
        var usuarios = mock(UsuarioRepository.class);
        var notificacoes = mock(com.clinicar.backend.service.NotificacaoOutboxService.class);
        var controller = new ClientePortalController(usuarios, mock(UsuarioMapper.class),
                mock(UsuarioService.class), mock(VeiculoRepository.class), mock(VeiculoService.class),
                mock(AlertaManutencaoService.class), mock(jakarta.persistence.EntityManager.class),
                mock(com.clinicar.backend.service.AtendimentoOrcamentoService.class));
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "notificacoes", notificacoes);
        var cliente = new Usuario(); cliente.setId(7L); cliente.setTelefone("+55 (11) 98765-4321");
        when(usuarios.findById(7L)).thenReturn(java.util.Optional.of(cliente));
        var sessao = new UsuarioResponse(); sessao.setId(7L); sessao.setStatus("ATIVO");
        sessao.setTipo_do_acesso("CLIENTE");
        controller.atualizarAvisosServico(sessao, new ClientePortalController.PreferenciaAvisosServico(true));
        verify(usuarios).save(argThat(u -> Boolean.TRUE.equals(u.getAvisosServicoWhatsapp()) && u.getId().equals(7L)));
        controller.atualizarAvisosServico(sessao, new ClientePortalController.PreferenciaAvisosServico(false));
        verify(notificacoes).cancelarAvisosServicoDestinatario("+55 (11) 98765-4321");
        sessao.setTipo_do_acesso("COLABORADOR");
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> controller.atualizarAvisosServico(sessao, new ClientePortalController.PreferenciaAvisosServico(true)))
                .getStatusCode().value());
    }
    @Test
    void idDoProprietarioVemDaSessaoEPerfilNaoClienteEhRecusado() {
        var veiculoService = mock(VeiculoService.class);
        var orcamentos = mock(com.clinicar.backend.service.AtendimentoOrcamentoService.class);
        var controller = new ClientePortalController(mock(UsuarioRepository.class), mock(UsuarioMapper.class),
                mock(UsuarioService.class), mock(VeiculoRepository.class), veiculoService, mock(AlertaManutencaoService.class),
                mock(jakarta.persistence.EntityManager.class), orcamentos);
        var sessao = new UsuarioResponse();
        sessao.setId(7L);
        sessao.setStatus("ATIVO");
        sessao.setTipo_do_acesso("CLIENTE");
        var dados = new ClientePortalController.VeiculoCliente("ABC1234", "VW", "Gol", "Azul", "2020 Flex");

        controller.cadastrarVeiculo(sessao, dados);
        verify(veiculoService).criar(argThat(req -> req.getIdProprietario().equals(7L)));
        controller.atualizarVeiculo(sessao, 12L, dados);
        verify(veiculoService).atualizarPorProprietario(eq(12L), eq(7L), any(Veiculo.class));
        controller.orcamentos(sessao);
        verify(orcamentos).listarDoCliente(7L);

        sessao.setTipo_do_acesso("COLABORADOR");
        var erro = assertThrows(ResponseStatusException.class, () -> controller.cadastrarVeiculo(sessao, dados));
        assertEquals(403, erro.getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> controller.orcamentos(sessao)).getStatusCode().value());
        verifyNoMoreInteractions(orcamentos);
    }
}
