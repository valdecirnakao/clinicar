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

    public ConfiguracaoAlertaManutencao consultar() {
        return configuracoes.findById(1L).orElseGet(ConfiguracaoAlertaManutencao::new);
    }

    public ConfiguracaoAlertaManutencao salvar(ConfiguracaoAlertaManutencao entrada) {
        if (entrada == null || !validator.validate(entrada).isEmpty())
            throw new IllegalArgumentException("Preencha os parâmetros dentro dos limites informados.");
        if (entrada.getHoraFim() <= entrada.getHoraInicio())
            throw new IllegalArgumentException("O horário final deve ser posterior ao inicial.");
        try { ZoneId.of(entrada.getFusoHorario()); }
        catch (DateTimeException e) { throw new IllegalArgumentException("Fuso horário inválido."); }
        return tx.execute(status -> {
            ConfiguracaoAlertaManutencao atual = configuracoes.bloquear().orElse(null);
            if (atual != null && !Objects.equals(atual.getVersao(), entrada.getVersao()))
                throw new IllegalArgumentException("A configuração foi alterada. Recarregue antes de salvar.");
            entrada.setId(1L);
            return configuracoes.saveAndFlush(entrada);
        });
    }

    public List<EnvioAlertaManutencao> historico() { return envios.findTop100ByOrderByCriadoEmDesc(); }

    /** Percorre páginas sem excluir registros do conjunto durante a varredura. */
    public void processar() {
        if (!whatsappHabilitado || !Boolean.TRUE.equals(consultar().getAtivo())) return;
        int pagina = 0;
        org.springframework.data.domain.Page<PrevisaoManutencaoVeiculo> lote;
        do {
            lote = previsoes.findAll(PageRequest.of(pagina++, 100, Sort.by("id")));
            for (PrevisaoManutencaoVeiculo p : lote.getContent()) {
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
        // A linha única serializa reservas entre instâncias; o registro é confirmado antes da API externa.
        ConfiguracaoAlertaManutencao c = configuracoes.bloquear().orElse(null);
        if (c == null) return null;
        PrevisaoManutencaoVeiculo p = previsoes.findById(previsaoId).orElse(null);
        if (p == null || !PoliticaAlertaManutencao.elegivel(c, p,
                envios.findByPrevisaoIdOrderByCriadoEmDesc(previsaoId), agora)) return null;
        Long donoId = p.getVeiculo().getIdProprietario();
        if (donoId == null) return null;
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
            configuracoes.bloquear();
            EnvioAlertaManutencao e = envios.findById(id).orElseThrow();
            e.setStatus(status); e.setDetalhe(detalhe); e.setFinalizadoEm(Instant.now()); envios.save(e);
        });
    }

    /** Conciliação explícita após verificar o provedor; nunca repete automaticamente um resultado incerto. */
    public void conciliar(Long id, boolean enviado) {
        tx.executeWithoutResult(txStatus -> {
            configuracoes.bloquear();
            EnvioAlertaManutencao e = envios.findById(id)
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
