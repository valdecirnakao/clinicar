package com.clinicar.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.clinicar.backend.dto.VeiculoRequest;
import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.repository.VeiculoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VeiculoServiceTest {

    @Mock
    private VeiculoRepository repo;

    @InjectMocks
    private VeiculoService service;

    @Test
    void criarNormalizaPlacaEMapeiaCampos() {
        VeiculoRequest req = new VeiculoRequest();
        req.setPlaca(" ab c 1234 ");
        req.setFabricante("Toyota");
        req.setCor("Preto");
        req.setModelo("Corolla");
        req.setAnoModeloCombustivel("2025/2026 Flex");
        req.setIdProprietario(42L);

        when(repo.save(any(Veiculo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Veiculo salvo = service.criar(req);

        ArgumentCaptor<Veiculo> captor = ArgumentCaptor.forClass(Veiculo.class);
        verify(repo).save(captor.capture());

        Veiculo veiculo = captor.getValue();
        assertEquals("ABC1234", veiculo.getPlaca());
        assertEquals("Toyota", veiculo.getFabricante());
        assertEquals("Preto", veiculo.getCor());
        assertEquals("Corolla", veiculo.getModelo());
        assertEquals("2025/2026 Flex", veiculo.getAnoModeloCombustivel());
        assertEquals(42L, veiculo.getIdProprietario());
        assertEquals(veiculo, salvo);
    }

    @Test
    void criarMantemPlacaNulaQuandoEntradaNula() {
        VeiculoRequest req = new VeiculoRequest();
        req.setIdProprietario(1L);

        when(repo.save(any(Veiculo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Veiculo salvo = service.criar(req);

        assertNull(salvo.getPlaca());
        verify(repo).save(any(Veiculo.class));
    }
}