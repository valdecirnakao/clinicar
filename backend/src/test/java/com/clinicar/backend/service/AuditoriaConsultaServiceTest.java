package com.clinicar.backend.service;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.repository.AuditoriaConsultaRepository;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.sql.Timestamp;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class AuditoriaConsultaServiceTest {
    JdbcTemplate db; AuditoriaConsultaRepository acessos; AuditoriaConsultaService service; UsuarioResponse admin;
    public static Timestamp converter(Timestamp data,String origem,String destino) {
        return Timestamp.valueOf(data.toLocalDateTime().atOffset(ZoneOffset.of(origem)).withOffsetSameInstant(ZoneOffset.of(destino)).toLocalDateTime());
    }
    @BeforeEach void preparar() {
        db=new JdbcTemplate(new DriverManagerDataSource("jdbc:h2:mem:"+java.util.UUID.randomUUID()+";MODE=MySQL;DB_CLOSE_DELAY=-1","sa",""));
        db.execute("CREATE ALIAS CONVERT_TZ FOR 'com.clinicar.backend.service.AuditoriaConsultaServiceTest.converter'");
        String cols="(id BIGINT,realizado_em TIMESTAMP,administrador_id BIGINT,administrador_nome VARCHAR(255),usuario_id BIGINT,usuario_nome VARCHAR(255),justificativa VARCHAR(1000))";
        db.execute("CREATE TABLE auditoria_reset_mfa "+cols);db.execute("CREATE TABLE auditoria_exclusao_usuario "+cols);
        db.execute("CREATE TABLE auditoria_consulta (id BIGINT,realizado_em TIMESTAMP,usuario_id BIGINT,usuario_nome VARCHAR(255),operacao VARCHAR(30),descricao VARCHAR(1000))");
        db.execute("CREATE TABLE peca (id BIGINT,nome VARCHAR(255))");
        db.execute("CREATE TABLE movimentacao_estoque_peca (id BIGINT,criado_em TIMESTAMP,tipo_movimento VARCHAR(40),id_usuario BIGINT,nome_usuario VARCHAR(255),id_peca BIGINT,motivo VARCHAR(200),observacoes VARCHAR(500),saldo_anterior DECIMAL(12,3),saldo_posterior DECIMAL(12,3),quantidade DECIMAL(12,3),valor_unitario DECIMAL(10,2),valor_total DECIMAL(10,2),documento_referencia VARCHAR(120),id_movimentacao_origem BIGINT,id_estoque_peca BIGINT)");
        db.update("INSERT INTO auditoria_reset_mfa VALUES (1,'2026-10-11 18:00:00',7,'Administrador',20,'Usuário removido','Perda de acesso ao autenticador')");
        db.update("INSERT INTO auditoria_exclusao_usuario VALUES (2,'2026-10-12 02:59:59',7,'Administrador',21,'Cadastro por engano','Cadastro realizado por engano')");
        db.update("INSERT INTO peca VALUES (3,'Óleo de motor')");
        db.update("INSERT INTO movimentacao_estoque_peca VALUES (4,'2026-10-11 16:00:00','ENTRADA',7,'Administrador',3,'Compra',NULL,10,15,5,30,150,'NF 123',NULL,5)");
        acessos=mock(AuditoriaConsultaRepository.class);service=new AuditoriaConsultaService(new NamedParameterJdbcTemplate(db),acessos);
        admin=new UsuarioResponse();admin.setId(7L);admin.setNome("Administrador");admin.setTipo_do_acesso("ADMINISTRADOR");admin.setStatus("ATIVO");
    }
    AuditoriaConsultaService.Filtro filtro(String componente,int pagina,int tamanho) {
        return new AuditoriaConsultaService.Filtro(LocalDate.of(2026,10,11),LocalDate.of(2026,10,11),"",componente,"",null,null,pagina,tamanho,"dataHora",true);
    }
    @Test void consultaUnificadaPaginadaComPeriodoInclusivoENomesHistoricos() {
        var p=service.consultar(admin,filtro("",0,2));assertEquals(3,p.totalElements());assertEquals(2,p.totalPages());
        assertEquals("EXCLUSAO_USUARIO",p.content().getFirst().origem());
        assertEquals(LocalDateTime.of(2026,10,11,23,59,59),p.content().getFirst().dataHora());
        var segunda=service.consultar(admin,filtro("",1,2));assertEquals("Usuário removido",segunda.content().getFirst().registroNome());
        assertEquals(LocalDateTime.of(2026,10,11,15,0),segunda.content().getFirst().dataHora());
        verify(acessos,times(2)).saveAndFlush(any());
    }
    @Test void filtrosPorResponsavelRegistroEOperacaoFuncionamJuntos() {
        var f=new AuditoriaConsultaService.Filtro(null,null,"óleo","ESTOQUE","ENTRADA",7L,3L,0,10,"dataHora",true);
        var p=service.consultar(admin,f);assertEquals(1,p.totalElements());assertEquals("10.000",p.content().getFirst().detalhes().get("saldo_anterior"));
        assertEquals("15.000",p.content().getFirst().detalhes().get("saldo_posterior"));
    }
    @Test void buscaNaoInterpretaSqlNemCuringas() {
        for(String busca:new String[]{"' OR 1=1 --","%"}) {
            var f=new AuditoriaConsultaService.Filtro(null,null,busca,"","",null,null,0,10,"dataHora",true);
            assertEquals(0,service.consultar(admin,f).totalElements());
        }
    }
    @Test void bloqueiaOutrosPerfisESessaoInativaAntesDeConsultar() {
        admin.setTipo_do_acesso("COLABORADOR");assertEquals(403,assertThrows(ResponseStatusException.class,()->service.consultar(admin,filtro("",0,10))).getStatusCode().value());
        admin.setTipo_do_acesso("CLIENTE");assertThrows(ResponseStatusException.class,()->service.exportar(admin,filtro("",0,10)));
        admin.setTipo_do_acesso("ADMINISTRADOR");admin.setStatus("INATIVO");assertEquals(401,assertThrows(ResponseStatusException.class,()->service.detalhe(admin,"ESTOQUE",4)).getStatusCode().value());
        verifyNoInteractions(acessos);
    }
    @Test void rejeitaFiltrosInvalidosEOrdenacaoNaoPermitida() {
        assertThrows(ResponseStatusException.class,()->service.consultar(admin,filtro("",0,101)));
        assertThrows(ResponseStatusException.class,()->service.consultar(admin,filtro("",-1,10)));
        assertThrows(ResponseStatusException.class,()->service.consultar(admin,filtro("INVALIDO",0,10)));
        var f=new AuditoriaConsultaService.Filtro(null,null,"","","",null,null,0,10,"id; DROP TABLE peca",true);
        assertThrows(ResponseStatusException.class,()->service.consultar(admin,f));verifyNoInteractions(acessos);
    }
    @Test void detalhesSaoEspecificosEPreservamIdentidadeSemConsultarUsuario() {
        var e=service.detalhe(admin,"RESET_2FA",1);assertEquals(20,e.registroId());assertTrue(e.detalhes().isEmpty());
        assertThrows(ResponseStatusException.class,()->service.detalhe(admin,"ESTOQUE",1));
        assertThrows(ResponseStatusException.class,()->service.detalhe(admin,"INVALIDO",1));
        verify(acessos).saveAndFlush(argThat(a->a.getOperacao().equals("DETALHES")&&a.getUsuarioId()==7));
    }
    @Test void exportacaoFiltradaRegistradaSemCamposSecretos() {
        String csv=service.exportar(admin,filtro("USUARIOS",0,10));assertTrue(csv.startsWith("\uFEFF"));assertTrue(csv.contains("Perda de acesso"));assertFalse(csv.contains("Óleo de motor"));
        verify(acessos).saveAndFlush(argThat(a->a.getOperacao().equals("EXPORTACAO")&&a.getDescricao().contains("registros=2")));
    }
    @Test void neutralizaFormulasECelulasComAspasNaExportacao() {
        assertEquals("\"'=SUM(1,2)\"",AuditoriaConsultaService.celula("=SUM(1,2)"));
        assertTrue(AuditoriaConsultaService.celula("=SUM(1,2)\nTexto").startsWith("\"'="));
        assertEquals("\"Nome \"\"Teste\"\"\"",AuditoriaConsultaService.celula("Nome \"Teste\""));
    }
    @Test void naoEntregaDadosSeORegistroDaConsultaFalha() {
        doThrow(new IllegalStateException("Auditoria indisponível")).when(acessos).saveAndFlush(any());
        assertThrows(IllegalStateException.class,()->service.consultar(admin,filtro("",0,10)));
    }
    @Test void limitaExportacaoAntesDeGerarArquivo() {
        db.update("INSERT INTO movimentacao_estoque_peca (id,criado_em,tipo_movimento,id_peca) SELECT X+10,'2026-10-11 16:00:00','ENTRADA',3 FROM SYSTEM_RANGE(1,5001)");
        assertEquals(400,assertThrows(ResponseStatusException.class,()->service.exportar(admin,filtro("ESTOQUE",0,10))).getStatusCode().value());
        verifyNoInteractions(acessos);
    }
}
