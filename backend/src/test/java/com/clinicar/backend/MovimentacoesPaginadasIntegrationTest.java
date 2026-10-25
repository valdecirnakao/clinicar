package com.clinicar.backend;

import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.UsuarioRepository;
import com.clinicar.backend.service.SessionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class MovimentacoesPaginadasIntegrationTest {
    @Autowired EntityManager em;@Autowired MockMvc mvc;@Autowired UsuarioRepository users;@Autowired SessionService sessions;@Autowired ObjectMapper json;
    Usuario admin;EstoquePeca estoque;Cookie auth;
    @BeforeEach void preparar(){
        admin=new Usuario();admin.setNome("Responsável teste");admin.setEmail(UUID.randomUUID()+"@example.test");admin.setSenha("hash-teste");admin.setStatus("ATIVO");admin.setTipo_do_acesso("ADMINISTRADOR");admin.setMfaAtivo(true);admin.setMfaTipo("TOTP");admin.setMfaSecret("teste");admin=users.saveAndFlush(admin);
        var cookie=sessions.criarSessaoCookie(admin.getId());auth=new Cookie(cookie.getName(),cookie.getValue());
        var peca=new Peca();peca.setNome("Peça "+UUID.randomUUID());em.persist(peca);
        var local=new LocalEstoque();local.setNome("Local "+UUID.randomUUID());em.persist(local);
        estoque=new EstoquePeca();estoque.setPeca(peca);estoque.setLocalEstoque(local);estoque.setQuantidadeAtual(new BigDecimal("100"));estoque.setCustoMedio(new BigDecimal("30"));em.persist(estoque);em.flush();
    }
    MovimentacaoEstoquePeca movimento(String tipo,String origem,String quantidade,Long original){
        var m=new MovimentacaoEstoquePeca();m.setEstoquePeca(estoque);m.setPeca(estoque.getPeca());m.setTipoMovimento(tipo);m.setOrigem(origem);m.setQuantidade(new BigDecimal(quantidade));m.setSaldoAnterior(new BigDecimal("100"));m.setSaldoPosterior(new BigDecimal("90"));m.setValorUnitario(new BigDecimal("30"));m.setIdMovimentacaoOrigem(original);m.setNomeUsuario(admin.getNome());m.setIdUsuario(admin.getId());m.setCriadoEm(LocalDateTime.of(2026,10,1,10,0));em.persist(m);em.flush();return m;
    }
    String url(){return "/api/estoque-pecas/"+estoque.getId()+"/movimentacoes";}
    void saldo(long id,String campo,String esperado) throws Exception {
        var response=mvc.perform(get(url()+"/"+id).cookie(auth)).andExpect(status().isOk()).andReturn().getResponse();
        assertEquals(0,new BigDecimal(esperado).compareTo(json.readTree(response.getContentAsString()).path(campo).decimalValue()));
    }
    @Test void paginasEstaveisPreservamSaldoContagemEAutor() throws Exception {
        var ids=new ArrayList<Long>();for(int i=0;i<23;i++)ids.add(movimento("ENTRADA","BONIFICACAO","1",null).getId());Collections.reverse(ids);
        var encontrados=new ArrayList<Long>();
        for(int pagina=0;pagina<5;pagina++){
            var response=mvc.perform(get(url()+"/pagina").cookie(auth).param("pagina",Integer.toString(pagina)).param("tamanho","5")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(23)).andReturn().getResponse();
            var content=json.readTree(response.getContentAsString()).path("content");assertTrue(content.size()<=5);
            for(var item:content){encontrados.add(item.path("id").longValue());assertEquals(admin.getId(),item.path("idUsuario").longValue());assertEquals(0,new BigDecimal("90").compareTo(item.path("saldoPosterior").decimalValue()));}
        }
        assertEquals(ids,encontrados);assertEquals(new BigDecimal("100"),estoque.getQuantidadeAtual());
        mvc.perform(get(url()+"/pagina").cookie(auth).param("pagina","999")).andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(0)).andExpect(jsonPath("$.totalElements").value(23));
    }
    @Test void saldoIncluiVinculosForaDaPaginaECorrecaoDaDevolucaoAoFornecedor() throws Exception {
        var recebimento=movimento("ENTRADA","COMPRA","10",null);
        var devolucao=movimento("SAIDA","DEVOLUCAO_FORNECEDOR","4",recebimento.getId());
        movimento("AJUSTE_ENTRADA","CORRECAO_LANCAMENTO","1",devolucao.getId());
        movimento("AJUSTE_ENTRADA","CORRECAO_LANCAMENTO","2",recebimento.getId());
        for(int i=0;i<25;i++)movimento("ENTRADA","BONIFICACAO","1",null);
        saldo(recebimento.getId(),"quantidadeDisponivelOriginal","9");saldo(devolucao.getId(),"quantidadeDisponivelOriginal","3");saldo(devolucao.getId(),"quantidadeDisponivelRecebimento","9");
        mvc.perform(get(url()+"/pagina").cookie(auth).param("finalidade","FORNECEDOR").param("tamanho","1")).andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1));
    }
    @Test void saidaDisponivelConsideraDevolucaoECorrecaoEExcluiSaldoEsgotado() throws Exception {
        var saida=movimento("SAIDA","CONSUMO_INTERNO","6",null);
        movimento("ENTRADA","DEVOLUCAO_NAO_UTILIZADA","2",saida.getId());movimento("AJUSTE_SAIDA","CORRECAO_LANCAMENTO","1",saida.getId());saldo(saida.getId(),"quantidadeDisponivelOriginal","5");
        var esgotada=movimento("SAIDA","CONSUMO_INTERNO","2",null);movimento("ENTRADA","DEVOLUCAO_NAO_UTILIZADA","2",esgotada.getId());
        mvc.perform(get(url()+"/pagina").cookie(auth).param("finalidade","DEVOLUCAO").param("tamanho","1")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].id").value(saida.getId()));
    }
    @Test void buscaELimitesEPermissoesSaoValidados() throws Exception {
        var m=movimento("ENTRADA","COMPRA","1",null);
        mvc.perform(get(url()+"/pagina").cookie(auth).param("busca","responsável")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get(url()+"/pagina").cookie(auth).param("tamanho","101")).andExpect(status().isBadRequest());
        mvc.perform(get(url()+"/pagina").cookie(auth).param("pagina","-1")).andExpect(status().isBadRequest());
        mvc.perform(get(url()+"/pagina").cookie(auth).param("finalidade","INVALIDA")).andExpect(status().isBadRequest());
        mvc.perform(get(url()+"/"+(m.getId()+999)).cookie(auth)).andExpect(status().isNotFound());
        mvc.perform(get(url()+"/pagina")).andExpect(status().isUnauthorized());
        admin.setTipo_do_acesso("CLIENTE");users.saveAndFlush(admin);mvc.perform(get(url()+"/pagina").cookie(auth)).andExpect(status().isForbidden());
    }
    @Test void colaboradorConsultaHistoricoDoEstoqueSemAcessoADevolucoesAdministrativas() throws Exception {
        var movimento=movimento("ENTRADA","COMPRA","1",null);
        admin.setTipo_do_acesso("COLABORADOR");users.saveAndFlush(admin);
        mvc.perform(get(url()+"/pagina").cookie(auth)).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(movimento.getId()));
        mvc.perform(get(url()+"/"+movimento.getId()).cookie(auth)).andExpect(status().isOk());
        mvc.perform(get("/api/atendimento/1/devolucoes/pagina").cookie(auth)).andExpect(status().isForbidden());
    }
    @Test void devolucaoDeAtendimentoIncluiBaixaAntigaPorDocumentoECalculaSaldoCompleto() throws Exception {
        var veiculo=new Veiculo();veiculo.setPlaca("TST"+java.util.concurrent.ThreadLocalRandom.current().nextInt(1000,9999));veiculo.setFabricante("Teste");veiculo.setModelo("Teste");veiculo.setCor("Azul");veiculo.setAnoModeloCombustivel("2026 Flex");veiculo.setIdProprietario(admin.getId());em.persist(veiculo);
        var servico=new Servico();servico.setNome("Serviço "+UUID.randomUUID());servico.setCategoria("Motor");servico.setTipoDoPrestador("INTERNO");servico.setDuracaoEstimada(BigDecimal.ONE);servico.setUnidadeDuracao("HORA");servico.setValorBase(BigDecimal.TEN);servico.setUnidadeCobranca("SERVICO");em.persist(servico);
        var agenda=new Agendamento();agenda.setCodigoAgendamento("AG-"+UUID.randomUUID());agenda.setCliente(admin);agenda.setVeiculo(veiculo);agenda.setServico(servico);agenda.setDataHoraInicio(LocalDateTime.of(2026,10,1,10,0));agenda.setDataHoraFim(LocalDateTime.of(2026,10,1,11,0));agenda.setDuracaoEstimadaMinutos(60);em.persist(agenda);
        var atendimento=new Atendimento();atendimento.setCodigoAtendimento("AT-"+UUID.randomUUID());atendimento.setAgendamento(agenda);atendimento.setCliente(admin);atendimento.setVeiculo(veiculo);atendimento.setServico(servico);atendimento.setDataEntrada(LocalDateTime.of(2026,10,1,10,0));em.persist(atendimento);em.flush();
        var saida=movimento("SAIDA","ATENDIMENTO","6",null);saida.setDocumentoReferencia(atendimento.getCodigoAtendimento());em.flush();
        var retorno=movimento("ENTRADA","DEVOLUCAO_ATENDIMENTO","2",saida.getId());retorno.setIdAtendimento(atendimento.getId());em.flush();
        movimento("SAIDA","CONSUMO_INTERNO","3",null);
        String base="/api/atendimento/"+atendimento.getId()+"/devolucoes";
        mvc.perform(get(base+"/pagina").cookie(auth).param("finalidade","ATENDIMENTO").param("tamanho","1")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].id").value(saida.getId()));
        var resposta=mvc.perform(get(base+"/"+saida.getId()).cookie(auth)).andExpect(status().isOk()).andReturn().getResponse();
        var dados=json.readTree(resposta.getContentAsString());assertEquals(0,new BigDecimal("4").compareTo(dados.path("quantidadeDisponivelOriginal").decimalValue()));assertEquals(0,new BigDecimal("2").compareTo(dados.path("quantidadeDevolvida").decimalValue()));
    }
}
