package com.clinicar.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.clinicar.backend.model.PasswordResetToken;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.PasswordResetTokenRepository;
import com.clinicar.backend.repository.UsuarioRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class RecuperacaoSenhaServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private RecuperacaoSenhaService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "frontendUrl", "https://app.clinicar.test");
    }

    @Test
    void solicitarRedefinicaoSenhaIgnoraEmailNuloOuBranco() {
        service.solicitarRedefinicaoSenha(null);
        service.solicitarRedefinicaoSenha(" ");

        verifyNoInteractions(usuarioRepository, tokenRepository, emailService);
    }

    @Test
    void solicitarRedefinicaoSenhaNaoFazNadaQuandoEmailNaoExiste() {
        when(usuarioRepository.findByEmail("naoexiste@teste.com")).thenReturn(Optional.empty());

        service.solicitarRedefinicaoSenha("  naoexiste@teste.com ");

        verify(usuarioRepository).findByEmail("naoexiste@teste.com");
        verifyNoInteractions(emailService);
        verify(tokenRepository, never()).save(any(PasswordResetToken.class));
    }

    @Test
    void solicitarRedefinicaoSenhaInvalidaTokensAnterioresCriaNovoTokenEEnviaEmail() {
        Usuario usuario = new Usuario();
        usuario.setId(7L);
        usuario.setEmail("maria@teste.com");
        usuario.setNome("Maria");

        PasswordResetToken antigo1 = new PasswordResetToken();
        antigo1.setUsado(false);
        PasswordResetToken antigo2 = new PasswordResetToken();
        antigo2.setUsado(false);

        when(usuarioRepository.findByEmail("maria@teste.com")).thenReturn(Optional.of(usuario));
        when(tokenRepository.findByUsuarioIdAndUsadoFalse(7L)).thenReturn(List.of(antigo1, antigo2));
        when(tokenRepository.save(any(PasswordResetToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.solicitarRedefinicaoSenha("maria@teste.com");

        assertTrue(antigo1.getUsado());
        assertTrue(antigo2.getUsado());

        ArgumentCaptor<PasswordResetToken> captor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository, times(3)).save(captor.capture());
        PasswordResetToken novoToken = captor.getAllValues().get(2);
        assertEquals(7L, novoToken.getUsuarioId());
        assertTrue(novoToken.getTokenHash() != null && !novoToken.getTokenHash().isBlank());
        assertTrue(novoToken.getExpiraEm().isAfter(LocalDateTime.now().minusMinutes(1)));
        assertEquals(Boolean.FALSE, novoToken.getUsado());

        verify(emailService).enviarEmailRedefinicaoSenha(
                eq("maria@teste.com"),
                eq("Maria"),
                org.mockito.ArgumentMatchers.contains("https://app.clinicar.test/redefinir-senha?token=")
        );
    }

    @Test
    void redefinirSenhaValidaCamposObrigatoriosEConfirmacao() {
        IllegalArgumentException exToken = assertThrows(
                IllegalArgumentException.class,
                () -> service.redefinirSenha(" ", "Senha123", "Senha123")
        );
        assertEquals("Token não informado.", exToken.getMessage());

        IllegalArgumentException exNova = assertThrows(
                IllegalArgumentException.class,
                () -> service.redefinirSenha("token", " ", "Senha123")
        );
        assertEquals("Nova senha não informada.", exNova.getMessage());

        IllegalArgumentException exConfirmacao = assertThrows(
                IllegalArgumentException.class,
                () -> service.redefinirSenha("token", "Senha123", " ")
        );
        assertEquals("Confirmação de senha não informada.", exConfirmacao.getMessage());

        IllegalArgumentException exDivergente = assertThrows(
                IllegalArgumentException.class,
                () -> service.redefinirSenha("token", "Senha123", "Senha124")
        );
        assertEquals("A confirmação de senha não confere.", exDivergente.getMessage());
    }

    @Test
    void redefinirSenhaValidaForcaDaSenha() {
        IllegalArgumentException exCurta = assertThrows(
                IllegalArgumentException.class,
                () -> service.redefinirSenha("token", "Abc123", "Abc123")
        );
        assertEquals("A senha deve ter pelo menos 8 caracteres.", exCurta.getMessage());

        IllegalArgumentException exSemNumero = assertThrows(
                IllegalArgumentException.class,
                () -> service.redefinirSenha("token", "ApenasLetras", "ApenasLetras")
        );
        assertEquals("A senha deve conter letras e números.", exSemNumero.getMessage());
    }

    @Test
    void redefinirSenhaLancaErroQuandoTokenInvalido() {
        when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.redefinirSenha("token-valido", "Senha123", "Senha123")
        );

        assertEquals("Token inválido ou expirado.", ex.getMessage());
    }

    @Test
    void redefinirSenhaLancaErroQuandoTokenJaUtilizado() {
        PasswordResetToken token = new PasswordResetToken();
        token.setUsado(true);
        token.setExpiraEm(LocalDateTime.now().plusMinutes(10));
        token.setUsuarioId(1L);

        when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.redefinirSenha("token", "Senha123", "Senha123")
        );

        assertEquals("Token já utilizado.", ex.getMessage());
    }

    @Test
    void redefinirSenhaLancaErroQuandoTokenExpirado() {
        PasswordResetToken token = new PasswordResetToken();
        token.setUsado(false);
        token.setExpiraEm(LocalDateTime.now().minusMinutes(1));
        token.setUsuarioId(1L);

        when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.redefinirSenha("token", "Senha123", "Senha123")
        );

        assertEquals("Token expirado.", ex.getMessage());
    }

    @Test
    void redefinirSenhaLancaErroQuandoUsuarioNaoExiste() {
        PasswordResetToken token = new PasswordResetToken();
        token.setUsado(false);
        token.setExpiraEm(LocalDateTime.now().plusMinutes(10));
        token.setUsuarioId(99L);

        when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.redefinirSenha("token", "Senha123", "Senha123")
        );

        assertEquals("Usuário não encontrado.", ex.getMessage());
    }

    @Test
    void redefinirSenhaComDadosValidosAtualizaUsuarioEMarcaTokenComoUsado() {
        PasswordResetToken token = new PasswordResetToken();
        token.setUsado(false);
        token.setExpiraEm(LocalDateTime.now().plusMinutes(10));
        token.setUsuarioId(5L);

        Usuario usuario = new Usuario();
        usuario.setId(5L);
        usuario.setSenha("senhaAntiga");

        when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));
        when(usuarioRepository.findById(5L)).thenReturn(Optional.of(usuario));
        when(passwordEncoder.encode("Senha123")).thenReturn("senha-criptografada");

        service.redefinirSenha("token", "Senha123", "Senha123");

        assertEquals("senha-criptografada", usuario.getSenha());
        assertTrue(token.getUsado());
        verify(usuarioRepository).save(usuario);
        verify(tokenRepository).save(token);
    }
}
