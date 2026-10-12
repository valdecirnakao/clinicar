package com.clinicar.backend;

import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import com.clinicar.backend.service.SessionService;
import com.clinicar.backend.service.WhatsAppService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class VeiculoExclusaoIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired VeiculoRepository veiculos;
    @Autowired UsuarioRepository usuarios;
    @Autowired AuthSessionRepository sessoes;
    @Autowired AgendamentoRepository agendamentos;
    @Autowired ServicoRepository servicos;
    @Autowired SessionService sessions;
    @MockitoBean WhatsAppService whatsapp;
    Usuario admin, dono;
    Veiculo veiculo;
    Agendamento agendamento;
    Servico servico;
    Usuario usuario(String perfil) {
        var u = new Usuario(); u.setNome("Usuário teste"); u.setEmail(UUID.randomUUID()+"@example.test");
        u.setTipo_do_acesso(perfil); u.setStatus("ATIVO"); u.setSenha("hash-teste");
        u.setMfaAtivo(true); u.setMfaTipo("TOTP"); u.setMfaSecret("segredo-falso-de-teste");
        return usuarios.saveAndFlush(u);
    }
    @BeforeEach void preparar() {
        admin = usuario("ADMINISTRADOR"); dono = usuario("CLIENTE");
        dono.setNome_social("Nome social"); dono.setTelefone("11999991111"); usuarios.saveAndFlush(dono);
        veiculo = new Veiculo(); veiculo.setPlaca("ABC1234"); veiculo.setFabricante("Toyota"); veiculo.setModelo("Corolla");
        veiculo.setCor("Preto"); veiculo.setAnoModeloCombustivel("2026 Flex"); veiculo.setIdProprietario(dono.getId());
        veiculo = veiculos.saveAndFlush(veiculo);
    }
    Cookie cookie(Usuario u) { var c = sessions.criarSessaoCookie(u.getId()); return new Cookie(c.getName(),c.getValue()); }
    @AfterEach void limpar() {
        if (agendamento != null) agendamentos.deleteById(agendamento.getId());
        if (servico != null) servicos.deleteById(servico.getId());
        if (veiculos.existsById(veiculo.getId())) veiculos.deleteById(veiculo.getId());
        sessoes.findAll().stream().filter(s -> s.getUsuarioId().equals(admin.getId()) || s.getUsuarioId().equals(dono.getId())).forEach(sessoes::delete);
        usuarios.deleteById(dono.getId()); usuarios.deleteById(admin.getId());
    }
    @Test void excluiAntesDeEnviarEUsaDadosAnterioresSemReenviarNaRepeticao() throws Exception {
        doAnswer(call -> { assertFalse(veiculos.existsById(veiculo.getId())); return null; })
                .when(whatsapp).enviarAlertaExclusaoVeiculo(anyString(),anyString(),anyString());
        var c = cookie(admin);
        mvc.perform(delete("/api/veiculo/"+veiculo.getId()).cookie(c)).andExpect(status().isOk())
                .andExpect(jsonPath("$.notificacaoWhatsapp").value("ENVIADA"))
                .andExpect(header().string("Cache-Control", "no-store"));
        verify(whatsapp).enviarAlertaExclusaoVeiculo("11999991111","Nome social","Toyota Corolla - Placa ABC-1234");
        verify(whatsapp).usaFila();
        mvc.perform(delete("/api/veiculo/"+veiculo.getId()).cookie(c)).andExpect(status().isNotFound());
        verifyNoMoreInteractions(whatsapp);
    }
    @Test void falhaDaMetaNaoDesfazExclusaoERetornaAvisoSemDetalhesTecnicos() throws Exception {
        doThrow(new IllegalStateException("Falha simulada da Meta")).when(whatsapp).enviarAlertaExclusaoVeiculo(anyString(),anyString(),anyString());
        mvc.perform(delete("/api/veiculo/"+veiculo.getId()).cookie(cookie(admin))).andExpect(status().isOk())
                .andExpect(jsonPath("$.notificacaoWhatsapp").value("NAO_ENVIADA"));
        assertFalse(veiculos.existsById(veiculo.getId()));
    }
    @Test void semTelefoneExcluiComAvisoESemChamadaExterna() throws Exception {
        dono.setTelefone(null); usuarios.saveAndFlush(dono);
        mvc.perform(delete("/api/veiculo/"+veiculo.getId()).cookie(cookie(admin))).andExpect(status().isOk())
                .andExpect(jsonPath("$.notificacaoWhatsapp").value("NAO_ENVIADA"));
        verifyNoInteractions(whatsapp); assertFalse(veiculos.existsById(veiculo.getId()));
    }
    @Test void exigeAdministradorENaoEnviaSeNaoAutorizado() throws Exception {
        mvc.perform(delete("/api/veiculo/"+veiculo.getId())).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/veiculo/"+veiculo.getId()).cookie(cookie(dono))).andExpect(status().isForbidden());
        assertTrue(veiculos.existsById(veiculo.getId())); verifyNoInteractions(whatsapp);
    }
    @Test void vinculoImpedeExclusaoEPreservaVeiculoSemNotificar() throws Exception {
        servico = new Servico(); servico.setNome("Revisão"); servico.setCategoria("REVISÃO"); servico.setTipoDoPrestador("INTERNO");
        servico.setDuracaoEstimada(BigDecimal.ONE); servico.setUnidadeDuracao("HORA"); servico.setValorBase(BigDecimal.ONE);
        servico.setUnidadeCobranca("SERVICO"); servico = servicos.saveAndFlush(servico);
        agendamento = new Agendamento(); agendamento.setCodigoAgendamento("AG-"+UUID.randomUUID());
        agendamento.setCliente(dono); agendamento.setVeiculo(veiculo); agendamento.setServico(servico);
        agendamento.setDataHoraInicio(LocalDateTime.now()); agendamento.setDataHoraFim(LocalDateTime.now().plusHours(1));
        agendamento.setDuracaoEstimadaMinutos(60); agendamento = agendamentos.saveAndFlush(agendamento);
        mvc.perform(delete("/api/veiculo/"+veiculo.getId()).cookie(cookie(admin))).andExpect(status().isConflict());
        assertTrue(veiculos.existsById(veiculo.getId())); verifyNoInteractions(whatsapp);
    }
}
