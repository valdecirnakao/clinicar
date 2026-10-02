package com.clinicar.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.clinicar.backend.dto.UsuarioRequest;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository repo;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @Test
    void consultaEmailNormalizadoERejeitaFormatoIncorreto() {
        when(repo.existsByEmailIgnoreCase("cliente@example.com")).thenReturn(true);
        org.junit.jupiter.api.Assertions.assertTrue(service.emailCadastrado(" Cliente@Example.com "));
        org.junit.jupiter.api.Assertions.assertFalse(service.emailCadastrado("livre@example.com"));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> service.emailCadastrado("sem-arroba"));
    }

    @Test
    void rejeitaEmailDuplicadoAoSalvarSemGravarOuNotificar() {
        UsuarioRequest req = new UsuarioRequest();
        req.setEmail(" Cliente@Example.com ");
        when(repo.existsByEmailIgnoreCase("cliente@example.com")).thenReturn(true);
        var erro = org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> service.criarPorAdministrador(req));
        assertEquals("E-mail já cadastrado anteriormente.", erro.getMessage());
        org.mockito.Mockito.verify(repo, org.mockito.Mockito.never()).saveAndFlush(any());
        org.mockito.Mockito.verifyNoInteractions(eventPublisher);
    }

    @Test
    void recusaCpfRepetidoNormalizadoSemGravarOuNotificar() {
        UsuarioRequest req = new UsuarioRequest();
        req.setEmail("novo@example.com");
        req.setCpf("222.222.222-22");
        when(repo.existsByCpf("22222222222")).thenReturn(true);
        var erro = org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> service.criarPorAdministrador(req));
        assertEquals("CPF já cadastrado anteriormente.", erro.getMessage());
        org.mockito.Mockito.verify(repo, org.mockito.Mockito.never()).saveAndFlush(any());
        org.mockito.Mockito.verifyNoInteractions(eventPublisher);
    }

    @Test
    void consultaDocumentoNormalizadoERejeitaTamanhoIncorreto() {
        when(repo.existsByCpf("22222222222")).thenReturn(true);
        org.junit.jupiter.api.Assertions.assertTrue(service.cpfCadastrado("222.222.222-22"));
        org.junit.jupiter.api.Assertions.assertFalse(service.cpfCadastrado("33333333333"));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> service.cpfCadastrado("123"));
    }

    @org.mockito.Mock com.clinicar.backend.repository.SolicitacaoAcessoUsuarioRepository solicitacoesAcesso;
    @InjectMocks
    private UsuarioService service;

    @Test
    void criarNormalizaCpfEcepEConverteNascimentoValido() {
        UsuarioRequest req = new UsuarioRequest();

        req.setCpf("123.456.789-00");
        req.setNome("Maria");
        req.setNome_social("Maria S.");
        req.setSenha("secret");
        req.setTelefone("(11) 99999-1111");
        req.setEmail("maria@example.com");
        req.setCep("12.345-678");
        req.setLogradouro("Rua A");
        req.setBairro("Centro");
        req.setCidade("Sao Paulo");
        req.setEstado("SP");
        req.setComplemento_endereco("Apto 1");
        req.setNumero_endereco("100");
        req.setTipo_do_acesso("ADMIN");
        req.setNascimento("31/12/2024");

        when(passwordEncoder.encode("secret"))
                .thenReturn("$2a$10$senhaCriptografadaParaTeste");

        when(repo.saveAndFlush(any(Usuario.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var salvo = service.criar(req);

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(repo).saveAndFlush(captor.capture());

        Usuario usuario = captor.getValue();

        assertEquals("12345678900", usuario.getCpf());
        assertEquals("12345678", usuario.getCep());
        assertEquals("Maria", usuario.getNome());
        assertEquals("Maria S.", usuario.getNome_social());

        /*
         * Agora a senha deve estar criptografada.
         * Como usamos PasswordEncoder mockado, validamos o valor retornado pelo mock.
         */
        assertEquals("$2a$10$senhaCriptografadaParaTeste", usuario.getSenha());

        assertEquals("11999991111", usuario.getTelefone());
        assertEquals("ATIVO", usuario.getStatus());
        assertEquals("maria@example.com", usuario.getEmail());
        assertEquals("Rua A", usuario.getLogradouro());
        assertEquals("Centro", usuario.getBairro());
        assertEquals("Sao Paulo", usuario.getCidade());
        assertEquals("SP", usuario.getEstado());
        assertEquals("Apto 1", usuario.getComplemento_endereco());
        assertEquals("100", usuario.getNumero_endereco());
        assertEquals("CLIENTE", usuario.getTipo_do_acesso());
        assertEquals("2024-12-31", usuario.getNascimento().toString());

        assertEquals(usuario.getEmail(), salvo.getEmail());
        verify(eventPublisher).publishEvent(new com.clinicar.backend.event.UsuarioCadastradoEvent(
                usuario.getId(), "Maria S.", "11999991111"));
    }

    @Test
    void criarDefineNascimentoNuloQuandoDataInvalida() {
        UsuarioRequest req = new UsuarioRequest();

        req.setCpf("999.999.999-99");
        req.setCep("00000-000");
        req.setNascimento("data-invalida");
        req.setEmail("teste@example.com");
        req.setSenha("secret");

        when(repo.saveAndFlush(any(Usuario.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var salvo = service.criar(req);

        assertNull(salvo.getNascimento());

        verify(repo).saveAndFlush(any(Usuario.class));
    }
}
