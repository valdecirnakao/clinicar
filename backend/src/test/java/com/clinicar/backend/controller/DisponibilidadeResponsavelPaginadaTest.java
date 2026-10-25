package com.clinicar.backend.controller;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.model.Agendamento;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.model.Veiculo;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DisponibilidadeResponsavelPaginadaTest {
    @Autowired CadastroPaginadoController controller;
    @Autowired EntityManager em;

    @Test
    void agendamentoPendenteNaoRetiraResponsavelDaPesquisaMasConfirmadoRetira() {
        var responsavel = new Usuario();
        responsavel.setNome("Caio Teste");
        responsavel.setEmail("caio.disponibilidade.teste@example.test");
        responsavel.setTipo_do_acesso("COLABORADOR");
        responsavel.setStatus("ATIVO");
        em.persist(responsavel);

        var cliente = new Usuario();
        cliente.setNome("Cliente Teste");
        cliente.setEmail("cliente.disponibilidade.teste@example.test");
        cliente.setTipo_do_acesso("CLIENTE");
        cliente.setStatus("ATIVO");
        em.persist(cliente);

        var veiculo = new Veiculo();
        veiculo.setPlaca("TST1A23");
        veiculo.setFabricante("Teste");
        veiculo.setModelo("Modelo");
        veiculo.setCor("Azul");
        veiculo.setAnoModeloCombustivel("2026 Flex");
        veiculo.setIdProprietario(cliente.getId());
        em.persist(veiculo);

        var servico = new Servico();
        servico.setNome("Serviço de disponibilidade");
        servico.setCategoria("Teste");
        servico.setTipoDoPrestador("COLABORADOR");
        servico.setDuracaoEstimada(BigDecimal.ONE);
        servico.setUnidadeDuracao("HORA");
        servico.setValorBase(BigDecimal.TEN);
        servico.setUnidadeCobranca("SERVICO");
        em.persist(servico);

        var inicio = LocalDateTime.of(2030, 10, 22, 10, 0);
        var fim = inicio.plusHours(1);
        var agendamento = new Agendamento();
        agendamento.setCodigoAgendamento("AGD-DISPONIBILIDADE-TESTE");
        agendamento.setCliente(cliente);
        agendamento.setVeiculo(veiculo);
        agendamento.setServico(servico);
        agendamento.setResponsavel(responsavel);
        agendamento.setDataHoraInicio(inicio);
        agendamento.setDataHoraFim(fim);
        agendamento.setDuracaoEstimadaMinutos(60);
        em.persist(agendamento);
        em.flush();

        assertEquals(1L, totalDisponivel(inicio, fim));
        agendamento.setStatusAgendamento("REAGENDADO");
        em.flush();
        assertEquals(1L, totalDisponivel(inicio, fim));
        agendamento.setStatusAgendamento("CONFIRMADO");
        em.flush();
        assertEquals(0L, totalDisponivel(inicio, fim));
        agendamento.setStatusAgendamento("EM_ATENDIMENTO");
        em.flush();
        assertEquals(0L, totalDisponivel(inicio, fim));
    }

    private long totalDisponivel(LocalDateTime inicio, LocalDateTime fim) {
        var usuarioLogado = new UsuarioResponse();
        usuarioLogado.setTipo_do_acesso("COLABORADOR");
        usuarioLogado.setStatus("ATIVO");
        var request = new MockHttpServletRequest("GET", "/api/usuario/pagina");
        request.setAttribute("usuarioLogado", usuarioLogado);
        var params = Map.of("selecao", "true", "perfis", "COLABORADOR",
                "status", "ATIVO", "inicioDisponivel", inicio.toString(),
                "fimDisponivel", fim.toString());
        var resultado = controller.listar(request, new MockHttpServletResponse(),
                0, 5, "Caio Teste", "id", false, params);
        return ((Number) resultado.get("totalElements")).longValue();
    }
}
