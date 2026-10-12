package com.clinicar.backend.dto;
import java.time.LocalDateTime;
public record RegraManutencaoPreventivaResponse(
            Long id,
            String grupoManutencao,
            String descricao,
            Long idServico,
            String nomeServico,
            Long idPeca,
            String nomePeca,
            String origemOleo,
            Integer intervaloKm,
            Integer intervaloDias,
            Integer prioridade,
            Boolean ativo,
            String observacoes,
            LocalDateTime criadoEm,
            LocalDateTime atualizadoEm
    ) {
    }
