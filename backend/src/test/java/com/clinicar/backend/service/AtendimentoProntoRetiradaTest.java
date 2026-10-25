package com.clinicar.backend.service;

import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.repository.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AtendimentoProntoRetiradaTest {
    @Mock AtendimentoRepository atendimentos;
    @Mock AgendamentoRepository agendamentos;
    @Mock UsuarioRepository usuarios;
    @Mock FornecedorRepository fornecedores;
    @Mock OrdemServicoEnvioService ordemServico;
    @Mock AtendimentoEstoqueService estoque;
    @Mock AgendamentoPecaPrevistaRepository pecasPrevistas;
    @Mock AtendimentoPecaUtilizadaRepository pecasUtilizadas;
    @Mock AtendimentoServicoExecutadoService servicos;
    @Mock PrevisaoManutencaoService manutencao;
    @Mock AtendimentoTotaisService totais;
    @Mock AtendimentoOrcamentoService orcamentos;
    @Mock ReservaEstoqueAgendamentoService reservas;
    @Mock AvisosServicoWhatsappService avisos;
    @InjectMocks AtendimentoService service;

    @Test void exigeConclusaoEEnfileiraApenasUmaVez() {
        var atendimento = new Atendimento(); atendimento.setId(10L);
        atendimento.setStatusAtendimento("EM_EXECUCAO");
        when(atendimentos.buscarParaEmissaoOs(10L)).thenReturn(Optional.of(atendimento));
        assertThrows(IllegalArgumentException.class, () -> service.marcarProntoRetirada(10L));
        verifyNoInteractions(avisos);

        atendimento.setStatusAtendimento("CONCLUIDO");
        when(atendimentos.save(atendimento)).thenReturn(atendimento);
        assertSame(atendimento, service.marcarProntoRetirada(10L));
        assertNotNull(atendimento.getProntoRetiradaEm());
        assertSame(atendimento, service.marcarProntoRetirada(10L));
        verify(atendimentos, times(1)).save(atendimento);
        verify(avisos, times(1)).prontoRetirada(atendimento);
    }
}
