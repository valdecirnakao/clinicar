package com.clinicar.backend.controller;

import com.clinicar.backend.dto.*;
import com.clinicar.backend.mapper.MovimentacaoEstoquePecaMapper;
import com.clinicar.backend.model.*;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/** Paginação de lançamentos com saldo calculado sobre todos os vínculos, dentro da mesma leitura. */
@RestController
@Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
public class MovimentacoesPaginadasController {
    private final NamedParameterJdbcTemplate jdbc;private final EntityManager em;private final MovimentacaoEstoquePecaMapper mapper;
    public MovimentacoesPaginadasController(NamedParameterJdbcTemplate jdbc,EntityManager em,MovimentacaoEstoquePecaMapper mapper){this.jdbc=jdbc;this.em=em;this.mapper=mapper;}

    // Uma devolução ao fornecedor pode ter correções próprias. Essas correções alteram o saldo do recebimento.
    private static String saldo(String alias){return alias+".quantidade + COALESCE((SELECT SUM((CASE WHEN ("+alias+".tipo_movimento='ENTRADA' AND v.tipo_movimento IN ('ENTRADA','AJUSTE_ENTRADA')) OR ("+alias+".tipo_movimento<>'ENTRADA' AND v.tipo_movimento NOT IN ('ENTRADA','AJUSTE_ENTRADA')) THEN 1 ELSE -1 END) * (v.quantidade + CASE WHEN "+alias+".tipo_movimento='ENTRADA' AND v.tipo_movimento='SAIDA' AND v.origem='DEVOLUCAO_FORNECEDOR' THEN COALESCE((SELECT SUM(CASE WHEN c.tipo_movimento IN ('SAIDA','AJUSTE_SAIDA') THEN c.quantidade ELSE -c.quantidade END) FROM movimentacao_estoque_peca c WHERE c.id_movimentacao_origem=v.id),0) ELSE 0 END)) FROM movimentacao_estoque_peca v WHERE v.id_movimentacao_origem="+alias+".id),0)";}

    @GetMapping({"/api/estoque-pecas/{id}/movimentacoes/pagina","/api/atendimento/{id}/devolucoes/pagina"})
    public Map<String,Object> listar(HttpServletRequest request,@PathVariable Long id,@RequestParam(defaultValue="0") int pagina,
        @RequestParam(defaultValue="10") int tamanho,@RequestParam(defaultValue="") String busca,@RequestParam(defaultValue="HISTORICO") String finalidade){
        autorizar(request);if(pagina<0||pagina>100000||tamanho<1||tamanho>100||busca.length()>120)throw new IllegalArgumentException("Parâmetros de paginação inválidos.");
        var params=new HashMap<String,Object>();String where=escopo(request,id,params);
        where+=switch(finalidade){
            case "HISTORICO" -> "";
            case "CORRECAO" -> " AND m.tipo_movimento IN ('ENTRADA','SAIDA') AND COALESCE(m.origem,'')<>'ATENDIMENTO' AND m.id_atendimento IS NULL AND (m.id_movimentacao_origem IS NULL OR m.origem='DEVOLUCAO_FORNECEDOR')";
            case "DEVOLUCAO" -> " AND m.tipo_movimento='SAIDA' AND COALESCE(m.origem,'') NOT IN ('ATENDIMENTO','DEVOLUCAO_FORNECEDOR') AND m.id_atendimento IS NULL AND m.id_movimentacao_origem IS NULL AND m.valor_unitario>=0 AND ("+saldo("m")+")>0";
            case "FORNECEDOR" -> " AND m.tipo_movimento='ENTRADA' AND m.origem IN ('COMPRA','BONIFICACAO','MANUAL') AND m.id_atendimento IS NULL AND m.id_movimentacao_origem IS NULL AND ("+saldo("m")+")>0";
            case "ATENDIMENTO" -> " AND m.tipo_movimento='SAIDA' AND ("+saldo("m")+")>0";
            default -> throw new IllegalArgumentException("Finalidade de seleção inválida.");
        };
        if(!busca.isBlank()){params.put("busca","%"+busca.toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%");where+=" AND (LOWER(COALESCE(m.documento_referencia,'')) LIKE :busca ESCAPE '!' OR LOWER(COALESCE(m.nome_usuario,'')) LIKE :busca ESCAPE '!' OR LOWER(COALESCE(m.motivo,'')) LIKE :busca ESCAPE '!' OR LOWER(COALESCE(m.origem,'')) LIKE :busca ESCAPE '!')";}
        long total=jdbc.queryForObject("SELECT COUNT(*) FROM movimentacao_estoque_peca m WHERE "+where,params,Long.class);
        params.put("tamanho",tamanho);params.put("inicio",pagina*tamanho);
        List<Long> ids=jdbc.queryForList("SELECT m.id FROM movimentacao_estoque_peca m WHERE "+where+" ORDER BY m.criado_em DESC,m.id DESC LIMIT :tamanho OFFSET :inicio",params,Long.class);
        return Map.of("content",respostas(ids),"totalElements",total,"totalPages",(int)Math.ceil((double)total/tamanho),"number",pagina,"resumo",Map.of(),"opcoes",Map.of());
    }

    @GetMapping({"/api/estoque-pecas/{id}/movimentacoes/{movimentoId}","/api/atendimento/{id}/devolucoes/{movimentoId}"})
    public MovimentacaoEstoquePecaResponse buscar(HttpServletRequest request,@PathVariable Long id,@PathVariable Long movimentoId){
        autorizar(request);var params=new HashMap<String,Object>();String where=escopo(request,id,params);params.put("movimento",movimentoId);
        if(jdbc.queryForObject("SELECT COUNT(*) FROM movimentacao_estoque_peca m WHERE "+where+" AND m.id=:movimento",params,Long.class)==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Movimentação não encontrada neste registro.");
        return respostas(List.of(movimentoId)).getFirst();
    }
    private String escopo(HttpServletRequest request,Long id,Map<String,Object> params){
        if(id==null||id<=0)throw new IllegalArgumentException("Registro inválido.");params.put("id",id);
        if(request.getRequestURI().startsWith("/api/atendimento/")){
            var atendimento=em.find(Atendimento.class,id);if(atendimento==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Atendimento não encontrado.");
            params.put("codigo",atendimento.getCodigoAtendimento());
            return "(m.id_atendimento=:id OR (m.id_atendimento IS NULL AND m.documento_referencia=:codigo AND m.origem='ATENDIMENTO'))";
        }
        if(em.find(EstoquePeca.class,id)==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Estoque não encontrado.");
        return "m.id_estoque_peca=:id";
    }
    private List<MovimentacaoEstoquePecaResponse> respostas(List<Long> ids){
        if(ids.isEmpty())return List.of();
        var registros=em.createQuery("SELECT m FROM MovimentacaoEstoquePeca m LEFT JOIN FETCH m.peca LEFT JOIN FETCH m.estoquePeca WHERE m.id IN :ids",MovimentacaoEstoquePeca.class).setParameter("ids",ids).getResultList();
        var calcular=new HashSet<>(ids);registros.stream().map(MovimentacaoEstoquePeca::getIdMovimentacaoOrigem).filter(Objects::nonNull).forEach(calcular::add);
        Map<Long,BigDecimal> saldos=new HashMap<>(),devolvidas=new HashMap<>();
        jdbc.query("SELECT m.id,("+saldo("m")+") saldo,COALESCE((SELECT SUM(d.quantidade) FROM movimentacao_estoque_peca d WHERE d.id_movimentacao_origem=m.id),0) devolvida FROM movimentacao_estoque_peca m WHERE m.id IN (:ids)",Map.of("ids",calcular),rs->{saldos.put(rs.getLong("id"),rs.getBigDecimal("saldo"));devolvidas.put(rs.getLong("id"),rs.getBigDecimal("devolvida"));});
        var porId=new HashMap<Long,MovimentacaoEstoquePecaResponse>();
        for(var registro:registros){var dto=mapper.toResponse(registro);dto.setQuantidadeDisponivelOriginal(saldos.get(registro.getId()));dto.setQuantidadeDisponivelRecebimento(saldos.get(registro.getIdMovimentacaoOrigem()));
            dto.setQuantidadeDevolvida(devolvidas.getOrDefault(registro.getId(),BigDecimal.ZERO));
            dto.setCustoMedioAtual(registro.getEstoquePeca().getCustoMedio());porId.put(registro.getId(),dto);}
        return ids.stream().map(porId::get).toList();
    }
    private void autorizar(HttpServletRequest request){
        if(!(request.getAttribute("usuarioLogado") instanceof UsuarioResponse usuario))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Consulta não autorizada.");
        boolean administrador="ADMINISTRADOR".equalsIgnoreCase(usuario.getTipo_do_acesso());
        boolean historicoEstoque=request.getRequestURI().startsWith("/api/estoque-pecas/");
        if(!administrador && !(historicoEstoque && "COLABORADOR".equalsIgnoreCase(usuario.getTipo_do_acesso())))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Consulta não autorizada para este perfil.");
    }
}
