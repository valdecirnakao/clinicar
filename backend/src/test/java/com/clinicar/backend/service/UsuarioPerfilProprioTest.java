package com.clinicar.backend.service;

import com.clinicar.backend.dto.UsuarioRequest;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.AuthSessionRepository;
import com.clinicar.backend.repository.SolicitacaoAcessoUsuarioRepository;
import com.clinicar.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class UsuarioPerfilProprioTest {
    private final UsuarioRepository repo = mock(UsuarioRepository.class);
    private final UsuarioService service = new UsuarioService(repo, mock(PasswordEncoder.class),
            mock(ApplicationEventPublisher.class), mock(ProtecaoAdministrativaService.class),
            mock(AuthSessionRepository.class), mock(SolicitacaoAcessoUsuarioRepository.class));

    @Test
    void clienteAtualizaCpfEEmailComUnicidadeSemAlterarPerfil() {
        var usuario = usuario();
        when(repo.findById(7L)).thenReturn(Optional.of(usuario));
        when(repo.saveAndFlush(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        var request = new UsuarioRequest();
        request.setCpf("987.654.321-00");
        request.setEmail(" Novo@Exemplo.com ");
        request.setNome("Cliente Atualizado");

        var resposta = service.atualizarProprio(7L, request);

        assertEquals("98765432100", resposta.getCpf());
        assertEquals("novo@exemplo.com", resposta.getEmail());
        assertEquals("Cliente Atualizado", resposta.getNome());
        assertEquals("CLIENTE", resposta.getTipo_do_acesso());
        verify(repo).existsByCpfAndIdNot("98765432100", 7L);
        verify(repo).existsByEmailIgnoreCaseAndIdNot("novo@exemplo.com", 7L);
    }

    @Test
    void cpfDuplicadoBloqueiaAtualizacao() {
        when(repo.findById(7L)).thenReturn(Optional.of(usuario()));
        when(repo.existsByCpfAndIdNot("98765432100", 7L)).thenReturn(true);
        var request = new UsuarioRequest();
        request.setCpf("98765432100");

        assertThrows(IllegalArgumentException.class, () -> service.atualizarProprio(7L, request));
        verify(repo, never()).saveAndFlush(any());
    }

    private Usuario usuario() {
        var usuario = new Usuario();
        usuario.setId(7L);
        usuario.setCpf("12345678901");
        usuario.setEmail("cliente@exemplo.com");
        usuario.setNome("Cliente Teste");
        usuario.setTipo_do_acesso("CLIENTE");
        usuario.setStatus("ATIVO");
        return usuario;
    }
}
