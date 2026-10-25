package com.clinicar.backend;

import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.UsuarioRepository;
import com.clinicar.backend.service.SessionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Dados sintéticos com rollback; não acessa a base de dados da oficina. */
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class SeletoresPaginadosIntegrationTest {
    @Autowired MockMvc mvc; @Autowired JdbcTemplate jdbc; @Autowired UsuarioRepository users;
    @Autowired SessionService sessions; @Autowired ObjectMapper json;
    private Usuario usuario(String perfil,String status) {
        var user=new Usuario();user.setNome("Teste seletor "+UUID.randomUUID());user.setEmail(UUID.randomUUID()+"@example.test");
        user.setSenha("hash-teste");user.setStatus(status);user.setTipo_do_acesso(perfil);user.setMfaAtivo(true);user.setMfaTipo("TOTP");user.setMfaSecret("teste");return users.saveAndFlush(user);
    }
    private Cookie cookie(Usuario user){var c=sessions.criarSessaoCookie(user.getId());return new Cookie(c.getName(),c.getValue());}
    @Test void seletorRestringePerfilSituacaoEPermissao() throws Exception {
        var admin=usuario("ADMINISTRADOR","ATIVO");var auth=cookie(admin);var ativo=usuario("COLABORADOR","ATIVO");
        usuario("COLABORADOR","INATIVO");var cliente=usuario("CLIENTE","ATIVO");
        var response=mvc.perform(get("/api/usuario/pagina").cookie(auth).param("selecao","true").param("perfis","COLABORADOR").param("status","ATIVO").param("busca",ativo.getNome()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(ativo.getId())).andExpect(jsonPath("$.totalElements").value(1)).andReturn().getResponse();
        assertEquals(0,json.readTree(response.getContentAsString()).path("resumo").size());
        mvc.perform(get("/api/usuario/pagina").cookie(auth).param("selecao","true").param("perfis","INVALIDO")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/usuario/pagina").cookie(cookie(cliente)).param("selecao","true")).andExpect(status().isForbidden());
        mvc.perform(get("/api/usuario/pagina").param("selecao","true")).andExpect(status().isUnauthorized());
    }
    @Test void fornecedorDeServicoIncluiCategoriaMistaMasExcluiFornecedorSomenteDePecas() throws Exception {
        var auth=cookie(usuario("ADMINISTRADOR","ATIVO"));var prefixo="Fornecedor-tipo-"+UUID.randomUUID()+"-";
        jdbc.update("INSERT INTO fornecedor (ativo,razao_social,item_fornecido) VALUES (true,?,?)",prefixo+"Pecas","Peças automotivas");
        jdbc.update("INSERT INTO fornecedor (ativo,razao_social,item_fornecido) VALUES (true,?,?)",prefixo+"Servicos","Serviços automotivos");
        jdbc.update("INSERT INTO fornecedor (ativo,razao_social,item_fornecido) VALUES (true,?,?)",prefixo+"Misto","Peças e serviços");
        jdbc.update("INSERT INTO fornecedor (ativo,razao_social,item_fornecido) VALUES (true,?,?)",prefixo+"Outros","Outros");
        var servicos=mvc.perform(get("/api/fornecedor/pagina").cookie(auth).param("selecao","true")
                .param("tipoFornecimento","SERVICOS").param("busca",prefixo).param("tamanho","1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2)).andReturn().getResponse();
        var pecas=mvc.perform(get("/api/fornecedor/pagina").cookie(auth).param("selecao","true")
                .param("tipoFornecimento","PECAS").param("busca",prefixo).param("tamanho","5"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2)).andReturn().getResponse();
        assertFalse(servicos.getContentAsString().contains(prefixo+"Pecas"));
        assertFalse(pecas.getContentAsString().contains(prefixo+"Servicos"));
        mvc.perform(get("/api/fornecedor/pagina").cookie(auth).param("tipoFornecimento","INVALIDO"))
                .andExpect(status().isBadRequest());
    }
    @Test void tabelaDoColaboradorMostraSomenteClientesMesmoComFiltroForcado() throws Exception {
        var colaborador=usuario("COLABORADOR","ATIVO");
        var cliente=usuario("CLIENTE","ATIVO");
        var outro=usuario("ADMINISTRADOR","ATIVO");
        var resposta=mvc.perform(get("/api/usuario/pagina").cookie(cookie(colaborador))
                .param("tipo_do_acesso","ADMINISTRADOR").param("perfis","ADMINISTRADOR"))
                .andExpect(status().isOk()).andReturn().getResponse();
        var conteudo=json.readTree(resposta.getContentAsString()).path("content");
        assertTrue(conteudo.isArray());
        for (var item:conteudo) assertEquals("CLIENTE",item.path("tipo_do_acesso").asText());
        assertTrue(java.util.stream.StreamSupport.stream(conteudo.spliterator(),false)
                .anyMatch(item->item.path("id").asLong()==cliente.getId()));
        assertFalse(java.util.stream.StreamSupport.stream(conteudo.spliterator(),false)
                .anyMatch(item->item.path("id").asLong()==outro.getId()));
    }
    @Test void buscaPaginadaLimitaTransferenciaEEncontraRegistroForaDaPrimeiraPagina() throws Exception {
        var auth=cookie(usuario("ADMINISTRADOR","ATIVO"));var prefixo="Bench-"+UUID.randomUUID()+"-";
        for(int i=0;i<1000;i++)jdbc.update("INSERT INTO peca (nome,fabricante,tipo,unidade) VALUES (?,'Fabricante teste','Peça Automotiva','Unidade')",prefixo+String.format("%04d",i));
        var primeira=mvc.perform(get("/api/peca/pagina").cookie(auth).param("selecao","true").param("busca",prefixo).param("tamanho","5"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(5)).andExpect(jsonPath("$.totalElements").value(1000)).andExpect(jsonPath("$.totalPages").value(200)).andReturn().getResponse();
        mvc.perform(get("/api/peca/pagina").cookie(auth).param("selecao","true").param("busca",prefixo+"0999").param("tamanho","5"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].nome").value(prefixo+"0999")).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/peca/pagina").cookie(auth).param("selecao","true").param("pagina","199").param("tamanho","5").param("busca",prefixo))
            .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(5));
        var temposCompletos=new ArrayList<Long>();var temposPaginas=new ArrayList<Long>();int bytesCompletos=0;
        for(int i=0;i<23;i++){
            long inicio=System.nanoTime();var todos=mvc.perform(get("/api/peca").cookie(auth)).andExpect(status().isOk()).andReturn().getResponse();long completo=System.nanoTime()-inicio;
            inicio=System.nanoTime();mvc.perform(get("/api/peca/pagina").cookie(auth).param("selecao","true").param("tamanho","5").param("busca",prefixo)).andExpect(status().isOk());long limitado=System.nanoTime()-inicio;
            if(i>=3){temposCompletos.add(completo);temposPaginas.add(limitado);}bytesCompletos=todos.getContentAsByteArray().length;
        }
        Collections.sort(temposCompletos);Collections.sort(temposPaginas);int bytesPagina=primeira.getContentAsByteArray().length;assertTrue(bytesPagina*50<bytesCompletos);
        System.out.printf(Locale.ROOT,"SELETORES_BENCH registros=1000 amostras=20 catalogo_bytes=%d pagina_bytes=%d catalogo_p50_ms=%.3f catalogo_p95_ms=%.3f pagina_p50_ms=%.3f pagina_p95_ms=%.3f%n",
            bytesCompletos,bytesPagina,temposCompletos.get(9)/1e6,temposCompletos.get(18)/1e6,temposPaginas.get(9)/1e6,temposPaginas.get(18)/1e6);
    }
}
