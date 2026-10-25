package com.clinicar.backend.controller;

import com.clinicar.backend.dto.AgendamentoRequest;
import com.clinicar.backend.dto.AgendamentoPecaPrevistaRequest;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.mapper.AgendamentoMapper;
import com.clinicar.backend.model.Agendamento;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.AgendamentoRepository;
import com.clinicar.backend.service.AgendamentoPecaPrevistaService;
import com.clinicar.backend.service.AgendamentoService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ClienteAgendamentoControllerTest {
    private final AgendamentoService service = mock(AgendamentoService.class);
    private final AgendamentoRepository repository = mock(AgendamentoRepository.class);
    private final AgendamentoMapper mapper = mock(AgendamentoMapper.class);
    private final AgendamentoPecaPrevistaService pecas = mock(AgendamentoPecaPrevistaService.class);
    private final EntityManager em = mock(EntityManager.class);
    private final ClienteAgendamentoController controller = new ClienteAgendamentoController(service, repository, mapper, pecas, em);

    @Test
    void catalogoDoClienteIncluiDuracaoDoServico() {
        var servico = new Servico(); servico.setId(3L); servico.setNome("Revisão");
        servico.setDuracaoEstimada(new java.math.BigDecimal("1.50")); servico.setUnidadeDuracao("HORA");
        TypedQuery<Servico> consultaServicos = mock(TypedQuery.class);
        TypedQuery<Usuario> consultaUsuarios = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(Servico.class))).thenReturn(consultaServicos);
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(consultaUsuarios);
        when(consultaServicos.getResultList()).thenReturn(List.of(servico));
        when(consultaUsuarios.getResultList()).thenReturn(List.of());

        var catalogo = controller.catalogos(cliente(7L));

        assertEquals(new java.math.BigDecimal("1.50"), catalogo.servicos().getFirst().duracaoEstimada());
        assertEquals("HORA", catalogo.servicos().getFirst().unidadeDuracao());
    }

    @Test
    void criacaoUsaTitularDaSessaoESempreComecaSemConfirmacao() {
        var servico = new Servico(); servico.setAtivo(true);
        var responsavel = new Usuario(); responsavel.setStatus("ATIVO"); responsavel.setTipo_do_acesso("COLABORADOR");
        when(em.find(Servico.class, 3L)).thenReturn(servico);
        when(em.find(Usuario.class, 5L)).thenReturn(responsavel);
        var salvo = new Agendamento(); salvo.setId(90L);
        when(service.criar(any())).thenReturn(salvo);
        when(pecas.listarPorAgendamento(90L)).thenReturn(List.of());
        var pedido = new AgendamentoRequest();
        pedido.setIdCliente(999L); pedido.setIdVeiculo(2L); pedido.setIdServico(3L); pedido.setIdResponsavel(5L);
        pedido.setIdFornecedor(8L); pedido.setTipoExecucao("EXTERNA");
        pedido.setStatusAgendamento("CONFIRMADO"); pedido.setConfirmado(true);
        pedido.setSugestaoMateriaisCliente("Prefiro óleo da marca X.");
        pedido.setPreferenciaExecucaoCliente("Prefiro execução na oficina.");

        controller.criar(cliente(7L), pedido);

        verify(service).criar(argThat(req -> req.getIdCliente().equals(7L)
                && "AGENDADO".equals(req.getStatusAgendamento()) && Boolean.FALSE.equals(req.getConfirmado())
                && "SITE".equals(req.getCanalOrigem()) && req.getPecasPrevistas() == null
                && req.getIdResponsavel() == null && req.getIdFornecedor() == null
                && "PENDENTE".equals(req.getTipoExecucao())
                && "Prefiro execução na oficina.".equals(req.getPreferenciaExecucaoCliente())
                && "Prefiro óleo da marca X.".equals(req.getSugestaoMateriaisCliente())));
    }

    @Test
    void clienteNaoPodeTransformarSugestaoEmPecaPrevistaReservavel() {
        var servico = new Servico(); servico.setAtivo(true);
        var responsavel = new Usuario(); responsavel.setStatus("ATIVO"); responsavel.setTipo_do_acesso("COLABORADOR");
        when(em.find(Servico.class, 3L)).thenReturn(servico);
        when(em.find(Usuario.class, 5L)).thenReturn(responsavel);
        var pedido = new AgendamentoRequest();
        pedido.setIdVeiculo(2L); pedido.setIdServico(3L); pedido.setIdResponsavel(5L);
        var peca = new AgendamentoPecaPrevistaRequest(); peca.setIdPeca(4L); peca.setQuantidade("3");
        pedido.setPecasPrevistas(List.of(peca));

        assertThrows(IllegalArgumentException.class, () -> controller.criar(cliente(7L), pedido));
        verify(service, never()).criar(any());
    }

    @Test
    void edicaoDeOutroClienteOuDeConfirmadoEhRecusada() {
        var existente = new Agendamento(); existente.setId(90L);
        var titular = new Usuario(); titular.setId(8L); existente.setCliente(titular);
        when(repository.buscarParaCancelamento(90L)).thenReturn(Optional.of(existente));
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> controller.atualizar(cliente(7L), 90L, new AgendamentoRequest())).getStatusCode().value());
        titular.setId(7L); existente.setStatusAgendamento("CONFIRMADO");
        assertThrows(IllegalArgumentException.class,
                () -> controller.atualizar(cliente(7L), 90L, new AgendamentoRequest()));
        verify(service, never()).atualizar(anyLong(), any());
    }

    @Test
    void edicaoPendenteNasUltimas24HorasEhRecusada() {
        var existente = new Agendamento(); existente.setId(90L);
        var titular = new Usuario(); titular.setId(7L); existente.setCliente(titular);
        existente.setStatusAgendamento("AGENDADO");
        existente.setDataHoraInicio(java.time.LocalDateTime.now().plusHours(23));
        when(repository.buscarParaCancelamento(90L)).thenReturn(Optional.of(existente));
        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> controller.atualizar(cliente(7L), 90L, new AgendamentoRequest())).getStatusCode().value());
        verify(service, never()).atualizar(anyLong(), any());
    }

    @Test
    void perfilNaoClienteEhRecusado() {
        var sessao = cliente(7L); sessao.setTipo_do_acesso("COLABORADOR");
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> controller.catalogos(sessao)).getStatusCode().value());
    }

    @Test
    void cancelamentoUsaTitularDaSessao() {
        var salvo = new Agendamento(); salvo.setId(90L);
        when(service.cancelarPeloCliente(90L, 7L)).thenReturn(salvo);
        when(pecas.listarPorAgendamento(90L)).thenReturn(List.of());
        controller.cancelar(cliente(7L), 90L);
        verify(service).cancelarPeloCliente(90L, 7L);
    }

    @Test
    void confirmacaoEReagendamentoUsamTitularDaSessao() {
        var salvo = new Agendamento(); salvo.setId(90L);
        when(service.confirmarPeloCliente(90L, 7L)).thenReturn(salvo);
        when(pecas.listarPorAgendamento(90L)).thenReturn(List.of());
        controller.confirmar(cliente(7L), 90L);
        verify(service).confirmarPeloCliente(90L, 7L);

        var servico = new Servico(); servico.setAtivo(true);
        var responsavel = new Usuario(); responsavel.setStatus("ATIVO"); responsavel.setTipo_do_acesso("COLABORADOR");
        when(em.find(Servico.class, 3L)).thenReturn(servico);
        when(em.find(Usuario.class, 5L)).thenReturn(responsavel);
        when(service.reagendarPeloCliente(eq(90L), eq(7L), any())).thenReturn(salvo);
        var pedido = new AgendamentoRequest();
        pedido.setIdCliente(999L); pedido.setIdVeiculo(2L); pedido.setIdServico(3L); pedido.setIdResponsavel(5L);
        controller.reagendar(cliente(7L), 90L, pedido);
        verify(service).reagendarPeloCliente(eq(90L), eq(7L), argThat(req -> 7L == req.getIdCliente()));
    }

    private UsuarioResponse cliente(Long id) {
        var sessao = new UsuarioResponse(); sessao.setId(id); sessao.setStatus("ATIVO"); sessao.setTipo_do_acesso("CLIENTE");
        return sessao;
    }
}
