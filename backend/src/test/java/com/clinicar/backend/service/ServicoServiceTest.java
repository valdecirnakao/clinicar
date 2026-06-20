package com.clinicar.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.clinicar.backend.dto.ServicoRequest;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.repository.ServicoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ServicoServiceTest {

    @Mock
    private ServicoRepository repo;

    @InjectMocks
    private ServicoService service;

    @Test
    void criarMapeiaCamposDoServico() {
        ServicoRequest req = new ServicoRequest();
        req.setDescricao("Troca de oleo");
        req.setTipoDoPrestador("Oficina");
        req.setDuracao(90);
        req.setUnidade("min");
        req.setIdFornecedor(7L);

        when(repo.save(any(Servico.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Servico salvo = service.criar(req);

        ArgumentCaptor<Servico> captor = ArgumentCaptor.forClass(Servico.class);
        verify(repo).save(captor.capture());

        Servico servico = captor.getValue();
        assertEquals("Troca de oleo", servico.getDescricao());
        assertEquals("Oficina", servico.getTipoDoPrestador());
        assertEquals(90, servico.getDuracao());
        assertEquals("min", servico.getUnidade());
        assertEquals(7L, servico.getIdFornecedor());
        assertEquals(servico, salvo);
    }
}