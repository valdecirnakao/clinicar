package com.clinicar.backend.dto;
import java.util.List;
public record PaginaSolicitacoesAcesso(List<SolicitacaoAcessoResponse> itens, long total, int pagina,
        int tamanho, int totalPaginas, long pendentes) {}
