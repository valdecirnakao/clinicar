package com.clinicar.backend.service;

import com.clinicar.backend.model.Agendamento;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.AtendimentoOrcamento;
import com.clinicar.backend.model.Usuario;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Avisos transacionais. O evento e a entrada na fila participam da mesma transação. */
@Service
public class AvisosServicoWhatsappService {
    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");
    private final NotificacaoOutboxService outbox;

    @Value("${clinicar.whatsapp.avisos-servico-habilitados:false}")
    private boolean habilitados;

    public AvisosServicoWhatsappService(NotificacaoOutboxService outbox) {
        this.outbox = outbox;
    }

    public void confirmado(Agendamento a) {
        enfileirar(a.getCliente(), "clinicar_agendamento_confirmado", "agendamento-confirmado:" + a.getId()
                + ":" + a.getConfirmadoEm(), "AGENDAMENTO", a.getId(),
                List.of(nome(a.getCliente()), veiculo(a.placaVeiculoDoAgendamento()), data(a.getDataHoraInicio()),
                        hora(a.getDataHoraInicio()), texto(a.getServico().getNome()), texto(a.getCodigoAgendamento())));
    }

    public boolean lembrete(Agendamento a) {
        return enfileirar(a.getCliente(), "clinicar_lembrete_agendamento", "agendamento-lembrete:" + a.getId()
                + ":" + a.getDataHoraInicio(), "AGENDAMENTO", a.getId(),
                List.of(nome(a.getCliente()), veiculo(a.placaVeiculoDoAgendamento()), data(a.getDataHoraInicio()),
                        hora(a.getDataHoraInicio()), texto(a.getCodigoAgendamento())));
    }

    public void reagendado(Agendamento a, LocalDateTime inicioAnterior) {
        enfileirar(a.getCliente(), "clinicar_agendamento_reagendado", "agendamento-reagendado:" + a.getId()
                + ":" + a.getDataHoraInicio(), "AGENDAMENTO", a.getId(),
                List.of(nome(a.getCliente()), veiculo(a.placaVeiculoDoAgendamento()), data(inicioAnterior),
                        hora(inicioAnterior), data(a.getDataHoraInicio()), hora(a.getDataHoraInicio()),
                        texto(a.getCodigoAgendamento())));
    }

    public void orcamento(AtendimentoOrcamento o) {
        Atendimento a = o.getAtendimento();
        enfileirar(a.getCliente(), "clinicar_orcamento_aguardando_aprovacao", "orcamento-pendente:" + o.getId(),
                "ORCAMENTO", o.getId(), List.of(nome(a.getCliente()), texto(a.getCodigoAtendimento()),
                        veiculo(a.placaVeiculoDoAtendimento()), moeda(o.getValorTotal())));
    }

    public void prontoRetirada(Atendimento a) {
        enfileirar(a.getCliente(), "clinicar_veiculo_pronto_retirada", "atendimento-pronto:" + a.getId(),
                "ATENDIMENTO", a.getId(), List.of(nome(a.getCliente()),
                        veiculo(a.placaVeiculoDoAtendimento()), texto(a.getCodigoAtendimento())));
    }

    private boolean enfileirar(Usuario cliente, String template, String chave, String origem, Long id,
                           List<String> parametros) {
        if (!habilitados || cliente == null || !Boolean.TRUE.equals(cliente.getAvisosServicoWhatsapp())
                || !"ATIVO".equalsIgnoreCase(cliente.getStatus())) return false;
        String telefone = cliente.getTelefone() == null ? "" : cliente.getTelefone().replaceAll("\\D", "");
        if (telefone.length() == 10 || telefone.length() == 11) telefone = "55" + telefone;
        if (telefone.length() < 12 || telefone.length() > 15) return false;
        var componentes = List.of(Map.of("type", "body", "parameters", parametros.stream()
                .map(valor -> Map.of("type", "text", "text", valor)).toList()));
        var body = Map.<String, Object>of("messaging_product", "whatsapp", "to", telefone, "type", "template",
                "template", Map.of("name", template, "language", Map.of("code", "pt_BR"),
                        "components", componentes));
        outbox.enfileirar(chave, telefone, template, "pt_BR", body, origem, id);
        return true;
    }

    private static String nome(Usuario u) {
        return texto(u.getNome_social() == null || u.getNome_social().isBlank() ? u.getNome() : u.getNome_social());
    }

    private static String veiculo(String placa) {
        if (placa == null) return "Não informado";
        String normalizada = placa.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        return normalizada.length() == 7
                ? normalizada.substring(0, 3) + "-" + normalizada.substring(3)
                : texto(placa);
    }

    private static String texto(String valor) {
        return valor == null || valor.isBlank() ? "Não informado" : valor.trim();
    }

    private static String data(LocalDateTime instante) { return instante.format(DATA); }
    private static String hora(LocalDateTime instante) { return instante.format(HORA); }
    private static String moeda(BigDecimal valor) {
        return NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR"))
                .format(valor == null ? BigDecimal.ZERO : valor);
    }
}
