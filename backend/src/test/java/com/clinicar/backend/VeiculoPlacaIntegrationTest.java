package com.clinicar.backend;

import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import com.clinicar.backend.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import jakarta.servlet.http.Cookie;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class VeiculoPlacaIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UsuarioRepository usuarios;
    @Autowired VeiculoRepository veiculos;
    @Autowired AuthSessionRepository sessoes;
    @Autowired SessionService sessions;
    @MockitoBean WhatsAppService whatsapp;
    Usuario admin;
    Veiculo primeiro, segundo;
    @BeforeEach void preparar() {
        admin = new Usuario(); admin.setNome("Administrador placa"); admin.setEmail(UUID.randomUUID()+"@example.com");
        admin.setTipo_do_acesso("ADMINISTRADOR"); admin.setStatus("ATIVO"); admin.setSenha("hash-teste");
        admin.setMfaAtivo(true); admin.setMfaTipo("TOTP"); admin.setMfaSecret("segredo-teste"); admin=usuarios.saveAndFlush(admin);
        primeiro=veiculos.saveAndFlush(veiculo("ABC1234")); segundo=veiculos.saveAndFlush(veiculo("DEF-1D23"));
    }
    Veiculo veiculo(String placa) {
        var v=new Veiculo(); v.setPlaca(placa); v.setFabricante("Toyota"); v.setModelo("Corolla"); v.setCor("Azul");
        v.setAnoModeloCombustivel("2025 Flex"); v.setIdProprietario(admin.getId()); return v;
    }
    Cookie cookie() { var c=sessions.criarSessaoCookie(admin.getId()); return new Cookie(c.getName(),c.getValue()); }
    String corpo(String placa) { return "{\"placa\":\""+placa+"\",\"fabricante\":\"Toyota\",\"modelo\":\"Corolla\",\"cor\":\"Azul\",\"anoModeloCombustivel\":\"2025 Flex\",\"idProprietario\":"+admin.getId()+"}"; }
    @AfterEach void limpar() {
        veiculos.findAll().stream().filter(v->Objects.equals(v.getIdProprietario(),admin.getId())).forEach(veiculos::delete);
        sessoes.findAll().stream().filter(s->s.getUsuarioId().equals(admin.getId())).forEach(sessoes::delete);
        usuarios.deleteById(admin.getId());
    }
    @Test void consultaNormalizaMascaraCaixaEIgnoraSomenteProprioVeiculo() throws Exception {
        var c=cookie();
        mvc.perform(get("/api/veiculo/verificar-placa").cookie(c).param("placa"," abc-1234 ")).andExpect(status().isOk())
            .andExpect(header().string("Cache-Control","no-store")).andExpect(jsonPath("$.cadastrada").value(true));
        mvc.perform(get("/api/veiculo/verificar-placa").cookie(c).param("placa","ABC1234").param("ignorarId",primeiro.getId().toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.cadastrada").value(false));
        mvc.perform(get("/api/veiculo/verificar-placa").cookie(c).param("placa","DEF1D23").param("ignorarId",primeiro.getId().toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.cadastrada").value(true));
        mvc.perform(get("/api/veiculo/verificar-placa").cookie(c).param("placa","ZZZ1A23"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.cadastrada").value(false));
    }
    @Test void consultaExigeAutenticacaoETamanhoValido() throws Exception {
        mvc.perform(get("/api/veiculo/verificar-placa").param("placa","ABC1234")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/veiculo/verificar-placa").cookie(cookie()).param("placa","ABC")).andExpect(status().isBadRequest());
        admin.setTipo_do_acesso("CLIENTE"); usuarios.saveAndFlush(admin);
        mvc.perform(get("/api/veiculo/verificar-placa").cookie(cookie()).param("placa","ABC1234")).andExpect(status().isForbidden());
    }
    @Test void cadastroDuplicadoEEdicaoParaPlacaDeOutroVeiculoRetornamMensagemClara() throws Exception {
        var c=cookie();
        mvc.perform(post("/api/veiculo").cookie(c).contentType(MediaType.APPLICATION_JSON).content(corpo("abc-1234")))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.mensagem").value("Placa já cadastrada anteriormente."));
        mvc.perform(put("/api/veiculo/"+primeiro.getId()).cookie(c).contentType(MediaType.APPLICATION_JSON).content(corpo("def1d23")))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.mensagem").value("Placa já cadastrada anteriormente."));
        assertEquals("ABC1234",veiculos.findById(primeiro.getId()).orElseThrow().getPlaca());
    }
    @Test void edicaoMantemPropriaPlacaECadastroLivreNormaliza() throws Exception {
        var c=cookie();
        mvc.perform(put("/api/veiculo/"+primeiro.getId()).cookie(c).contentType(MediaType.APPLICATION_JSON).content(corpo("abc-1234")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.placa").value("ABC1234"));
        mvc.perform(post("/api/veiculo").cookie(c).contentType(MediaType.APPLICATION_JSON).content(corpo("zzz-1a23")))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.placa").value("ZZZ1A23"));
    }
    @Test void duasTentativasConcorrentesCriamSomenteUmVeiculo() throws Exception {
        var c=cookie(); var executor=Executors.newFixedThreadPool(2); var partida=new CountDownLatch(1);
        try {
            var resultados=new ArrayList<Future<Integer>>();
            for(int i=0;i<2;i++) resultados.add(executor.submit(()->{ partida.await(); var resposta=mvc.perform(post("/api/veiculo")
                .cookie(c).contentType(MediaType.APPLICATION_JSON).content(corpo("ZZZ1A23"))).andReturn().getResponse();
                if (resposta.getStatus()==409) assertTrue(resposta.getContentAsString(java.nio.charset.StandardCharsets.UTF_8).contains("Placa já cadastrada anteriormente."));
                return resposta.getStatus(); }));
            partida.countDown(); var codigos=new ArrayList<Integer>(); for(var r:resultados) codigos.add(r.get(20,TimeUnit.SECONDS));
            Collections.sort(codigos); assertEquals(List.of(201,409),codigos);
            assertEquals(1,veiculos.findAll().stream().filter(v->v.getPlaca().equals("ZZZ1A23")).count());
        } finally { executor.shutdownNow(); }
    }
}
