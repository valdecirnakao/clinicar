package com.clinicar.backend.service;

import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@lombok.extern.slf4j.Slf4j
public class AlertaManutencaoService {
    @org.springframework.beans.factory.annotation.Autowired private NotificacaoOutboxService outbox;
    @Value("${clinicar.notificacoes.outbox-enabled:true}") private boolean outboxEnabled;
    private final ConfiguracaoAlertaManutencaoRepository configuracoes;
    private final EnvioAlertaManutencaoRepository envios;
    private final PrevisaoManutencaoVeiculoRepository previsoes;
    private final UsuarioRepository usuarios;
    private final WhatsAppService whatsapp;
    private final Validator validator;
    private final TransactionTemplate tx;
    private final boolean whatsappHabilitado;

    public AlertaManutencaoService(ConfiguracaoAlertaManutencaoRepository configuracoes,
            EnvioAlertaManutencaoRepository envios, PrevisaoManutencaoVeiculoRepository previsoes,
            UsuarioRepository usuarios, WhatsAppService whatsapp, Validator validator,
            PlatformTransactionManager transactionManager,
            @Value("${clinicar.manutencao.whatsapp.habilitado:false}") boolean whatsappHabilitado) {
        this.configuracoes = configuracoes; this.envios = envios; this.previsoes = previsoes;
        this.usuarios = usuarios; this.whatsapp = whatsapp; this.validator = validator;
        this.tx = new TransactionTemplate(transactionManager); this.whatsappHabilitado = whatsappHabilitado;
    }

    public ConfiguracaoAlertaManutencao consultar(Long usuarioId) {
        validarUsuario(usuarioId);
        return configuracoes.findById(usuarioId).orElseGet(() -> {
            var c = new ConfiguracaoAlertaManutencao(); c.setId(usuarioId); return c;
        });
    }
    public record ClienteConfiguracao(Long usuarioId, String nome, String email, String telefone, String statusUsuario,
            boolean configurada, ConfiguracaoAlertaManutencao configuracao) {}

    public org.springframework.data.domain.Page<ClienteConfiguracao> listarClientes(String busca, int pagina, int tamanho, String ordenar, boolean decrescente) {
        String coluna = List.of("nome", "email").contains(ordenar) ? ordenar : "nome";
        var ordenacao = Sort.by(decrescente ? Sort.Direction.DESC : Sort.Direction.ASC, coluna).and(Sort.by("id"));
        var usuariosPagina = usuarios.listarClientesAlertas(busca == null ? "" : busca.strip().toLowerCase(Locale.ROOT),
                PageRequest.of(Math.max(0, pagina), Math.max(1, Math.min(50, tamanho)), ordenacao));
        var existentes = configuracoes.findAllById(usuariosPagina.getContent().stream().map(Usuario::getId).toList())
                .stream().collect(java.util.stream.Collectors.toMap(ConfiguracaoAlertaManutencao::getId, c -> c));
        return usuariosPagina.map(u -> {
            var c = existentes.get(u.getId()); boolean configurada = c != null;
            if (c == null) { c = new ConfiguracaoAlertaManutencao(); c.setId(u.getId()); }
            return new ClienteConfiguracao(u.getId(), u.getNome(), u.getEmail(), u.getTelefone(), u.getStatus(), configurada, c);
        });
    }
    private void validarUsuario(Long usuarioId) {
        if (usuarioId == null || !usuarios.existsById(usuarioId))
            throw new IllegalArgumentException("Selecione um usuário cadastrado.");
    }

    public ConfiguracaoAlertaManutencao salvar(Long usuarioId, ConfiguracaoAlertaManutencao entrada) {
        validarUsuario(usuarioId);
        if (entrada == null || !validator.validate(entrada).isEmpty())
            throw new IllegalArgumentException("Preencha os parâmetros dentro dos limites informados.");
        if (entrada.getHoraFim() <= entrada.getHoraInicio())
            throw new IllegalArgumentException("O horário final deve ser posterior ao inicial.");
        try { ZoneId.of(entrada.getFusoHorario()); }
        catch (DateTimeException e) { throw new IllegalArgumentException("Fuso horário inválido."); }
        return tx.execute(status -> {
            // Também serializa a primeira criação, quando ainda não existe configuração.
            usuarios.buscarParaAtualizacao(usuarioId).orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
            ConfiguracaoAlertaManutencao atual = configuracoes.bloquear(usuarioId).orElse(null);
            if (atual != null && !Objects.equals(atual.getVersao(), entrada.getVersao()))
                throw new IllegalArgumentException("A configuração foi alterada. Recarregue antes de salvar.");
            entrada.setId(usuarioId);
            return configuracoes.saveAndFlush(entrada);
        });
    }

    public List<EnvioAlertaManutencao> historico(Long usuarioId) {
        validarUsuario(usuarioId);
        return envios.findTop100ByProprietarioIdOrderByCriadoEmDesc(usuarioId);
    }

    /** Percorre páginas sem excluir registros do conjunto durante a varredura. */
    public void processar() {
        if (!whatsappHabilitado) return;
        int pagina = 0;
        org.springframework.data.domain.Page<PrevisaoManutencaoVeiculo> lote;
        do {
            lote = previsoes.findAll(PageRequest.of(pagina++, 100, Sort.by("id")));
            for (PrevisaoManutencaoVeiculo p : lote.getContent()) {
                if (outboxEnabled) {
                    try {
                        tx.execute(status -> {
                            Entrega entrega=reservar(p.getId(), Instant.now());
                            if(entrega==null) return null;
                            String referencia=whatsapp.enviarAlertaManutencao(entrega.destinatario(), entrega.nome(), entrega.placa(), entrega.descricao(), entrega.data().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
                            outbox.vincular(referencia,"MANUTENCAO",entrega.id());
                            var envio=envios.findById(entrega.id()).orElseThrow();
                            envio.setStatus("PENDENTE"); envio.setDetalhe("Aguardando processamento da notificação."); envios.save(envio);
                            return null;
                        });
                    } catch (RuntimeException error) { log.error("Não foi possível registrar a notificação da previsão {}.",p.getId()); }
                    continue;
                }
                Entrega entrega;
                try { entrega = tx.execute(status -> reservar(p.getId(), Instant.now())); }
                catch (RuntimeException e) {
                    log.error("Falha ao reservar alerta da previsão {}: {}", p.getId(), e.getClass().getSimpleName());
                    continue;
                }
                if (entrega == null) continue;
                try {
                    whatsapp.enviarAlertaManutencao(entrega.destinatario(), entrega.nome(),
                            entrega.placa(), entrega.descricao(),
                            entrega.data().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
                } catch (Exception e) {
                    finalizar(entrega.id(), "ERRO", "Envio não confirmado. Verifique a Meta antes de conciliar.");
                    continue;
                }
                // ENVIADO significa aceito pela API; a entrega depende do status assíncrono da Meta.
                finalizar(entrega.id(), "ENVIADO", "Aceito pela API do WhatsApp; entrega não confirmada.");
            }
        } while (lote.hasNext());
    }

    private Entrega reservar(Long previsaoId, Instant agora) {
        PrevisaoManutencaoVeiculo p = previsoes.findById(previsaoId).orElse(null);
        if (p == null) return null;
        Long donoId = p.getVeiculo().getIdProprietario();
        if (donoId == null) return null;
        // A configuração do proprietário atual serializa reservas entre instâncias.
        ConfiguracaoAlertaManutencao c = configuracoes.bloquear(donoId).orElse(null);
        if (c == null || !PoliticaAlertaManutencao.elegivel(c, p,
                envios.findByPrevisaoIdAndProprietarioIdOrderByCriadoEmDesc(previsaoId, donoId), agora)) return null;
        Usuario dono = usuarios.findById(donoId).orElse(null);
        if (dono == null || !"ATIVO".equalsIgnoreCase(dono.getStatus())
                || dono.getTelefone() == null || dono.getTelefone().isBlank()) return null;
        EnvioAlertaManutencao envio = new EnvioAlertaManutencao();
        envio.setPrevisaoId(previsaoId); envio.setProprietarioId(donoId); envio.setDestinatario(dono.getTelefone());
        envio.setStatus("EM_PROCESSAMENTO"); envio.setCriadoEm(agora);
        envios.saveAndFlush(envio);
        return new Entrega(envio.getId(), dono.getTelefone(), dono.getNome(), p.getVeiculo().getPlaca(),
                p.getDescricao(), p.getDataRecomendada());
    }

    private void finalizar(Long id, String status, String detalhe) {
        tx.executeWithoutResult(txStatus -> {
            var proprietarioId = envios.buscarProprietario(id).orElseThrow();
            configuracoes.bloquear(proprietarioId);
            EnvioAlertaManutencao e = envios.buscarParaAtualizacao(id).orElseThrow();
            e.setStatus(status); e.setDetalhe(detalhe); e.setFinalizadoEm(Instant.now()); envios.save(e);
        });
    }

    /** Conciliação explícita após verificar o provedor; nunca repete automaticamente um resultado incerto. */
    public void conciliar(Long id, boolean enviado) {
        tx.executeWithoutResult(txStatus -> {
            var proprietarioId = envios.buscarProprietario(id)
                    .orElseThrow(() -> new IllegalArgumentException("Envio não encontrado."));
            configuracoes.bloquear(proprietarioId);
            // Recarrega após obter o bloqueio para observar uma conciliação concorrente.
            EnvioAlertaManutencao e = envios.buscarParaAtualizacao(id)
                    .orElseThrow(() -> new IllegalArgumentException("Envio não encontrado."));
            if (!List.of("ERRO", "EM_PROCESSAMENTO").contains(e.getStatus()))
                throw new IllegalArgumentException("Este envio já foi conciliado.");
            if ("EM_PROCESSAMENTO".equals(e.getStatus()) && e.getCriadoEm().plusSeconds(600).isAfter(Instant.now()))
                throw new IllegalArgumentException("Aguarde dez minutos antes de conciliar um processamento.");
            e.setStatus(enviado ? "ENVIADO" : "LIBERADO");
            e.setDetalhe(enviado ? "Envio confirmado pelo administrador." : "Administrador autorizou nova tentativa.");
            e.setFinalizadoEm(Instant.now()); envios.save(e);
        });
    }
    private record Entrega(Long id, String destinatario, String nome, String placa, String descricao, LocalDate data) {}
}
