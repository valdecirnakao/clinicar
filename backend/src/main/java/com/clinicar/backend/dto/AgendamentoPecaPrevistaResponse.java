package com.clinicar.backend.dto;

import java.math.BigDecimal;

public record AgendamentoPecaPrevistaResponse(
        Long id, Long idPeca, String nomePeca, String descricaoPeca,
        String fabricantePeca, String modeloPeca, Long idEstoquePeca,
        Long idFornecedor, String razaoSocialFornecedor, BigDecimal quantidade,
        String unidadeMedida, BigDecimal valorUnitario, BigDecimal valorTotal,
        String observacoes) {
}
