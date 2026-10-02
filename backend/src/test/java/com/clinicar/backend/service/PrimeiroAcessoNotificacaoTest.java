package com.clinicar.backend.service;

import com.clinicar.backend.dto.setup.AdministradorInicialRequest;
import com.clinicar.backend.event.UsuarioCadastradoEvent;
import com.clinicar.backend.model.ConfiguracaoSistema;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.model.enums.EstadoSetup;
import com.clinicar.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class PrimeiroAcessoNotificacaoTest {
    @Test
    void cadastroInicialPublicaNotificacaoEnquantoContaAindaAguardaAtivacaoEMfa() {
        var usuarios = mock(UsuarioRepository.class);
        var configuracoes = mock(ConfiguracaoSistemaRepository.class);
        var tokens = mock(TokenAtivacaoUsuarioRepository.class);
        var tokenService = mock(TokenUsuarioService.class);
        var eventos = mock(ApplicationEventPublisher.class);
        var service = new PrimeiroAcessoService(usuarios, configuracoes, tokens, tokenService,
                mock(PasswordEncoder.class), eventos);
        ReflectionTestUtils.setField(service, "tokenValidadeMinutos", 60L);
        var config = new ConfiguracaoSistema();
        config.setEstadoSetup(EstadoSetup.NAO_INICIADO);
        when(configuracoes.buscarParaAtualizacao()).thenReturn(Optional.of(config));
        when(tokenService.gerarToken()).thenReturn("token-de-teste");
        when(tokenService.gerarHash("token-de-teste")).thenReturn("hash-de-teste");
        when(usuarios.saveAndFlush(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario usuario = invocation.getArgument(0);
            usuario.setId(1L);
            return usuario;
        });
        var request = new AdministradorInicialRequest();
        request.setNome("Administrador Teste");
        request.setNomeSocial("Nome Social Teste");
        request.setCpf("12345678900");
        request.setEmail("admin@example.com");
        request.setTelefone("(11) 99999-1111");
        request.setNascimento("1990-01-01");
        service.cadastrarAdministrador(request);
        verify(eventos).publishEvent(new UsuarioCadastradoEvent(1L, "Nome Social Teste", "11999991111"));
        assertEquals("PENDENTE_ATIVACAO", config.getAdministradorInicial().getStatus());
        assertFalse(config.getAdministradorInicial().getMfaAtivo());
        assertNull(config.getAdministradorInicial().getSenha());
    }
}
