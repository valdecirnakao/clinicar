package com.clinicar.backend.service;

import com.clinicar.backend.repository.EstoquePecaRepository;
import com.clinicar.backend.repository.ConfiguracaoAlertaEstoqueRepository;
import com.clinicar.backend.repository.AlertaEstoquePecaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@Service
@lombok.extern.slf4j.Slf4j
public class ProcessamentoAlertaEstoqueService {
    private final EstoquePecaRepository estoques;
    private final ConfiguracaoAlertaEstoqueRepository configuracoes;
    private final AlertaEstoquePecaRepository alertas;
    private final AlertaEstoquePecaService service;
    private final TransactionTemplate tx;
    public ProcessamentoAlertaEstoqueService(EstoquePecaRepository estoques, ConfiguracaoAlertaEstoqueRepository configuracoes,
            AlertaEstoquePecaRepository alertas, AlertaEstoquePecaService service, PlatformTransactionManager manager) {
        this.estoques = estoques; this.configuracoes = configuracoes; this.alertas = alertas; this.service = service;
        this.tx = new TransactionTemplate(manager);
    }
    public record Resultado(int estoquesVerificados, int enviosAceitos, int falhas) {}
    public Resultado processar(boolean somentePendentes) {
        if (configuracoes.findFirstByAtivoTrueOrderByIdAsc().isEmpty()) {
            if (somentePendentes) throw new IllegalArgumentException("Configure e ative os alertas de estoque na página Alertas antes de reenviar.");
            return new Resultado(0, 0, 0);
        }
        int pagina = 0, verificados = 0, aceitos = 0, falhas = 0;
        org.springframework.data.domain.Page<com.clinicar.backend.model.EstoquePeca> lote;
        do {
            lote = estoques.findAll(PageRequest.of(pagina++, 100, Sort.by("id")));
            for (var registro : lote.getContent()) {
                try {
                    int[] resultado = tx.execute(status -> {
                        var estoque = estoques.buscarComLockPorId(registro.getId()).orElse(null);
                        if (estoque == null || !Boolean.TRUE.equals(estoque.getAtivo())) return new int[]{0, 0, 0};
                        var abertos = alertas.findByEstoquePeca_IdAndStatusAlerta(estoque.getId(), "ABERTO");
                        if (somentePendentes && abertos.stream().noneMatch(a -> !Boolean.TRUE.equals(a.getWhatsappEnviado()))) return new int[]{0, 0, 0};
                        var inicio = java.time.LocalDateTime.now();
                        service.avaliarEEnviarAlertaSeNecessario(estoque, "ACOMPANHAMENTO_ESTOQUE", null, somentePendentes);
                        var depois = alertas.findByEstoquePeca_IdAndStatusAlerta(estoque.getId(), "ABERTO");
                        boolean enviou = depois.stream().anyMatch(a -> a.getUltimaTentativaEm() != null && !a.getUltimaTentativaEm().isBefore(inicio) && Boolean.TRUE.equals(a.getWhatsappEnviado()));
                        boolean erro = depois.stream().anyMatch(a -> a.getUltimoErro() != null);
                        return new int[]{1, enviou ? 1 : 0, erro ? 1 : 0};
                    });
                    if (resultado != null) { verificados += resultado[0]; aceitos += resultado[1]; falhas += resultado[2]; }
                } catch (RuntimeException e) { falhas++; log.error("Falha no acompanhamento do estoque {}: {}", registro.getId(), e.getClass().getSimpleName()); }
            }
        } while (lote.hasNext());
        return new Resultado(verificados, aceitos, falhas);
    }
}
