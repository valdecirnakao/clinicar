package com.clinicar.backend.service;
import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
@ExtendWith(MockitoExtension.class)
class PrevisaoManutencaoServiceTest {
    @Mock AtendimentoRepository atendimentos;
    @Mock AtendimentoServicoExecutadoRepository servicos;
    @Mock AtendimentoPecaUtilizadaRepository pecas;
    @Mock RegraManutencaoPreventivaRepository regras;
    @Mock PrevisaoManutencaoVeiculoRepository previsoes;
    @Mock HistoricoQuilometragemVeiculoRepository historicos;
    @Mock MediaUsoVeiculoService media;
    @InjectMocks PrevisaoManutencaoService service;
    Atendimento a;
    @BeforeEach void preparar() {
        a = new Atendimento(); a.setId(1L); a.setStatusAtendimento("CONCLUIDO");
        var v = new Veiculo(); v.setId(1L); a.setVeiculo(v);
        var u = new Usuario(); u.setId(1L); a.setCliente(u);
        a.setQuilometragemEntrada(10000); a.setFinalizadoEm(LocalDateTime.of(2026,9,1,12,0));
        when(atendimentos.buscarParaPrevisao(1L)).thenReturn(Optional.of(a));
    }
    @Test void rejeitaAtendimentoEmAberto() {
        a.setStatusAtendimento("ABERTO");
        assertThrows(IllegalArgumentException.class, () -> service.gerarPrevisoesDoAtendimento(1L));
        verifyNoInteractions(previsoes);
    }
    @Test void geracaoRepetidaRetornaMesmasPrevisoes() {
        var existente = new PrevisaoManutencaoVeiculo(); existente.setId(9L);
        when(previsoes.findByAtendimentoOrigem_Id(1L)).thenReturn(List.of(existente));
        assertEquals(9L, service.gerarPrevisoesDoAtendimento(1L).getFirst().getId());
        verify(previsoes,never()).save(any()); verifyNoInteractions(historicos);
    }
    @Test void naoAplicaRegraDeOutraPecaPelaOrigemOleo() {
        var usada = new Peca(); usada.setId(1L); usada.setOrigemOleo("SINTETICO");
        var outra = new Peca(); outra.setId(2L);
        var item = new AtendimentoPecaUtilizada(); item.setPeca(usada);
        var regra = new RegraManutencaoPreventiva(); regra.setId(1L); regra.setPeca(outra);
        regra.setOrigemOleo("SINTETICO"); regra.setIntervaloDias(180); regra.setGrupoManutencao("TROCA_OLEO");
        when(regras.findByAtivoTrueOrderByPrioridadeAsc()).thenReturn(List.of(regra));
        when(pecas.findByAtendimento_Id(1L)).thenReturn(List.of(item));
        assertTrue(service.gerarPrevisoesDoAtendimento(1L).isEmpty()); verify(previsoes,never()).save(any());
    }
    @Test void usaMenorDataEntreTempoEQuilometragem() {
        var usada = new Peca(); usada.setId(1L);
        var item = new AtendimentoPecaUtilizada(); item.setPeca(usada);
        var regra = new RegraManutencaoPreventiva(); regra.setId(1L); regra.setPeca(usada);
        regra.setIntervaloDias(180); regra.setIntervaloKm(1000); regra.setGrupoManutencao("FILTRO_AR");
        when(regras.findByAtivoTrueOrderByPrioridadeAsc()).thenReturn(List.of(regra));
        when(pecas.findByAtendimento_Id(1L)).thenReturn(List.of(item));
        when(media.calcularMediaUsoVeiculo(1L)).thenReturn(new MediaUsoVeiculoService.MediaUsoVeiculoResultado(new BigDecimal("100"),2,"BAIXA","Teste"));
        when(previsoes.save(any())).thenAnswer(i -> i.getArgument(0));
        var p = service.gerarPrevisoesDoAtendimento(1L).getFirst();
        assertEquals(LocalDate.of(2026,9,11),p.getDataRecomendada()); assertEquals(11000,p.getKmLimite());
    }
}
