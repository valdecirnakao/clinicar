package com.clinicar.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.clinicar.backend.dto.FornecedorRequest;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.repository.FornecedorRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FornecedorServiceTest {

    @Mock
    private FornecedorRepository repo;

    @InjectMocks
    private FornecedorService service;

    @Test
    void rejeitaEmailComFormatoInvalidoAntesDeGravar() {
        for (String email : java.util.List.of("semarroba.com", "@empresa.com", "nome@", "nome@empresa",
                "nome@@empresa.com", "nome sobrenome@empresa.com", "nome@empresa..com")) {
            FornecedorRequest request = new FornecedorRequest(); request.setEmail(email);
            assertThrows(IllegalArgumentException.class, () -> service.criar(request));
        }
        org.mockito.Mockito.verifyNoInteractions(repo);
    }

    @Test
    void consultaEmailNormalizaEIgnoraOProprioFornecedor() {
        when(repo.emailCadastrado("teste@example.com", null)).thenReturn(true);
        assertTrue(service.emailCadastrado(" Teste@Example.com ", null));
        assertFalse(service.emailCadastrado("Teste@Example.com", 7L));
        verify(repo).emailCadastrado("teste@example.com", 7L);
        assertThrows(IllegalArgumentException.class, () -> service.emailCadastrado("invalido", null));
    }

    @Test
    void cadastroEEdicaoRejeitamEmailDuplicadoSemConsultaPrevia() {
        FornecedorRequest request = new FornecedorRequest();
        request.setCnpj("12345678000190");
        request.setEmail(" Teste@Example.com ");
        when(repo.emailCadastrado("teste@example.com", null)).thenReturn(true);
        assertEquals("E-mail já cadastrado anteriormente.",
                assertThrows(IllegalArgumentException.class, () -> service.criar(request)).getMessage());
        Fornecedor atual = new Fornecedor(); atual.setId(7L);
        when(repo.findById(7L)).thenReturn(Optional.of(atual));
        when(repo.emailCadastrado("teste@example.com", 7L)).thenReturn(true);
        assertEquals("E-mail já cadastrado anteriormente.",
                assertThrows(IllegalArgumentException.class, () -> service.atualizar(7L, request)).getMessage());
    }

    @Test
    void consultaNormalizaMascaraEIgnoraSomenteOProprioFornecedor() {
        Fornecedor fornecedor = new Fornecedor();
        fornecedor.setId(7L);
        when(repo.findByCnpj("12345678000190")).thenReturn(Optional.of(fornecedor));
        assertTrue(service.cnpjCadastrado("12.345.678/0001-90", null));
        assertFalse(service.cnpjCadastrado("12.345.678/0001-90", 7L));
        assertTrue(service.cnpjCadastrado("12.345.678/0001-90", 8L));
    }

    @Test
    void consultaPermiteDocumentoDisponivelERejeitaFormatoIncompleto() {
        assertFalse(service.cnpjCadastrado("12345678000190", null));
        assertThrows(IllegalArgumentException.class, () -> service.cnpjCadastrado("123", null));
    }

    @Test
    void cadastroRejeitaDuplicidadeMesmoSemConsultaPrevia() {
        FornecedorRequest request = new FornecedorRequest();
        request.setCnpj("12.345.678/0001-90");
        when(repo.findByCnpj("12345678000190")).thenReturn(Optional.of(new Fornecedor()));
        assertEquals("CNPJ já cadastrado anteriormente.",
                assertThrows(IllegalArgumentException.class, () -> service.criar(request)).getMessage());
    }

    @Test
    void edicaoRejeitaCnpjDeOutroFornecedor() {
        Fornecedor atual = new Fornecedor();
        atual.setId(7L);
        Fornecedor outro = new Fornecedor();
        outro.setId(8L);
        FornecedorRequest request = new FornecedorRequest();
        request.setCnpj("12.345.678/0001-90");
        when(repo.findById(7L)).thenReturn(Optional.of(atual));
        when(repo.findByCnpj("12345678000190")).thenReturn(Optional.of(outro));
        assertEquals("CNPJ já cadastrado anteriormente.",
                assertThrows(IllegalArgumentException.class, () -> service.atualizar(7L, request)).getMessage());
    }

    @Test
    void criarNormalizaCnpjEcepEConverteFundacaoValida() {
        FornecedorRequest req = new FornecedorRequest();
        req.setCnpj("12.345.678/0001-90");
        req.setRazaoSocial("Clinicar LTDA");
        req.setNomeFantasia("Clinicar");
        req.setItemFornecido("Pecas");
        req.setTelefone("(11) 3333-4444");
        req.setEmail("fornecedor@example.com");
        req.setFundacao("01/02/2020");
        req.setCep("12.345-678");
        req.setLogradouro("Rua B");
        req.setBairro("Centro");
        req.setCidade("Sao Paulo");
        req.setEstado("SP");
        req.setComplementoEndereco("Sala 2");
        req.setNumeroEndereco("55");

        when(repo.save(any(Fornecedor.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Fornecedor salvo = service.criar(req);

        ArgumentCaptor<Fornecedor> captor = ArgumentCaptor.forClass(Fornecedor.class);
        verify(repo).save(captor.capture());

        Fornecedor fornecedor = captor.getValue();
        assertEquals("12345678000190", fornecedor.getCnpj());
        assertEquals("12345678", fornecedor.getCep());
        assertEquals("Clinicar LTDA", fornecedor.getRazaoSocial());
        assertEquals("Clinicar", fornecedor.getNomeFantasia());
        assertEquals("Pecas", fornecedor.getItemFornecido());
        assertEquals("(11) 3333-4444", fornecedor.getTelefone());
        assertEquals("fornecedor@example.com", fornecedor.getEmail());
        assertEquals("2020-02-01", fornecedor.getFundacao().toString());
        assertEquals("Rua B", fornecedor.getLogradouro());
        assertEquals("Centro", fornecedor.getBairro());
        assertEquals("Sao Paulo", fornecedor.getCidade());
        assertEquals("SP", fornecedor.getEstado());
        assertEquals("Sala 2", fornecedor.getComplementoEndereco());
        assertEquals("55", fornecedor.getNumeroEndereco());
        assertEquals(fornecedor, salvo);
    }

    @Test
    void criarDefineFundacaoNulaQuandoDataInvalida() {
        FornecedorRequest req = new FornecedorRequest();
        req.setCnpj("12.345.678/0001-90");
        req.setCep("12.345-678");
        req.setFundacao("2020-02-01");

        when(repo.save(any(Fornecedor.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Fornecedor salvo = service.criar(req);

        assertNull(salvo.getFundacao());
        verify(repo).save(any(Fornecedor.class));
    }
}
