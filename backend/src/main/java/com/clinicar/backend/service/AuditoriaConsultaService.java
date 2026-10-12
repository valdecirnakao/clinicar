package com.clinicar.backend.service;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.model.AuditoriaConsulta;
import com.clinicar.backend.repository.AuditoriaConsultaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import java.sql.ResultSet;
import java.sql.SQLException;

@Service @RequiredArgsConstructor
public class AuditoriaConsultaService {
    @org.springframework.beans.factory.annotation.Value("${clinicar.auditoria.cadastros-enabled:true}") private boolean auditoriaCadastros;
    private final NamedParameterJdbcTemplate jdbc;
    private final AuditoriaConsultaRepository acessos;
    public record Evento(String origem, long id, LocalDateTime dataHora, String componente, String operacao,
            Long responsavelId, String responsavelNome, Long registroId, String registroNome,
            String resultado, String justificativa, Map<String, String> detalhes) {}
    public record Pagina(List<Evento> content, long totalElements, int totalPages, int number) {}
    public record Filtro(LocalDate inicio, LocalDate fim, String busca, String componente, String operacao,
            Long responsavelId, Long registroId, int pagina, int tamanho, String ordenar, boolean decrescente) {}

    // Instants do Hibernate são armazenados em UTC. Movimentos usam a data local da oficina.
    private static final String BASE = """
        SELECT 'RESET_2FA' origem, id, CONVERT_TZ(realizado_em,'+00:00','-03:00') data_hora,
            'USUARIOS' componente, 'RESET_2FA' operacao, administrador_id responsavel_id,
            administrador_nome responsavel_nome, usuario_id registro_id, usuario_nome registro_nome,
            justificativa, NULL saldo_anterior, NULL saldo_posterior, NULL quantidade,
            NULL valor_unitario, NULL valor_total, NULL documento, NULL movimento_origem, NULL estoque_id
        FROM auditoria_reset_mfa
        UNION ALL
        SELECT 'EXCLUSAO_USUARIO', id, CONVERT_TZ(realizado_em,'+00:00','-03:00'), 'USUARIOS', 'EXCLUSAO_USUARIO',
            administrador_id, administrador_nome, usuario_id, usuario_nome, justificativa,
            NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL FROM auditoria_exclusao_usuario
        UNION ALL
        SELECT 'ESTOQUE', m.id, m.criado_em, 'ESTOQUE', m.tipo_movimento, m.id_usuario, m.nome_usuario,
            m.id_peca, p.nome, CONCAT_WS(' · ',m.motivo,m.observacoes), m.saldo_anterior, m.saldo_posterior,
            m.quantidade, m.valor_unitario, m.valor_total, m.documento_referencia, m.id_movimentacao_origem,
            m.id_estoque_peca FROM movimentacao_estoque_peca m LEFT JOIN peca p ON p.id=m.id_peca
        UNION ALL
        SELECT 'ACESSO_AUDITORIA', id, CONVERT_TZ(realizado_em,'+00:00','-03:00'), 'AUDITORIA', operacao,
            usuario_id, usuario_nome, id, 'Consulta de auditoria', descricao,
            NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL FROM auditoria_consulta
        """;
    private String base() { return BASE + (auditoriaCadastros ? " UNION ALL SELECT 'CADASTRO',id,CONVERT_TZ(realizado_em,'+00:00','-03:00'),componente,operacao,usuario_id,usuario_nome,registro_id,descricao,descricao,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL FROM auditoria_evento" : ""); }
    private static final Set<String> COMPONENTES = Set.of("USUARIOS", "ESTOQUE", "AUDITORIA", "PECA", "SERVICO", "FORNECEDOR", "VEICULO", "FORNECIMENTOPECAS", "FORNECIMENTOSERVICO", "AGENDAMENTO", "ATENDIMENTO", "REGRAMANUTENCAOPREVENTIVA", "ALERTAESTOQUEPECA", "CONFIGURACAOALERTAESTOQUE", "ALERTAMANUTENCAO", "LOCAL ESTOQUE", "NOTIFICACAO");
    private static final Set<String> OPERACOES = Set.of("RESET_2FA", "EXCLUSAO_USUARIO", "ENTRADA", "SAIDA",
            "AJUSTE_ENTRADA", "AJUSTE_SAIDA", "RESERVA", "LIBERACAO_RESERVA", "CONSULTA", "DETALHES", "EXPORTACAO", "POST", "PUT", "PATCH", "DELETE");
    private static final Map<String,String> ORDENACAO = Map.of("dataHora","data_hora", "responsavelNome","responsavel_nome",
            "componente","componente", "operacao","operacao", "registroId","registro_id");

    public static void autorizar(UsuarioResponse ator) {
        if (ator == null || ator.getId() == null || !"ATIVO".equalsIgnoreCase(ator.getStatus()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sessão inválida ou expirada.");
        if (!"ADMINISTRADOR".equalsIgnoreCase(ator.getTipo_do_acesso()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"A consulta de auditoria é exclusiva de administradores.");
    }
    public static void validar(Filtro f) {
        if (f.pagina()<0 || f.tamanho()<1 || f.tamanho()>100 || f.busca()==null || f.busca().length()>120
                || f.componente()==null || f.operacao()==null || !ORDENACAO.containsKey(f.ordenar())
                || (!f.componente().isEmpty() && !COMPONENTES.contains(f.componente()))
                || (!f.operacao().isEmpty() && !OPERACOES.contains(f.operacao()))
                || (f.inicio()!=null && f.fim()!=null && f.inicio().isAfter(f.fim()))
                || (f.responsavelId()!=null && f.responsavelId()<1) || (f.registroId()!=null && f.registroId()<1))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Verifique o período e os filtros da auditoria.");
    }
    private Map<String,Object> parametros(Filtro f) {
        var p = new HashMap<String,Object>();
        p.put("inicio",f.inicio()==null?null:f.inicio().atStartOfDay());
        p.put("fim",f.fim()==null?null:f.fim().plusDays(1).atStartOfDay());
        p.put("busca",f.busca().trim().toLowerCase(Locale.ROOT)); p.put("componente",f.componente());
        p.put("operacao",f.operacao()); p.put("responsavel",f.responsavelId()); p.put("registro",f.registroId());
        p.put("limite",f.tamanho()); p.put("offset",(long)f.pagina()*f.tamanho()); return p;
    }
    private static final String WHERE = """
        WHERE (:inicio IS NULL OR data_hora>=:inicio) AND (:fim IS NULL OR data_hora<:fim)
        AND (:componente='' OR componente=:componente) AND (:operacao='' OR operacao=:operacao)
        AND (:responsavel IS NULL OR responsavel_id=:responsavel) AND (:registro IS NULL OR registro_id=:registro)
        AND (:busca='' OR LOCATE(:busca,LOWER(COALESCE(responsavel_nome,'')))>0
            OR LOCATE(:busca,LOWER(COALESCE(registro_nome,'')))>0)
        """;
    @Transactional
    public Pagina consultar(UsuarioResponse ator, Filtro f) {
        autorizar(ator); validar(f); var p=parametros(f);
        Long total=jdbc.queryForObject("SELECT COUNT(*) FROM ("+base()+") eventos "+WHERE,p,Long.class);
        var eventos=jdbc.query("SELECT * FROM ("+base()+") eventos "+WHERE+" ORDER BY "+ORDENACAO.get(f.ordenar())
            +(f.decrescente()?" DESC":" ASC")+", origem ASC, id DESC LIMIT :limite OFFSET :offset",p,this::mapear);
        registrar(ator,"CONSULTA",descricao(f));
        long count=total==null?0:total;
        return new Pagina(eventos,count,(int)Math.ceil((double)count/f.tamanho()),f.pagina());
    }
    @Transactional
    public Evento detalhe(UsuarioResponse ator,String origem,long id) {
        autorizar(ator);
        if (!Set.of("RESET_2FA","EXCLUSAO_USUARIO","ESTOQUE","ACESSO_AUDITORIA","CADASTRO").contains(origem) || id<1)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Registro de auditoria inválido.");
        var eventos=jdbc.query("SELECT * FROM ("+base()+") eventos WHERE origem=:origem AND id=:id",
            Map.of("origem",origem,"id",id),this::mapear);
        if(eventos.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Registro de auditoria não encontrado.");
        registrar(ator,"DETALHES","Visualização do evento "+origem+" #"+id);
        return eventos.getFirst();
    }
    @Transactional
    public String exportar(UsuarioResponse ator,Filtro f) {
        autorizar(ator); validar(f); var p=parametros(f);
        Long total=jdbc.queryForObject("SELECT COUNT(*) FROM ("+base()+") eventos "+WHERE,p,Long.class);
        if(total!=null && total>5000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "A exportação permite até 5.000 registros. Refine os filtros ou o período.");
        var eventos=jdbc.query("SELECT * FROM ("+base()+") eventos "+WHERE+" ORDER BY data_hora DESC, origem, id DESC LIMIT 5000",p,this::mapear);
        var csv=new StringBuilder("\uFEFFOrigem do evento;ID do evento;Data/hora (São Paulo);Componente;Operação;Responsável;ID responsável;Registro;ID registro;Resultado;Justificativa\r\n");
        for(var e:eventos) csv.append(String.join(";",celula(e.origem()),celula(e.id()),celula(e.dataHora()),celula(e.componente()),celula(e.operacao()),
            celula(e.responsavelNome()),celula(e.responsavelId()),celula(e.registroNome()),celula(e.registroId()),
            celula(e.resultado()),celula(e.justificativa()))).append("\r\n");
        registrar(ator,"EXPORTACAO",descricao(f)+"; registros="+eventos.size()); return csv.toString();
    }
    // Evita fórmulas executáveis ao abrir dados fornecidos por usuários em planilhas.
    static String celula(Object valor) {
        String s=valor==null?"":valor.toString();
        String inicio=s.stripLeading();
        if((!inicio.isEmpty() && "=+-@".indexOf(inicio.charAt(0))>=0)
                || s.startsWith("\t") || s.startsWith("\r") || s.startsWith("\n")) s="'"+s;
        return "\""+s.replace("\"","\"\"")+"\"";
    }
    private String descricao(Filtro f) {
        return "Período="+f.inicio()+" a "+f.fim()+"; componente="+f.componente()+"; operação="+f.operacao()
            +"; responsável="+f.responsavelId()+"; registro="+f.registroId()+"; busca="+f.busca()+"; página="+f.pagina();
    }
    private void registrar(UsuarioResponse ator,String operacao,String descricao) {
        var acesso=new AuditoriaConsulta(); acesso.setUsuarioId(ator.getId()); acesso.setUsuarioNome(ator.getNome());
        acesso.setOperacao(operacao); acesso.setDescricao(descricao); acesso.setRealizadoEm(Instant.now());
        acessos.saveAndFlush(acesso);
    }
    private Evento mapear(ResultSet r,int n) throws SQLException {
        var detalhes=new LinkedHashMap<String,String>();
        for(String campo:List.of("saldo_anterior","saldo_posterior","quantidade","valor_unitario","valor_total","documento","movimento_origem","estoque_id")) {
            String valor=r.getString(campo); if(valor!=null) detalhes.put(campo,valor);
        }
        return new Evento(r.getString("origem"),r.getLong("id"),r.getTimestamp("data_hora").toLocalDateTime(),
            r.getString("componente"),r.getString("operacao"),r.getObject("responsavel_id",Long.class),
            r.getString("responsavel_nome"),r.getObject("registro_id",Long.class),r.getString("registro_nome"),
            "SUCESSO",r.getString("justificativa"),detalhes);
    }
}
