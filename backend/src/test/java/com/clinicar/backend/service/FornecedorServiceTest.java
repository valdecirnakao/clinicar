package com.clinicar.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.clinicar.backend.dto.FornecedorRequest;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.repository.FornecedorRepository;
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