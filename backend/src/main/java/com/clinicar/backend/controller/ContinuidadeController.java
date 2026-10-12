package com.clinicar.backend.controller;
import com.clinicar.backend.dto.UsuarioResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/continuidade")
public class ContinuidadeController {
    private final JdbcTemplate jdbc; private final ObjectMapper json;
    public ContinuidadeController(JdbcTemplate jdbc,ObjectMapper json){this.jdbc=jdbc;this.json=json;}
    public record Contexto(String rota,Map<String,String> parametros){}
    @PostMapping public Map<String,Object> guardar(@RequestBody Contexto input,HttpServletRequest request) throws Exception {
        var user=(UsuarioResponse)request.getAttribute("usuarioLogado");
        Set<String> rotas=Set.of("usuario","peca","servico","fornecedor","fornecimentoPecas","fornecimentoServico","controleEstoquePecas","veiculo","alertasClientes","alertasColaboradores");
        Set<String> campos=Set.of("continuarCadastro","continuarPeca","continuarServico","continuarEstoque","continuarUsuario","continuarAlertas","fornecedorId","pecaId","servicoId","usuarioId","proprietarioId","retomarCadastro");
        if(input==null || !rotas.contains(input.rota()) || input.parametros()==null || input.parametros().isEmpty()
            || input.parametros().entrySet().stream().anyMatch(e->!campos.contains(e.getKey())||e.getValue()==null||!e.getValue().matches("[0-9]{1,18}"))) throw new IllegalArgumentException("Contexto de cadastro inválido.");
        var params=new java.util.TreeMap<>(input.parametros()); params.remove("retomarCadastro");
        String type=input.rota(); String path="/menuAdministrador/"+type;
        String title=switch(type){case "controleEstoquePecas"->"Concluir controle de estoque";case "fornecimentoPecas","fornecimentoServico"->"Concluir condições do fornecimento";case "fornecedor"->"Associar fornecedor à peça";case "veiculo"->"Cadastrar veículo do usuário";case "alertasClientes","alertasColaboradores"->"Configurar alertas do usuário";default->"Concluir cadastro de "+type;};
        String contexto=json.writeValueAsString(params);
        String hash=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(contexto.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        jdbc.update("INSERT INTO cadastro_continuidade (usuario_id,tipo,titulo,rota,contexto,chave_contexto,atualizado_em) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE titulo=VALUES(titulo),rota=VALUES(rota),contexto=VALUES(contexto),estado='PENDENTE',atualizado_em=VALUES(atualizado_em)",user.getId(),type,title,path,contexto,hash,Timestamp.from(Instant.now()));
        return Map.of("id",jdbc.queryForObject("SELECT id FROM cadastro_continuidade WHERE usuario_id=? AND tipo=? AND chave_contexto=?",Long.class,user.getId(),type,hash));
    }
    @PostMapping("/{id}/concluir") public Map<String,String> concluir(@PathVariable Long id,HttpServletRequest request) {
        var user=(UsuarioResponse)request.getAttribute("usuarioLogado");
        if(jdbc.update("UPDATE cadastro_continuidade SET estado='CONCLUIDA',atualizado_em=? WHERE id=? AND usuario_id=?",Timestamp.from(Instant.now()),id,user.getId())!=1) throw new IllegalArgumentException("Cadastro pendente não encontrado.");
        return Map.of("mensagem","Etapa concluída.");
    }
}
