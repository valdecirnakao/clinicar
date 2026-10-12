package com.clinicar.backend.config;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.MethodParameter;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.http.server.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@RestControllerAdvice
@ConditionalOnProperty(name="clinicar.operacoes.confiaveis-enabled",havingValue="true",matchIfMissing=true)
public class VersaoCadastroAdvice implements ResponseBodyAdvice<Object> {
    public static final Set<String> RECURSOS=Set.of("usuario","fornecedor","peca","servico","veiculo","fornecimento-pecas","fornecimento-servicos","estoque-pecas","agendamento","atendimento","regra-manutencao-preventiva");
    private final JdbcTemplate jdbc; private final ObjectMapper json;
    public VersaoCadastroAdvice(JdbcTemplate jdbc,ObjectMapper json){this.jdbc=jdbc;this.json=json;}
    public boolean supports(MethodParameter method,Class<? extends HttpMessageConverter<?>> converter){return MappingJackson2HttpMessageConverter.class.isAssignableFrom(converter);}
    public Object beforeBodyWrite(Object body,MethodParameter method,MediaType content,Class<? extends HttpMessageConverter<?>> converter,ServerHttpRequest request,ServerHttpResponse response){
        String[] parts=request.getURI().getPath().split("/");
        if(body==null || parts.length<3 || parts.length>4 || !RECURSOS.contains(parts[2]) || (parts.length>3 && !parts[3].matches("[0-9]+|ativos|criticos|pagina|por-peca")))return body;
        JsonNode tree=json.valueToTree(body);List<ObjectNode> records=new ArrayList<>();
        if(tree.isArray())tree.forEach(node->{if(node instanceof ObjectNode object&&object.path("id").isIntegralNumber())records.add(object);});
        else if(tree instanceof ObjectNode object&&object.path("id").isIntegralNumber())records.add(object);
        else if(tree.path("content").isArray())tree.path("content").forEach(node->{if(node instanceof ObjectNode object&&object.path("id").isIntegralNumber())records.add(object);});
        if(records.isEmpty())return body;
        var params=new ArrayList<Object>();params.add(parts[2]);records.forEach(row->params.add(row.path("id").longValue()));
        var versions=new HashMap<Long,Long>();
        jdbc.query("SELECT registro_id,versao FROM registro_versao WHERE recurso=? AND registro_id IN ("+String.join(",",Collections.nCopies(records.size(),"?"))+")",rs->{versions.put(rs.getLong(1),rs.getLong(2));},params.toArray());
        records.forEach(row->{if(!row.has("controleVersao"))row.put("controleVersao",versions.getOrDefault(row.path("id").longValue(),0L));});
        response.getHeaders().setCacheControl("no-store");
        return tree;
    }
}
