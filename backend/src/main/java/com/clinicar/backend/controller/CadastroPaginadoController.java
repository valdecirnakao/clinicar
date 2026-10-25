package com.clinicar.backend.controller;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.model.*;
import com.clinicar.backend.service.CategoriasFornecedor;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.*;
import org.springframework.context.ApplicationContext;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/** Consulta limitada, contagem independente da página e ordenação estável por ID. */
@RestController
public class CadastroPaginadoController {
    private record Cadastro(Class<?> entidade,List<String> busca,List<String> filtros){}
    private static final Map<String,Cadastro> CADASTROS=Map.ofEntries(
        Map.entry("local-estoque",new Cadastro(LocalEstoque.class,List.of("nome","descricao"),List.of("ativo"))),
        Map.entry("peca",new Cadastro(Peca.class,List.of("nome","tipo","fabricante","modelo","especificacao","unidade","viscosidadeSae","classificacaoApi","classificacaoAcea","normaOem"),List.of("tipo","unidade","fabricante"))),
        Map.entry("servico",new Cadastro(Servico.class,List.of("nome","descricao","categoria","tipoDoPrestador"),List.of("categoria","ativo","fornecedor.id"))),
        Map.entry("fornecedor",new Cadastro(Fornecedor.class,List.of("cnpj","razaoSocial","nomeFantasia","itemFornecido","email","cidade"),List.of("estado","itemFornecido","ativo"))),
        Map.entry("veiculo",new Cadastro(Veiculo.class,List.of("placa","fabricante","modelo","cor","usuarioProprietario.nome","usuarioProprietario.email","usuarioProprietario.cpf","usuarioProprietario.telefone"),List.of("fabricante","idProprietario"))),
        Map.entry("usuario",new Cadastro(Usuario.class,List.of("nome","nome_social","cpf","email","telefone"),List.of("status","tipo_do_acesso"))),
        Map.entry("estoque-pecas",new Cadastro(EstoquePeca.class,List.of("peca.nome","peca.fabricante","peca.modelo","localEstoque.nome","localizacaoFisica"),List.of("statusEstoque","localEstoque.id","localEstoque.nome","ativo"))),
        Map.entry("fornecimento-pecas",new Cadastro(FornecimentoPecas.class,List.of("fornecedor.razaoSocial","fornecedor.cnpj","peca.nome"),List.of("ativo","fornecedor.id","peca.id"))),
        Map.entry("fornecimento-servicos",new Cadastro(FornecimentoServico.class,List.of("fornecedor.razaoSocial","fornecedor.cnpj","servico.nome"),List.of("ativo","fornecedor.id","servico.id","disponibilidade"))),
        Map.entry("agendamento",new Cadastro(Agendamento.class,List.of("veiculo.placa","veiculoPlacaHistorica","cliente.nome","cliente.cpf","servico.nome","statusAgendamento"),List.of("statusAgendamento","prioridade"))),
        Map.entry("atendimento",new Cadastro(Atendimento.class,List.of("codigoAtendimento","veiculo.placa","veiculoPlacaHistorica","cliente.nome","servico.nome","statusAtendimento"),List.of("statusAtendimento","tipoExecucao"))),
        Map.entry("regra-manutencao-preventiva",new Cadastro(RegraManutencaoPreventiva.class,List.of("descricao","servico.nome","peca.nome","observacoes"),List.of("ativo","grupoManutencao","origemOleo"))));
    private final EntityManager em;private final ApplicationContext beans;
    public CadastroPaginadoController(EntityManager em,ApplicationContext beans){this.em=em;this.beans=beans;}
    @GetMapping("/api/agendamento/disponibilidade")
    @Transactional(readOnly=true)
    public List<Long> responsaveisOcupados(@RequestParam java.time.LocalDateTime inicio,@RequestParam java.time.LocalDateTime fim,@RequestParam(defaultValue="0") Long ignorar) {
        if(!fim.isAfter(inicio)||java.time.Duration.between(inicio,fim).toDays()>31)throw new IllegalArgumentException("Informe um período válido, com duração máxima de 31 dias.");
        return em.createQuery("SELECT DISTINCT a.responsavel.id FROM Agendamento a WHERE a.id<>:ignorar AND a.responsavel IS NOT NULL AND a.statusAgendamento IN ('CONFIRMADO','EM_ATENDIMENTO') AND a.dataHoraInicio<:fim AND a.dataHoraFim>:inicio",Long.class).setParameter("ignorar",ignorar).setParameter("inicio",inicio).setParameter("fim",fim).getResultList();
    }
    @GetMapping({"/api/local-estoque/pagina","/api/peca/pagina","/api/servico/pagina","/api/fornecedor/pagina","/api/veiculo/pagina","/api/usuario/pagina","/api/estoque-pecas/pagina","/api/fornecimento-pecas/pagina","/api/fornecimento-servicos/pagina","/api/agendamento/pagina","/api/atendimento/pagina","/api/regra-manutencao-preventiva/pagina"})
    @Transactional(readOnly=true)
    public Map<String,Object> listar(HttpServletRequest request,HttpServletResponse response,@RequestParam(defaultValue="0") int pagina,
        @RequestParam(defaultValue="10") int tamanho,@RequestParam(defaultValue="") String busca,
        @RequestParam(defaultValue="id") String ordenar,@RequestParam(defaultValue="false") boolean decrescente,
        @RequestParam Map<String,String> parametros) {
        if(!(request.getAttribute("usuarioLogado") instanceof UsuarioResponse user)) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED,"Sessão inválida.");
        boolean selecao="true".equals(parametros.get("selecao"));
        boolean colaborador="COLABORADOR".equalsIgnoreCase(user.getTipo_do_acesso());
        String recurso=request.getRequestURI().split("/")[2];
        var filtros=new HashMap<>(parametros);
        if(colaborador && recurso.equals("usuario") && !selecao) {
            filtros.remove("perfis");
            filtros.put("tipo_do_acesso","CLIENTE");
        }
        boolean consultaColaborador=colaborador && (Set.of("usuario","veiculo","estoque-pecas","agendamento","atendimento","local-estoque").contains(recurso)
                || selecao && Set.of("servico","peca","fornecedor","fornecimento-pecas").contains(recurso));
        if(!"ADMINISTRADOR".equalsIgnoreCase(user.getTipo_do_acesso()) && !consultaColaborador)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,"Consulta exclusiva de administradores.");
        if(pagina<0 || pagina>100000 || tamanho<1 || tamanho>100 || busca.length()>120)throw new IllegalArgumentException("Verifique os parâmetros da consulta.");
        response.setHeader("Cache-Control","no-store, max-age=0");
        Cadastro cadastro=CADASTROS.get(recurso);
        var allowed=new HashSet<>(cadastro.busca());allowed.addAll(cadastro.filtros());allowed.add("id");
        var seguros=Set.of("criadoEm","atualizadoEm","dataCadastro","dataHoraInicio","dataEntrada","codigoAgendamento","codigoAtendimento","valorEstimado","valorTotal","valorCusto","prazoEntregaDias","quantidadeMinima","valorBase","duracaoEstimada","garantiaDias","necessitaPecas","mfaAtivo","nascimento","fundacao","anoModeloCombustivel","quantidadeAtual","quantidadeReservada","estoqueMinimo","estoqueCritico","custoMedio","prioridade");
        em.getMetamodel().entity(cadastro.entidade()).getAttributes().stream().map(a->a.getName()).filter(seguros::contains).forEach(allowed::add);
        if(!allowed.contains(ordenar))ordenar="id";
        var cb=em.getCriteriaBuilder();var query=cb.createQuery(Object.class);var root=query.from(cadastro.entidade());
        em.getMetamodel().entity(cadastro.entidade()).getAttributes().stream().filter(a->!a.isCollection()&&a.isAssociation()).forEach(a->root.fetch(a.getName(),JoinType.LEFT));
        query.select(root).where(predicados(cb,root,cadastro,busca,filtros,query));
        var order=campo(root,ordenar);query.orderBy(decrescente?cb.desc(order):cb.asc(order),cb.asc(root.get("id")));
        List<?> rows=em.createQuery(query).setFirstResult(pagina*tamanho).setMaxResults(tamanho).getResultList();
        List<?> exibicao;
        if(recurso.equals("usuario") && !"true".equals(parametros.get("selecao"))) {
            var exclusao=beans.getBean(com.clinicar.backend.service.UsuarioExclusaoService.class);
            var vinculados=exclusao.usuariosComVinculos(rows.stream().map(row->((Usuario)row).getId()).toList());
            var administradores=colaborador?List.<Usuario>of():em.createQuery("SELECT u FROM Usuario u WHERE u.tipo_do_acesso='ADMINISTRADOR'",Usuario.class).getResultList();
            var mapper=beans.getBean(com.clinicar.backend.mapper.UsuarioMapper.class);
            exibicao=rows.stream().map(row->{
                var usuario=(Usuario)row;var dto=mapper.toResponse(usuario);
                dto.setPodeExcluir((!colaborador || "CLIENTE".equalsIgnoreCase(usuario.getTipo_do_acesso())) && exclusao.podeExcluir(usuario,user.getId(),vinculados));
                String motivo=colaborador?"Ação exclusiva do administrador.":com.clinicar.backend.service.ProtecaoAdministrativaService.motivoBloqueio(usuario,user.getId(),administradores);
                dto.setPodeInativar(!colaborador && motivo==null);dto.setMotivoBloqueioInativacao(motivo);return dto;
            }).toList();
        } else if(recurso.equals("veiculo")) {
            var json=beans.getBean(com.fasterxml.jackson.databind.ObjectMapper.class);var mapper=beans.getBean(com.clinicar.backend.mapper.UsuarioMapper.class);
            exibicao=rows.stream().map(row->{var veiculo=(Veiculo)row;com.fasterxml.jackson.databind.node.ObjectNode result=json.valueToTree(veiculo);var dono=veiculo.getUsuarioProprietario();if(dono!=null)result.set("proprietario",json.valueToTree(mapper.toResponse(dono)));return result;}).toList();
        } else exibicao=rows.stream().map(row->mapear(cadastro,row)).toList();
        var count=cb.createQuery(Long.class);var countRoot=count.from(cadastro.entidade());count.select(cb.count(countRoot)).where(predicados(cb,countRoot,cadastro,busca,filtros,count));
        long total=em.createQuery(count).getSingleResult();
        if ("true".equals(parametros.get("selecao"))) return Map.of("content", exibicao, "totalElements", total, "totalPages", (int)Math.ceil((double)total/tamanho), "number", pagina, "resumo", Map.of(), "opcoes", Map.of());
        var resumo=new HashMap<String,Object>();resumo.put("total",contar(cadastro,null,null));
        if(recurso.equals("usuario")) {
            resumo.put("ativos",contar(cadastro,"status","ATIVO"));resumo.put("inativos",contar(cadastro,"status","INATIVO"));
            resumo.put("mfaAtivo",contar(cadastro,"mfaAtivo",true));resumo.put("whatsapp",contatos("usuario"));
            if(colaborador) {
                var totais=(Object[])em.createNativeQuery("SELECT COUNT(*), COALESCE(SUM(status='ATIVO'),0), COALESCE(SUM(status='INATIVO'),0), COALESCE(SUM(mfa_ativo=1),0), COALESCE(SUM(LENGTH(REGEXP_REPLACE(COALESCE(telefone,''),'[^0-9]','')) IN (12,13) OR (REGEXP_REPLACE(COALESCE(telefone,''),'[^0-9]','') NOT LIKE '55%' AND LENGTH(REGEXP_REPLACE(COALESCE(telefone,''),'[^0-9]','')) IN (8,9,10,11))),0) FROM usuario WHERE tipo_do_acesso='CLIENTE'").getSingleResult();
                resumo.put("total",((Number)totais[0]).longValue());resumo.put("ativos",((Number)totais[1]).longValue());
                resumo.put("inativos",((Number)totais[2]).longValue());resumo.put("mfaAtivo",((Number)totais[3]).longValue());
                resumo.put("whatsapp",((Number)totais[4]).longValue());
            }
        }
        if(recurso.equals("fornecedor")) {
            resumo.put("estados",distintos(cadastro,"estado"));resumo.put("cidades",distintos(cadastro,"cidade"));resumo.put("whatsapp",contatos("fornecedor"));
        }
        if(recurso.equals("veiculo")) {
            var totais=(Object[])em.createNativeQuery("SELECT COUNT(*),COALESCE(SUM(u.id IS NOT NULL),0),COALESCE(SUM(u.id IS NULL),0),COALESCE(SUM(LENGTH(REGEXP_REPLACE(COALESCE(u.telefone,''),'[^0-9]','')) IN (12,13) OR (REGEXP_REPLACE(COALESCE(u.telefone,''),'[^0-9]','') NOT LIKE '55%' AND LENGTH(REGEXP_REPLACE(COALESCE(u.telefone,''),'[^0-9]','')) IN (8,9,10,11))),0) FROM veiculo v LEFT JOIN usuario u ON u.id=v.id_proprietario").getSingleResult();
            resumo.put("comProprietario",((Number)totais[1]).longValue());resumo.put("semProprietario",((Number)totais[2]).longValue());resumo.put("whatsapp",((Number)totais[3]).longValue());
        }
        if(em.getMetamodel().entity(cadastro.entidade()).getAttributes().stream().anyMatch(a->a.getName().equals("ativo"))){long ativos=contar(cadastro,"ativo",true);resumo.put("ativos",ativos);resumo.put("inativos",((Long)resumo.get("total"))-ativos);}
        var opcoes=new HashMap<String,List<?>>();
        for(String field:cadastro.filtros()) {
            var distinct=cb.createQuery(Object.class);var droot=distinct.from(cadastro.entidade());var path=campo(droot,field);
            distinct.select(path).distinct(true).where(cb.isNotNull(path)).orderBy(cb.asc(path));
            opcoes.put(field,em.createQuery(distinct).setMaxResults(500).getResultList());
        }
        if(recurso.equals("peca")){
            resumo.put("tipos",distintos(cadastro,"tipo"));resumo.put("fabricantes",distintos(cadastro,"fabricante"));
            var norma=cb.createQuery(Long.class);var nr=norma.from(Peca.class);norma.select(cb.count(nr)).where(cb.or(java.util.List.of("norma","classificacaoApi","classificacaoAcea","normaOem").stream().map(field->cb.and(cb.isNotNull(nr.get(field)),cb.notEqual(nr.get(field),""))).toArray(Predicate[]::new)));resumo.put("comNorma",em.createQuery(norma).getSingleResult());
        }
        if(recurso.equals("servico")){resumo.put("necessitaPecas",contar(cadastro,"necessitaPecas",true));var avg=cb.createQuery(Double.class);var aroot=avg.from(Servico.class);avg.select(cb.avg(aroot.get("valorBase")));resumo.put("valorMedioBase",Optional.ofNullable(em.createQuery(avg).getSingleResult()).orElse(0.0));}
        if(recurso.equals("estoque-pecas")) {
            for(String estado:List.of("NORMAL","ATENCAO","CRITICO","ZERADO"))resumo.put(estado.toLowerCase(Locale.ROOT),contar(cadastro,"statusEstoque",estado));
        }
        if(recurso.equals("agendamento")||recurso.equals("atendimento")) {
            String field=recurso.equals("agendamento")?"statusAgendamento":"statusAtendimento";
            for(String estado:List.of("AGENDADO","CONFIRMADO","EM_ATENDIMENTO","CONCLUIDO","CANCELADO","NAO_COMPARECEU","ABERTO","EM_EXECUCAO","ENTREGUE"))resumo.put(estado,contar(cadastro,field,estado));
        }
        if(recurso.equals("regra-manutencao-preventiva"))resumo.put("trocaOleo",contar(cadastro,"grupoManutencao","TROCA_OLEO"));
        if(recurso.startsWith("fornecimento-")) {
            String item=recurso.equals("fornecimento-pecas")?"peca":"servico";
            resumo.put("fornecedores",distintos(cadastro,"fornecedor.id"));resumo.put("itens",distintos(cadastro,item+".id"));
            var avg=cb.createQuery(Double.class);var ar=avg.from(cadastro.entidade());avg.select(cb.avg(ar.get("valorCusto"))).where(cb.greaterThan(ar.get("valorCusto"),java.math.BigDecimal.ZERO));resumo.put("valorMedio",Optional.ofNullable(em.createQuery(avg).getSingleResult()).orElse(0.0));
            String entidade=cadastro.entidade().getSimpleName();
            if(item.equals("peca")) {
                opcoes.put("fornecedores",em.createQuery("SELECT DISTINCT f.fornecedor FROM "+entidade+" f ORDER BY f.fornecedor.razaoSocial").setMaxResults(500).getResultList());
                opcoes.put("itens",em.createQuery("SELECT DISTINCT f.peca FROM "+entidade+" f ORDER BY f.peca.nome").setMaxResults(500).getResultList());
            } else {
                opcoes.put("fornecedores",em.createQuery("SELECT DISTINCT new map(f.fornecedor.id as idFornecedor,f.fornecedor.razaoSocial as razaoSocialFornecedor) FROM "+entidade+" f ORDER BY f.fornecedor.razaoSocial").setMaxResults(500).getResultList());
                opcoes.put("itens",em.createQuery("SELECT DISTINCT new map(f.servico.id as idServico,f.servico.nome as nomeServico) FROM "+entidade+" f ORDER BY f.servico.nome").setMaxResults(500).getResultList());
            }
        }
        return Map.of("content",exibicao,"totalElements",total,"totalPages",(int)Math.ceil((double)total/tamanho),"number",pagina,"resumo",resumo,"opcoes",opcoes);
    }
    private Path<?> campo(Path<?> root,String campo){
        Path<?> result=root;String[] partes=campo.split("\\.");
        for(int i=0;i<partes.length;i++) {
            String part=partes[i];
            if(i<partes.length-1 && result instanceof From<?,?> from) {
                var existente=from.getJoins().stream().filter(join->join.getAttribute().getName().equals(part)).findFirst();
                result=existente.isPresent()?existente.get():from.join(part,JoinType.LEFT);
            } else result=result.get(part);
        }
        return result;
    }
    private long contatos(String tabela) {
        // Nomes de tabela são constantes internas, sem interpolar entrada do usuário.
        return ((Number)em.createNativeQuery("SELECT COUNT(*) FROM (SELECT REGEXP_REPLACE(COALESCE(telefone,''),'[^0-9]','') AS numero FROM "+tabela+") contatos WHERE LENGTH(numero) IN (12,13) OR (numero NOT LIKE '55%' AND LENGTH(numero) IN (8,9,10,11))").getSingleResult()).longValue();
    }
    private Predicate[] predicados(CriteriaBuilder cb,Root<?> root,Cadastro cadastro,String busca,Map<String,String> params,AbstractQuery<?> query){
        var result=new ArrayList<Predicate>();
        if(cadastro.entidade()==Fornecedor.class && params.containsKey("tipoFornecimento")) {
            String tipo=params.get("tipoFornecimento");
            if(!Set.of("PECAS","SERVICOS").contains(tipo))throw new IllegalArgumentException("Tipo de fornecimento inválido.");
            result.add(cb.lower(cb.trim(root.get("itemFornecido"))).in(tipo.equals("PECAS")?CategoriasFornecedor.PECAS:CategoriasFornecedor.SERVICOS));
        }
        if(cadastro.entidade()==Usuario.class && params.get("inicioDisponivel")!=null && !params.get("inicioDisponivel").isBlank()) {
            var inicio=java.time.LocalDateTime.parse(params.get("inicioDisponivel"));var fim=java.time.LocalDateTime.parse(params.getOrDefault("fimDisponivel",""));
            if(!fim.isAfter(inicio)||java.time.Duration.between(inicio,fim).toDays()>31)throw new IllegalArgumentException("Informe um período válido, com duração máxima de 31 dias.");
            var ocupacao=query.subquery(Long.class);var agendamento=ocupacao.from(Agendamento.class);
            ocupacao.select(agendamento.get("id")).where(cb.equal(agendamento.get("responsavel").get("id"),root.get("id")),
                cb.notEqual(agendamento.get("id"),Long.valueOf(params.getOrDefault("ignorarAgendamento","0"))),
                agendamento.get("statusAgendamento").in("CONFIRMADO","EM_ATENDIMENTO"),
                cb.lessThan(agendamento.get("dataHoraInicio"),fim),cb.greaterThan(agendamento.get("dataHoraFim"),inicio));
            result.add(cb.not(cb.exists(ocupacao)));
        }
        if (cadastro.entidade()==Usuario.class && params.containsKey("perfis")) {
            var perfis=Arrays.asList(params.get("perfis").split(","));
            if(perfis.isEmpty()||!Set.of("CLIENTE","COLABORADOR","ADMINISTRADOR").containsAll(perfis))throw new IllegalArgumentException("Perfil inválido.");
            result.add(root.get("tipo_do_acesso").in(perfis));
        }
        if(cadastro.entidade()==Usuario.class && params.containsKey("excluirIds") && !params.get("excluirIds").isBlank()) {
            var ids=Arrays.stream(params.get("excluirIds").split(",")).map(Long::valueOf).toList();
            if(ids.size()>100)throw new IllegalArgumentException("Limite de exclusões excedido.");
            result.add(cb.not(root.get("id").in(ids)));
        }
        if(!busca.isBlank()){String pattern="%"+busca.toLowerCase(Locale.ROOT).replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%";result.add(cb.or(cadastro.busca().stream().map(field->cb.like(cb.lower(campo(root,field).as(String.class)),pattern,'\\')).toArray(Predicate[]::new)));}
        for(String field:cadastro.filtros()){String value=params.get(field);if(value==null||value.isBlank())continue;var path=campo(root,field);Object typed=value;
            if(path.getJavaType()==Boolean.class||path.getJavaType()==boolean.class){if(!Set.of("true","false").contains(value))throw new IllegalArgumentException("Filtro inválido.");typed=Boolean.valueOf(value);}
            else if(Number.class.isAssignableFrom(path.getJavaType()))typed=Long.valueOf(value);
            result.add(cb.equal(path,typed));}
        if(cadastro.entidade()==Veiculo.class && params.get("vinculoProprietario")!=null && !params.get("vinculoProprietario").isBlank()) {
            String vinculo=params.get("vinculoProprietario");if(!Set.of("com","sem","whatsapp").contains(vinculo))throw new IllegalArgumentException("Filtro de proprietário inválido.");
            var dono=query.subquery(Long.class);var usuario=dono.from(Usuario.class);var conditions=new ArrayList<Predicate>();conditions.add(cb.equal(usuario.get("id"),root.get("idProprietario")));
            if(vinculo.equals("whatsapp")) {
                var numero=cb.function("REGEXP_REPLACE",String.class,cb.coalesce(usuario.get("telefone"),""),cb.literal("[^0-9]"),cb.literal(""));
                conditions.add(cb.or(cb.length(numero).in(12,13),cb.and(cb.notLike(numero,"55%"),cb.length(numero).in(8,9,10,11))));
            }
            dono.select(usuario.get("id")).where(conditions.toArray(Predicate[]::new));result.add(vinculo.equals("sem")?cb.not(cb.exists(dono)):cb.exists(dono));
        }
        return result.toArray(Predicate[]::new);
    }
    private long contar(Cadastro cadastro,String campo,Object valor){var cb=em.getCriteriaBuilder();var query=cb.createQuery(Long.class);var root=query.from(cadastro.entidade());query.select(cb.count(root));if(campo!=null)query.where(cb.equal(root.get(campo),valor));return em.createQuery(query).getSingleResult();}
    private long distintos(Cadastro cadastro,String campo){var cb=em.getCriteriaBuilder();var query=cb.createQuery(Long.class);var root=query.from(cadastro.entidade());query.select(cb.countDistinct(campo(root,campo)));return em.createQuery(query).getSingleResult();}
    private Object mapear(Cadastro cadastro,Object row){
        if(row instanceof Veiculo || row instanceof FornecimentoPecas)return row;
        try{String className=cadastro.entidade().getSimpleName()+"Mapper";Class<?> mapperType=Class.forName("com.clinicar.backend.mapper."+className);return mapperType.getMethod("toResponse",cadastro.entidade()).invoke(beans.getBean(mapperType),row);}
        catch(Exception error){throw new IllegalStateException("Não foi possível preparar o cadastro para exibição.",error);}
    }
}
