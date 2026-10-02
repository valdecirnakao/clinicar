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
    @InjectMocks AgendamentoService service;
    Veiculo veiculo;
    AgendamentoRequest request;

    @BeforeEach
    void preparar() {
        veiculo = new Veiculo();
        veiculo.setId(7L);
        veiculo.setPlaca("ABC1234");
        veiculo.setFabricante("Toyota");
        veiculo.setModelo("Corolla");
        veiculo.setCor("Preto");
        veiculo.setAnoModeloCombustivel("2020/2021 Flex");
        request = new AgendamentoRequest();
        request.setIdCliente(1L);
        request.setIdVeiculo(7L);
        request.setIdServico(2L);
        request.setDataHoraInicio("2030-10-01T09:00:00");
        request.setDataHoraFim("2030-10-01T10:00:00");
    }

    void prepararService() {
        Usuario cliente = new Usuario();
        cliente.setId(1L);
        cliente.setTipo_do_acesso("CLIENTE");
        Servico servico = new Servico();
        servico.setId(2L);
        when(usuarios.findById(1L)).thenReturn(Optional.of(cliente));
        when(veiculos.findById(request.getIdVeiculo())).thenReturn(Optional.of(veiculo));
        when(servicos.findById(2L)).thenReturn(Optional.of(servico));
        when(repository.save(any(Agendamento.class))).thenAnswer(invocation -> invocation.getArgument(0));
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
        when(repository.findById(4L)).thenReturn(Optional.of(agendamento));
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
        veiculo.setPlaca("DEF5678");
        veiculo.setModelo("Civic");
        request.setIdVeiculo(8L);
        prepararService();
        when(repository.findById(4L)).thenReturn(Optional.of(agendamento));
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
}
