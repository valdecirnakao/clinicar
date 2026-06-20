package com.clinicar.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.clinicar.backend.dto.PecaRequest;
import com.clinicar.backend.model.Peca;
import com.clinicar.backend.repository.PecaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PecaServiceTest {

    @Mock
    private PecaRepository repo;

    @InjectMocks
    private PecaService service;

    @Test
    void criarMapeiaTodosOsCamposDaPeca() {
        PecaRequest req = new PecaRequest();
        req.setNome("Filtro de oleo");
        req.setTipo("Motor");
        req.setEspecificacao("Especificacao");
        req.setFabricante("Fabricante");
        req.setModelo("Modelo");
        req.setNorma("Norma");
        req.setUnidade("UN");

        when(repo.save(any(Peca.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Peca salvo = service.criar(req);

        ArgumentCaptor<Peca> captor = ArgumentCaptor.forClass(Peca.class);
        verify(repo).save(captor.capture());

        Peca peca = captor.getValue();
        assertEquals("Filtro de oleo", peca.getNome());
        assertEquals("Motor", peca.getTipo());
        assertEquals("Especificacao", peca.getEspecificacao());
        assertEquals("Fabricante", peca.getFabricante());
        assertEquals("Modelo", peca.getModelo());
        assertEquals("Norma", peca.getNorma());
        assertEquals("UN", peca.getUnidade());
        assertEquals(peca, salvo);
    }
}