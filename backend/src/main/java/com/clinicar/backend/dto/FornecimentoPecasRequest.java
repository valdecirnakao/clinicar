package com.clinicar.backend.dto;
import lombok.Data;
@Data
public class FornecimentoPecasRequest {
    private Long idFornecedor;
    private Long idPeca;
    private String valorCusto;
    private String prazoEntregaDias;
    private String quantidadeMinima;
    private String ativo;
    private String dataCadastro;
}