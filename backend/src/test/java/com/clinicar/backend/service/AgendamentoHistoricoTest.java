package com.clinicar.backend.service;

import com.clinicar.backend.dto.AgendamentoRequest;
import com.clinicar.backend.mapper.AgendamentoMapper;
import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgendamentoHistoricoTest {
    @Mock AtendimentoService atendimentos;
    @Mock AgendamentoRepository repository;
    @Mock UsuarioRepository usuarios;
    @Mock VeiculoRepository veiculos;
    @Mock ServicoRepository servicos;
    @Mock FornecedorRepository fornecedores;
    @Mock AgendamentoPecaPrevistaService pecas;
    @Mock ReservaEstoqueAgendamentoService reservas;
    @Mock AvisosServicoWhatsappService avisosWhatsapp;
    @Mock NotificacaoOutboxService notificacoes;
    @InjectMocks AgendamentoService service;
    Veiculo veiculo;
    AgendamentoRequest request;

    @Test
    void clienteCancelaConfirmadoComMaisDeUmDiaELiberaReserva() {
        var agendamento = cancelavel("CONFIRMADO", java.time.LocalDateTime.now().plusDays(2));
        when(repository.buscarParaCancelamento(42L)).thenReturn(Optional.of(agendamento));
        when(repository.save(agendamento)).thenReturn(agendamento);
        assertEquals("CANCELADO", service.cancelarPeloCliente(42L, 1L).getStatusAgendamento());
        verify(reservas).liberarReservasDoAgendamento(42L);
    }

    @Test
    void clienteNaoCancelaForaDoPrazoNemOutroTitular() {
        var agendamento = cancelavel("CONFIRMADO", java.time.LocalDateTime.now().plusHours(23));
        when(repository.buscarParaCancelamento(42L)).thenReturn(Optional.of(agendamento));
        assertEquals(404, assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.cancelarPeloCliente(42L, 2L)).getStatusCode().value());
        assertEquals(409, assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.cancelarPeloCliente(42L, 1L)).getStatusCode().value());
        agendamento.setStatusAgendamento("EM_ATENDIMENTO");
        agendamento.setDataHoraInicio(java.time.LocalDateTime.now().plusDays(2));
        assertEquals(409, assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.cancelarPeloCliente(42L, 1L)).getStatusCode().value());
        verifyNoInteractions(reservas);
    }

    private Agendamento cancelavel(String status, java.time.LocalDateTime inicio) {
        var agendamento = new Agendamento(); agendamento.setId(42L);
        var titular = new Usuario(); titular.setId(1L); agendamento.setCliente(titular);
        agendamento.setStatusAgendamento(status); agendamento.setDataHoraInicio(inicio);
        return agendamento;
    }

    @Test
    void clienteConfirmaPendenteProprioERejeitaEstadoInvalido() {
        var agendamento = cancelavel("AGENDADO", java.time.LocalDateTime.now().plusDays(2));
        var responsavel = new Usuario(); responsavel.setId(9L);
        agendamento.setResponsavel(responsavel);
        agendamento.setDataHoraFim(agendamento.getDataHoraInicio().plusHours(1));
        when(usuarios.buscarParaAtualizacao(9L)).thenReturn(Optional.of(responsavel));
        when(repository.buscarParaCancelamento(42L)).thenReturn(Optional.of(agendamento));
        when(repository.save(agendamento)).thenReturn(agendamento);
        assertEquals("CONFIRMADO", service.confirmarPeloCliente(42L, 1L).getStatusAgendamento());
        verify(reservas).reservarPecasDoAgendamento(42L);
        assertEquals(409, assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.confirmarPeloCliente(42L, 1L)).getStatusCode().value());
        assertEquals(404, assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.confirmarPeloCliente(42L, 2L)).getStatusCode().value());
    }

    @Test
    void clienteNaoConfirmaAntesDaOficinaDefinirExecucao() {
        var agendamento = cancelavel("AGENDADO", java.time.LocalDateTime.now().plusDays(2));
        agendamento.setTipoExecucao("PENDENTE");
        when(repository.buscarParaCancelamento(42L)).thenReturn(Optional.of(agendamento));
        assertEquals(409, assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.confirmarPeloCliente(42L, 1L)).getStatusCode().value());
        verify(repository, never()).save(any());
        verifyNoInteractions(reservas);
    }

    @Test
    void atendimentoNaoIniciaEnquantoExecucaoEstiverPendente() {
        var agendamento = cancelavel("AGENDADO", java.time.LocalDateTime.now().plusDays(2));
        agendamento.setTipoExecucao("PENDENTE");
        when(repository.findById(42L)).thenReturn(Optional.of(agendamento));
        assertThrows(IllegalArgumentException.class, () -> service.iniciarComAtendimento(42L));
        verify(repository, never()).save(any());
    }

    @Test
    void clienteNaoReagendaConfirmadoDentroDasUltimas24Horas() {
        var agendamento = cancelavel("CONFIRMADO", java.time.LocalDateTime.now().plusHours(23));
        when(repository.buscarParaCancelamento(42L)).thenReturn(Optional.of(agendamento));
        var pedido = new AgendamentoRequest(); pedido.setDataHoraInicio("2030-10-01T09:00:00");
        assertEquals(409, assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.reagendarPeloCliente(42L, 1L, pedido)).getStatusCode().value());
        agendamento.setStatusAgendamento("AGENDADO");
        assertEquals(409, assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.reagendarPeloCliente(42L, 1L, pedido)).getStatusCode().value());
        verify(repository, never()).save(any());
    }

    @BeforeEach
    void preparar() {
        veiculo = new Veiculo();
        veiculo.setId(7L);
        veiculo.setIdProprietario(1L);
        veiculo.setPlaca("ABC1234");
        veiculo.setFabricante("Toyota");
        veiculo.setModelo("Corolla");
        veiculo.setCor("Preto");
        veiculo.setAnoModeloCombustivel("2020/2021 Flex");
        request = new AgendamentoRequest();
        request.setIdCliente(1L);
        request.setIdVeiculo(7L);
        request.setIdServico(2L);
        request.setIdResponsavel(9L);
        request.setDataHoraInicio("2030-10-01T09:00:00");
        request.setDataHoraFim("2030-10-01T10:00:00");
    }

    void prepararService() {
        Usuario cliente = new Usuario();
        cliente.setId(1L);
        cliente.setTipo_do_acesso("CLIENTE");
        veiculo.setUsuarioProprietario(cliente);
        Servico servico = new Servico();
        servico.setId(2L);
        servico.setValorBase(new java.math.BigDecimal("80.00"));
        Usuario responsavel = new Usuario(); responsavel.setId(9L); responsavel.setTipo_do_acesso("COLABORADOR"); responsavel.setStatus("ATIVO");
        when(usuarios.findById(1L)).thenReturn(Optional.of(cliente));
        when(veiculos.findById(request.getIdVeiculo())).thenReturn(Optional.of(veiculo));
        when(servicos.findById(2L)).thenReturn(Optional.of(servico));
        when(usuarios.findById(9L)).thenReturn(Optional.of(responsavel));
        when(repository.save(any(Agendamento.class))).thenAnswer(invocation -> {
            Agendamento agendamento = invocation.getArgument(0);
            agendamento.setId(42L);
            return agendamento;
        });
    }

    @Test
    void valorEstimadoInferiorAoServicoMaisPecasEhCorrigidoAoSalvar() {
        prepararService();
        request.setValorEstimado("35.00");
        var pecaRequest = new com.clinicar.backend.dto.AgendamentoPecaPrevistaRequest();
        request.setPecasPrevistas(java.util.List.of(pecaRequest));
        var pecaSalva = new AgendamentoPecaPrevista();
        pecaSalva.setValorTotal(new java.math.BigDecimal("35.00"));
        when(pecas.listarPorAgendamento(42L)).thenReturn(java.util.List.of(pecaSalva));

        var resultado = service.criar(request);

        assertEquals(0, resultado.getValorEstimado().compareTo(new java.math.BigDecimal("115.00")));
        verify(repository, times(2)).save(any(Agendamento.class));
    }

    @Test
    void rejeitaPeçaDescritaSemVinculoEstruturado() {
        request.setObservacoes("[PEÇAS PREVISTAS NO AGENDAMENTO]\n- Filtro | Qtd: 1\n[/PEÇAS PREVISTAS NO AGENDAMENTO]");
        request.setPecasPrevistas(java.util.List.of());
        assertThrows(IllegalArgumentException.class, () -> service.criar(request));
        verifyNoInteractions(repository, pecas);
    }

    @Test
    void criacaoPreservaTodosOsDadosMesmoAposEditarCadastro() {
        prepararService();
        Agendamento agendamento = service.criar(request);
        veiculo.setPlaca("XYZ9999");
        veiculo.setModelo("Yaris");
        veiculo.setFabricante("Outro");
        veiculo.setCor("Branco");
        veiculo.setAnoModeloCombustivel("2025/2026 Gasolina");
        var response = new AgendamentoMapper().toResponse(agendamento);
        assertEquals("ABC1234", response.getPlacaVeiculo());
        assertEquals("Corolla", response.getModeloVeiculo());
        assertEquals("Toyota", response.getFabricanteVeiculo());
        assertEquals("Preto", response.getCorVeiculo());
        assertEquals("2020/2021 Flex", response.getAnoModeloCombustivelVeiculo());
        assertEquals(7L, response.getIdVeiculo());
        assertNotNull(agendamento.getVeiculoPreservadoEm());
    }

    @Test
    void editarDataEObservacoesNaoAtualizaDadosHistoricos() {
        Agendamento agendamento = new Agendamento();
        agendamento.setId(4L);
        agendamento.vincularVeiculo(veiculo);
        var preservadoEm = agendamento.getVeiculoPreservadoEm();
        veiculo.setPlaca("XYZ9999");
        veiculo.setModelo("Yaris");
        prepararService();
        when(repository.buscarParaCancelamento(4L)).thenReturn(Optional.of(agendamento));
        request.setObservacoes("Nova observação");
        service.atualizar(4L, request);
        assertEquals("ABC1234", agendamento.placaVeiculoDoAgendamento());
        assertEquals("Corolla", agendamento.modeloVeiculoDoAgendamento());
        assertEquals(preservadoEm, agendamento.getVeiculoPreservadoEm());
        assertEquals("Nova observação", agendamento.getObservacoes());
    }

    @Test
    void selecionarOutroVeiculoExplicitamenteAtualizaCopia() {
        Agendamento agendamento = new Agendamento();
        agendamento.setId(4L);
        agendamento.vincularVeiculo(veiculo);
        veiculo = new Veiculo();
        veiculo.setId(8L);
        veiculo.setIdProprietario(1L);
        veiculo.setPlaca("DEF5678");
        veiculo.setModelo("Civic");
        request.setIdVeiculo(8L);
        prepararService();
        when(repository.buscarParaCancelamento(4L)).thenReturn(Optional.of(agendamento));
        service.atualizar(4L, request);
        veiculo.setPlaca("XYZ9999");
        assertEquals("DEF5678", agendamento.placaVeiculoDoAgendamento());
        assertEquals("Civic", agendamento.modeloVeiculoDoAgendamento());
        assertEquals(8L, agendamento.getVeiculo().getId());
    }

    @Test
    void dadosNulosPreservadosNaoSaoSubstituidosPeloCadastroAtual() {
        veiculo.setCor(null);
        Agendamento agendamento = new Agendamento();
        agendamento.vincularVeiculo(veiculo);
        veiculo.setCor("Azul");
        assertNull(new AgendamentoMapper().toResponse(agendamento).getCorVeiculo());
    }

    @Test
    void novoAgendamentoDoMesmoVeiculoUsaCadastroAtual() {
        Agendamento anterior = new Agendamento();
        anterior.vincularVeiculo(veiculo);
        veiculo.setPlaca("XYZ9999");
        prepararService();
        Agendamento novo = service.criar(request);
        assertEquals("ABC1234", anterior.placaVeiculoDoAgendamento());
        assertEquals("XYZ9999", novo.placaVeiculoDoAgendamento());
    }

    @Test
    void agendamentoPendenteNaoBloqueiaHorarioDoResponsavel() {
        prepararService();
        var salvo = service.criar(request);
        assertEquals("AGENDADO", salvo.getStatusAgendamento());
        verify(repository, never()).contarSobreposicaoResponsavel(anyLong(), any(), any(), any());
    }

    @Test
    void confirmarPendenteRecusaHorarioJaConfirmadoParaResponsavel() {
        var responsavel = new Usuario(); responsavel.setId(9L);
        var agendamento = new Agendamento(); agendamento.setId(4L); agendamento.setStatusAgendamento("AGENDADO");
        agendamento.setResponsavel(responsavel);
        agendamento.setDataHoraInicio(java.time.LocalDateTime.of(2030, 10, 1, 9, 0));
        agendamento.setDataHoraFim(java.time.LocalDateTime.of(2030, 10, 1, 10, 0));
        when(repository.buscarParaCancelamento(4L)).thenReturn(Optional.of(agendamento));
        when(usuarios.buscarParaAtualizacao(9L)).thenReturn(Optional.of(responsavel));
        when(repository.contarSobreposicaoResponsavel(eq(9L), any(), any(), eq(4L))).thenReturn(1L);

        assertThrows(IllegalArgumentException.class, () -> service.confirmar(4L));
        assertEquals("AGENDADO", agendamento.getStatusAgendamento());
        verify(repository, never()).save(any());
    }
}
