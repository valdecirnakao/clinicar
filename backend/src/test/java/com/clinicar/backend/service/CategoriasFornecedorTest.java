package com.clinicar.backend.service;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

class CategoriasFornecedorTest {
    @Test void categoriaMistaAtendeAmbosEPeçasNaoHabilitaServiços() {
        assertTrue(CategoriasFornecedor.aceita("Peças e serviços", "PECAS"));
        assertTrue(CategoriasFornecedor.aceita("Peças e serviços", "SERVICOS"));
        assertFalse(CategoriasFornecedor.aceita("Peças automotivas", "SERVICOS"));
        assertFalse(CategoriasFornecedor.aceita("Serviços automotivos", "PECAS"));
        assertFalse(CategoriasFornecedor.aceita("Outros", "SERVICOS"));
    }
}
