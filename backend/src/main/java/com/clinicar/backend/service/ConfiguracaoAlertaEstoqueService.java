package com.clinicar.backend.service;

import com.clinicar.backend.model.ConfiguracaoAlertaEstoque;
import com.clinicar.backend.repository.ConfiguracaoAlertaEstoqueRepository;
import com.clinicar.backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
public class ConfiguracaoAlertaEstoqueService {
    private final ConfiguracaoAlertaEstoqueRepository configuracoes;
    private final UsuarioRepository usuarios;
    private final com.clinicar.backend.config.TemplateAlertaEstoqueConfig template;
    public ConfiguracaoAlertaEstoqueService(ConfiguracaoAlertaEstoqueRepository configuracoes, UsuarioRepository usuarios, com.clinicar.backend.config.TemplateAlertaEstoqueConfig template) {
        this.configuracoes = configuracoes; this.usuarios = usuarios; this.template = template;
    }
    public ConfiguracaoAlertaEstoque consultar() {
        return configuracoes.findById(1L).orElseGet(() -> {
            var c = new ConfiguracaoAlertaEstoque(); c.setAtivo(false); return c;
        });
    }
    @Transactional
    public ConfiguracaoAlertaEstoque salvar(ConfiguracaoAlertaEstoque entrada) {
        if (entrada == null || entrada.getAtivo() == null) throw new IllegalArgumentException("Informe se o envio está ativado.");
        if (entrada.getReenviarAlertaAposHoras() == null || entrada.getReenviarAlertaAposHoras() < 1 || entrada.getReenviarAlertaAposHoras() > 720)
            throw new IllegalArgumentException("O intervalo entre lembretes deve estar entre 1 e 720 horas.");
        var encontrado = configuracoes.bloquear();
        boolean registroRecriado = encontrado.isEmpty();
        if (registroRecriado) {
            configuracoes.criarPadraoSeAusente();
            encontrado = configuracoes.bloquear();
        }
        var atual = encontrado.orElseThrow(() -> new IllegalStateException("Não foi possível inicializar a configuração dos alertas de estoque."));
        if (!Objects.equals(atual.getVersao(), entrada.getVersao())
                && !(registroRecriado && entrada.getVersao() == null && Objects.equals(atual.getVersao(), 0L)))
            throw new IllegalArgumentException("A configuração foi alterada. Recarregue antes de salvar.");
        if (Boolean.TRUE.equals(entrada.getAtivo()) || entrada.getIdResponsavel() != null) {
            var usuario = usuarios.findById(entrada.getIdResponsavel() == null ? -1L : entrada.getIdResponsavel())
                    .orElseThrow(() -> new IllegalArgumentException("Selecione o responsável pelo estoque."));
            if (Boolean.TRUE.equals(entrada.getAtivo()) && (!"ATIVO".equalsIgnoreCase(usuario.getStatus())
                    || !"COLABORADOR".equalsIgnoreCase(usuario.getTipo_do_acesso())))
                throw new IllegalArgumentException("Selecione um colaborador ativo para receber alertas de atenção.");
            String telefone = usuario.getTelefone() == null ? "" : usuario.getTelefone().replaceAll("\\D", "");
            if (Boolean.TRUE.equals(entrada.getAtivo()) && !telefone.matches("[1-9][0-9]{9,14}"))
                throw new IllegalArgumentException("Cadastre um telefone com código do país e DDD para o colaborador responsável.");
            atual.setIdResponsavel(usuario.getId()); atual.setNomeResponsavel(usuario.getNome()); atual.setTelefoneAdministrador(telefone);
        }
        if (Boolean.TRUE.equals(entrada.getAtivo()) || entrada.getIdAdministradorCritico() != null) {
            var administrador = usuarios.findById(entrada.getIdAdministradorCritico() == null ? -1L : entrada.getIdAdministradorCritico())
                    .orElseThrow(() -> new IllegalArgumentException("Selecione um administrador para receber alertas críticos."));
            if (Boolean.TRUE.equals(entrada.getAtivo()) && (!"ATIVO".equalsIgnoreCase(administrador.getStatus())
                    || !"ADMINISTRADOR".equalsIgnoreCase(administrador.getTipo_do_acesso())))
                throw new IllegalArgumentException("Selecione um administrador ativo para receber alertas críticos.");
            String telefone = administrador.getTelefone() == null ? "" : administrador.getTelefone().replaceAll("\\D", "");
            if (Boolean.TRUE.equals(entrada.getAtivo()) && !telefone.matches("[1-9][0-9]{9,14}"))
                throw new IllegalArgumentException("Cadastre um telefone com código do país e DDD para o administrador responsável.");
            atual.setIdAdministradorCritico(administrador.getId());
            atual.setNomeAdministradorCritico(administrador.getNome());
            atual.setTelefoneAdministradorCritico(telefone);
        }
        atual.setAtivo(entrada.getAtivo()); atual.setTemplateWhatsapp(template.nome());
        atual.setIdiomaTemplate(template.idioma()); atual.setReenviarAlertaAposHoras(entrada.getReenviarAlertaAposHoras());
        // Um único registro governa os envios; evita configurações legadas concorrentes.
        for (var legado : configuracoes.findAll()) if (!Long.valueOf(1L).equals(legado.getId())) { legado.setAtivo(false); configuracoes.save(legado); }
        return configuracoes.saveAndFlush(atual);
    }
}
