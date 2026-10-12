package com.clinicar.backend.service;
import com.clinicar.backend.mapper.UsuarioMapper;
import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class SessionUsoTest {
    @Test void consultaContinuaConferindoUsuarioSemGravarUltimoUsoEmCadaRequisicao(){
        var repository=mock(AuthSessionRepository.class);var users=mock(UsuarioRepository.class);var mapper=new UsuarioMapper();
        var session=new AuthSession();session.setUsuarioId(1L);session.setRevogado(false);session.setExpiraEm(LocalDateTime.now().plusHours(1));session.setUltimoUsoEm(LocalDateTime.now());
        var user=new Usuario();user.setId(1L);user.setStatus("ATIVO");
        when(repository.findByTokenHashAndRevogadoFalse(anyString())).thenReturn(Optional.of(session));when(users.findById(1L)).thenReturn(Optional.of(user));
        var service=new SessionService(repository,users,mapper);
        assertTrue(service.validarSessao("token-teste").isPresent());verify(users).findById(1L);verify(repository,never()).save(any());
        session.setUltimoUsoEm(LocalDateTime.now().minusMinutes(6));assertTrue(service.validarSessao("token-teste").isPresent());verify(repository).save(session);
        user.setStatus("INATIVO");assertTrue(service.validarSessao("token-teste").isEmpty());assertTrue(session.getRevogado());
    }
}
