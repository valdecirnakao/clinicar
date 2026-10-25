package com.clinicar.backend.service;

import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AtendimentoEtapasTest {
    @Mock AtendimentoRepository atendimentos;
    @Mock AgendamentoRepository agendamentos;
    @Mock UsuarioRepository usuarios;
    @Mock FornecedorRepository fornecedores;
    @Mock OrdemServicoEnvioService envio;
    @Mock AtendimentoEstoqueService estoque;
    @Mock AgendamentoPecaPrevistaRepository previstas;
    @Mock AtendimentoPecaUtilizadaRepository utilizadas;
    @Mock AtendimentoServicoExecutadoService servicos;
    @Mock PrevisaoManutencaoService previsao;
    @Mock AtendimentoTotaisService totais;
    @Mock AtendimentoOrcamentoService orcamentos;
    @Mock ReservaEstoqueAgendamentoService reservas;
    @Mock AvisosServicoWhatsappService avisosWhatsapp;
    @InjectMocks AtendimentoService service;

    @Test void exigeDiagnosticoEOrcamentoAprovadoAntesDeExecutar() {
        Atendimento ordem = new Atendimento();
        ordem.setId(8L);
        ordem.setStatusAtendimento("ABERTO");
        when(atendimentos.findById(8L)).thenReturn(Optional.of(ordem));
        when(atendimentos.buscarParaPrevisao(8L)).thenReturn(Optional.of(ordem));
        when(atendimentos.save(ordem)).thenReturn(ordem);

        assertThrows(IllegalArgumentException.class, () -> service.iniciar(8L));
        service.abrirDiagnostico(8L);
        assertEquals("EM_DIAGNOSTICO", ordem.getStatusAtendimento());
        assertThrows(IllegalArgumentException.class, () -> service.solicitarAprovacao(8L));
        ordem.setDiagnosticoTecnico("Pastilhas desgastadas; substituir e testar freios.");
        when(totais.recalcularTotais(8L)).thenReturn(ordem);
        service.solicitarAprovacao(8L);
        assertEquals("AGUARDANDO_APROVACAO", ordem.getStatusAtendimento());
        verify(orcamentos).emitir(ordem);
        assertThrows(IllegalArgumentException.class, () -> service.iniciar(8L));
        assertThrows(IllegalArgumentException.class, () -> service.aprovar(8L));
        ordem.setStatusAtendimento("APROVADO"); // decisão do cliente registrada no serviço de orçamento
        service.iniciar(8L);
        assertEquals("EM_EXECUCAO", ordem.getStatusAtendimento());
        assertNotNull(ordem.getInicioReal());
    }
}
