package com.clinicar.backend.repository;

import com.clinicar.backend.model.Fornecedor;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class FornecedorEmailRepositoryTest {
    @Autowired FornecedorRepository repo;

    @Test
    void comparaEmailLegadoComEspacosEMaiusculasSemConfundirOProprioRegistro() {
        Fornecedor fornecedor = new Fornecedor();
        fornecedor.setEmail(" Teste@Example.com ");
        fornecedor = repo.saveAndFlush(fornecedor);
        assertTrue(repo.emailCadastrado("teste@example.com", null));
        assertFalse(repo.emailCadastrado("teste@example.com", fornecedor.getId()));
        assertFalse(repo.emailCadastrado("livre@example.com", null));
        Fornecedor outro = new Fornecedor();
        outro.setEmail("teste@example.com");
        repo.saveAndFlush(outro);
        assertTrue(repo.emailCadastrado("teste@example.com", fornecedor.getId()));
    }
}
