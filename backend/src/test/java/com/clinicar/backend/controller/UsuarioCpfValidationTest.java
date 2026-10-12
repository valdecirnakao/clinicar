package com.clinicar.backend.controller;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.mapper.UsuarioMapper;
import com.clinicar.backend.repository.UsuarioRepository;
import com.clinicar.backend.service.*;
import org.junit.jupiter.api.Test;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import java.sql.SQLException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UsuarioCpfValidationTest {
    @Test
    void atualizacaoAdministrativaUsaResponsavelDaSessao() {
        var service = mock(UsuarioService.class);
        var controller = new UsuarioController(mock(UsuarioRepository.class), service,
                mock(MfaService.class), mock(UsuarioMapper.class), mock(SessionService.class), mock(UsuarioExclusaoService.class));
        var solicitante = new UsuarioResponse();
        solicitante.setId(7L); solicitante.setStatus("ATIVO"); solicitante.setTipo_do_acesso("ADMINISTRADOR");
        var pedido = new com.clinicar.backend.dto.UsuarioRequest(); pedido.setStatus("INATIVO");
        controller.atualizarUsuario(42L, pedido, solicitante);
        verify(service).atualizarPorAdministrador(42L, pedido, 7L);
    }
    @Test
    void listagemRecebeElegibilidadeDoBackendSemConsultasPorUsuario() {
        var exclusao = mock(UsuarioExclusaoService.class);
        var repository = mock(UsuarioRepository.class);
        var mapper = mock(UsuarioMapper.class);
        var controller = new UsuarioController(repository, mock(UsuarioService.class),
                mock(MfaService.class), mapper, mock(SessionService.class), exclusao);
        var solicitante = new UsuarioResponse();
        solicitante.setId(7L); solicitante.setStatus("ATIVO"); solicitante.setTipo_do_acesso("ADMINISTRADOR");
        var usuario = new com.clinicar.backend.model.Usuario(); usuario.setId(42L);
        var respostaUsuario = new UsuarioResponse(); respostaUsuario.setId(42L);
        when(repository.findAll()).thenReturn(java.util.List.of(usuario));
        when(mapper.toResponse(usuario)).thenReturn(respostaUsuario);
        var ids = java.util.Set.of(7L);
        when(exclusao.usuariosComVinculos()).thenReturn(ids);
        when(exclusao.podeExcluir(usuario, 7L, ids)).thenReturn(true);
        var resposta = controller.listarTodos(solicitante);
        assertTrue(resposta.getBody().getFirst().getPodeExcluir());
        assertEquals("no-store", resposta.getHeaders().getCacheControl());
        verify(exclusao, times(1)).usuariosComVinculos();
    }
    @Test
    void exclusaoExigeAdministradorEUsaIdentidadeDaSessao() {
        var exclusao = mock(UsuarioExclusaoService.class);
        var controller = new UsuarioController(mock(UsuarioRepository.class), mock(UsuarioService.class),
                mock(MfaService.class), mock(UsuarioMapper.class), mock(SessionService.class), exclusao);
        var solicitante = new UsuarioResponse();
        solicitante.setId(7L); solicitante.setStatus("ATIVO"); solicitante.setTipo_do_acesso("CLIENTE");
        var pedido = new com.clinicar.backend.dto.ExcluirUsuarioRequest("Cadastro criado por engano.");
        assertEquals(401, controller.removerUsuario(42L, pedido, null).getStatusCode().value());
        assertEquals(403, controller.removerUsuario(42L, pedido, solicitante).getStatusCode().value());
        verifyNoInteractions(exclusao);
        solicitante.setTipo_do_acesso("ADMINISTRADOR");
        assertEquals(204, controller.removerUsuario(42L, pedido, solicitante).getStatusCode().value());
        verify(exclusao).excluir(42L, 7L, pedido.justificativa());
    }
    @Test
    void resetUsaAdministradorDaSessaoERecusaPerfilNaoAdministrativo() {
        var mfa = mock(MfaService.class);
        var controller = new UsuarioController(mock(UsuarioRepository.class), mock(UsuarioService.class),
                mfa, mock(UsuarioMapper.class), mock(SessionService.class), mock(UsuarioExclusaoService.class));
        var solicitante = new UsuarioResponse();
        solicitante.setId(7L); solicitante.setStatus("ATIVO"); solicitante.setTipo_do_acesso("CLIENTE");
        var pedido = new com.clinicar.backend.dto.ResetMfaRequest("Perda do dispositivo autenticador.");
        assertEquals(403, controller.resetarMfaUsuario(42L, pedido, solicitante).getStatusCode().value());
        verifyNoInteractions(mfa);
        solicitante.setTipo_do_acesso("ADMINISTRADOR");
        assertEquals(200, controller.resetarMfaUsuario(42L, pedido, solicitante).getStatusCode().value());
        verify(mfa).resetarMfaUsuario(42L, 7L, pedido.justificativa());
    }
    @Test
    void consultaEmailRestritaAoAdministradorSemDadosPessoaisEConflitoComMensagemClara() {
        var service = mock(UsuarioService.class);
        var controller = new UsuarioController(mock(UsuarioRepository.class), service,
                mock(MfaService.class), mock(UsuarioMapper.class), mock(SessionService.class), mock(UsuarioExclusaoService.class));
        var solicitante = new UsuarioResponse();
        solicitante.setId(1L);
        solicitante.setTipo_do_acesso("CLIENTE");
        solicitante.setStatus("ATIVO");
        assertEquals(403, controller.validarEmail("cliente@example.com", solicitante).getStatusCode().value());
        assertEquals(401, controller.validarEmail("cliente@example.com", null).getStatusCode().value());
        verifyNoInteractions(service);
        solicitante.setTipo_do_acesso("ADMINISTRADOR");
        when(service.emailCadastrado("cliente@example.com")).thenReturn(true);
        var resposta = controller.validarEmail("cliente@example.com", solicitante);
        assertEquals(java.util.Map.of("cadastrado", true), resposta.getBody());
        assertEquals("no-store", resposta.getHeaders().getCacheControl());
        var erro = new DataIntegrityViolationException("Duplicidade",
                new ConstraintViolationException("Duplicidade", new SQLException(), "usuario.uk_usuario_email"));
        assertEquals("E-mail já cadastrado anteriormente.", new GlobalExceptionHandler()
                .tratarDataIntegrityViolationException(erro).getBody().getMensagem());
    }
    @Test
    void consultaExclusivaAdministradorSemExporDadosDoUsuario() {
        var service = mock(UsuarioService.class);
        var controller = new UsuarioController(mock(UsuarioRepository.class), service,
                mock(MfaService.class), mock(UsuarioMapper.class), mock(SessionService.class), mock(UsuarioExclusaoService.class));
        var solicitante = new UsuarioResponse();
        solicitante.setId(1L);
        solicitante.setTipo_do_acesso("CLIENTE");
        solicitante.setStatus("ATIVO");
        assertEquals(403, controller.validarCpf("22222222222", solicitante).getStatusCode().value());
        assertEquals(401, controller.validarCpf("22222222222", null).getStatusCode().value());
        verifyNoInteractions(service);
        solicitante.setTipo_do_acesso("ADMINISTRADOR");
        when(service.cpfCadastrado("22222222222")).thenReturn(true);
        var resposta = controller.validarCpf("22222222222", solicitante);
        assertEquals(java.util.Map.of("cadastrado", true), resposta.getBody());
        assertEquals("no-store", resposta.getHeaders().getCacheControl());
    }

    @Test
    void conflitoNaRestricaoCpfRetornaMensagemDireta() {
        var erro = new DataIntegrityViolationException("Falha de gravação",
                new ConstraintViolationException("Duplicidade", new SQLException(), "usuario.uk_usuario_cpf"));
        var resposta = new GlobalExceptionHandler().tratarDataIntegrityViolationException(erro);
        assertEquals(409, resposta.getStatusCode().value());
        assertEquals("CPF já cadastrado anteriormente.", resposta.getBody().getMensagem());
    }
}
