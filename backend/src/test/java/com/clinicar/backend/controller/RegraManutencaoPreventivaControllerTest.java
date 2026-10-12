package com.clinicar.backend.controller;
import com.clinicar.backend.repository.*;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
class RegraManutencaoPreventivaControllerTest {
    @Test void aceitaOrigemSemissinteticaComAcento() {
        var repo = mock(RegraManutencaoPreventivaRepository.class);
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        var controller = new RegraManutencaoPreventivaController(repo,mock(ServicoRepository.class),mock(PecaRepository.class));
        var request = new RegraManutencaoPreventivaController.RegraManutencaoPreventivaRequest(
                "TROCA_OLEO","Óleo",null,null,"semissintético",5000,180,10,true,null);
        assertEquals("SEMISSINTETICO",controller.criar(request).getBody().origemOleo());
    }
    @Test void rejeitaOrigemDesconhecida() {
        var repo = mock(RegraManutencaoPreventivaRepository.class);
        var controller = new RegraManutencaoPreventivaController(repo,mock(ServicoRepository.class),mock(PecaRepository.class));
        var request = new RegraManutencaoPreventivaController.RegraManutencaoPreventivaRequest(
                "TROCA_OLEO","Óleo",null,null,"OUTRO",5000,180,10,true,null);
        assertThrows(IllegalArgumentException.class,()->controller.criar(request)); verifyNoInteractions(repo);
    }
}
