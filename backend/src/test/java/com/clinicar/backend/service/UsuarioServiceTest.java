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

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository repo;

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

        when(repo.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Usuario salvo = service.criar(req);

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(repo).save(captor.capture());

        Usuario usuario = captor.getValue();
        assertEquals("12345678900", usuario.getCpf());
        assertEquals("12345678", usuario.getCep());
        assertEquals("Maria", usuario.getNome());
        assertEquals("Maria S.", usuario.getNome_social());
        assertEquals("secret", usuario.getSenha());
        assertEquals("(11) 99999-1111", usuario.getTelefone());
        assertEquals("ATIVO", usuario.getStatus());
        assertEquals("maria@example.com", usuario.getEmail());
        assertEquals("Rua A", usuario.getLogradouro());
        assertEquals("Centro", usuario.getBairro());
        assertEquals("Sao Paulo", usuario.getCidade());
        assertEquals("SP", usuario.getEstado());
        assertEquals("Apto 1", usuario.getComplemento_endereco());
        assertEquals("100", usuario.getNumero_endereco());
        assertEquals("ADMIN", usuario.getTipo_do_acesso());
        assertEquals("2024-12-31", usuario.getNascimento().toString());
        assertEquals(usuario, salvo);
    }

    @Test
    void criarDefineNascimentoNuloQuandoDataInvalida() {
        UsuarioRequest req = new UsuarioRequest();
        req.setCpf("999.999.999-99");
        req.setCep("00000-000");
        req.setNascimento("2024-12-31");

        when(repo.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Usuario salvo = service.criar(req);

        assertNull(salvo.getNascimento());
        verify(repo).save(any(Usuario.class));
    }
}