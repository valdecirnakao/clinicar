package com.clinicar.backend.service;

import com.clinicar.backend.dto.AgendamentoRequest;
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
class AgendamentoModalidadeExecucaoTest {
    @Mock AtendimentoService atendimentos;
    @Mock AgendamentoRepository agendamentos;
    @Mock UsuarioRepository usuarios;
    @Mock VeiculoRepository veiculos;
    @Mock ServicoRepository servicos;
    @Mock FornecedorRepository fornecedores;
    @Mock AgendamentoPecaPrevistaService pecas;
    @Mock ReservaEstoqueAgendamentoService reservas;
    @Mock AvisosServicoWhatsappService avisosWhatsapp;
    @Mock NotificacaoOutboxService notificacoes;
    @InjectMocks AgendamentoService service;
    AgendamentoRequest request;

    @BeforeEach
    void preparar() {
        request = new AgendamentoRequest();
        request.setIdCliente(1L); request.setIdVeiculo(2L); request.setIdServico(3L);
        request.setDataHoraInicio("2030-10-01T09:00:00"); request.setDataHoraFim("2030-10-01T10:00:00");
        var cliente = new Usuario(); cliente.setId(1L); cliente.setTipo_do_acesso("CLIENTE");
        var veiculo = new Veiculo(); veiculo.setId(2L); veiculo.setIdProprietario(1L); veiculo.setPlaca("ABC1234");
        var servico = new Servico(); servico.setId(3L);
        lenient().when(usuarios.findById(1L)).thenReturn(Optional.of(cliente));
        lenient().when(veiculos.findById(2L)).thenReturn(Optional.of(veiculo));
        lenient().when(servicos.findById(3L)).thenReturn(Optional.of(servico));
        lenient().when(agendamentos.save(any(Agendamento.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void execucaoInternaExigeResponsavelESemFornecedor() {
        request.setTipoExecucao("INTERNA");
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service.criar(request)).getMessage().contains("responsável"));
        request.setIdResponsavel(9L); request.setIdFornecedor(4L);
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service.criar(request)).getMessage().contains("fornecedor externo"));
    }

    @Test
    void execucaoExternaExigeFornecedorDeServicosAtivo() {
        request.setTipoExecucao("EXTERNA");
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service.criar(request)).getMessage().contains("fornecedor"));
        request.setIdFornecedor(4L);
        var fornecedor = new Fornecedor(); fornecedor.setId(4L); fornecedor.setItemFornecido("Peças automotivas");
        when(fornecedores.findById(4L)).thenReturn(Optional.of(fornecedor));
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service.criar(request)).getMessage().contains("serviços"));
        fornecedor.setItemFornecido("Serviços automotivos"); fornecedor.setAtivo(false);
        assertThrows(IllegalArgumentException.class, () -> service.criar(request));
        fornecedor.setAtivo(true);
        var salvo = service.criar(request);
        assertEquals("EXTERNA", salvo.getTipoExecucao());
        assertEquals(4L, salvo.getFornecedor().getId());
        assertNull(salvo.getResponsavel());
    }

    @Test
    void execucaoInternaNaoHerdaFornecedorDoCatalogo() {
        request.setTipoExecucao("INTERNA"); request.setIdResponsavel(9L);
        var fornecedorCatalogo = new Fornecedor(); fornecedorCatalogo.setId(4L);
        var servicoCatalogo = new Servico(); servicoCatalogo.setId(3L); servicoCatalogo.setFornecedor(fornecedorCatalogo);
        when(servicos.findById(3L)).thenReturn(Optional.of(servicoCatalogo));
        var responsavel = new Usuario(); responsavel.setId(9L); responsavel.setTipo_do_acesso("COLABORADOR"); responsavel.setStatus("ATIVO");
        when(usuarios.findById(9L)).thenReturn(Optional.of(responsavel));
        var salvo = service.criar(request);
        assertEquals("INTERNA", salvo.getTipoExecucao());
        assertNull(salvo.getFornecedor());
        assertEquals(9L, salvo.getResponsavel().getId());
    }

    @Test
    void pedidoDoClientePersistePreferenciaSemDefinirExecutor() {
        request.setTipoExecucao("PENDENTE");
        request.setPreferenciaExecucaoCliente("  Prefiro execução na oficina.  ");
        var salvo = service.criar(request);
        assertEquals("PENDENTE", salvo.getTipoExecucao());
        assertNull(salvo.getResponsavel());
        assertNull(salvo.getFornecedor());
        assertEquals("Prefiro execução na oficina.", salvo.getPreferenciaExecucaoCliente());
        request.setPreferenciaExecucaoCliente("x".repeat(1001));
        assertThrows(IllegalArgumentException.class, () -> service.criar(request));
    }
}
