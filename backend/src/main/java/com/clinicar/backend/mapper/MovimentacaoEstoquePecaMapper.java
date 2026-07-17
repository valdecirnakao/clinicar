package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.MovimentacaoEstoquePecaResponse;
import com.clinicar.backend.model.MovimentacaoEstoquePeca;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class MovimentacaoEstoquePecaMapper {

    public MovimentacaoEstoquePecaResponse toResponse(MovimentacaoEstoquePeca mov) {
        if (mov == null) {
            return null;
        }

        MovimentacaoEstoquePecaResponse response = new MovimentacaoEstoquePecaResponse();

        response.setId(mov.getId());

        if (mov.getEstoquePeca() != null) {
            response.setIdEstoquePeca(mov.getEstoquePeca().getId());
        }

        if (mov.getPeca() != null) {
            response.setIdPeca(mov.getPeca().getId());
            response.setNomePeca(mov.getPeca().getNome());
        }

        response.setTipoMovimento(mov.getTipoMovimento());
        response.setQuantidade(mov.getQuantidade());
        response.setSaldoAnterior(mov.getSaldoAnterior());
        response.setSaldoPosterior(mov.getSaldoPosterior());

        response.setValorUnitario(mov.getValorUnitario());
        response.setValorTotal(mov.getValorTotal());

        response.setOrigem(mov.getOrigem());
        response.setDocumentoReferencia(mov.getDocumentoReferencia());
        response.setMotivo(mov.getMotivo());
        response.setObservacoes(mov.getObservacoes());

        response.setIdUsuario(mov.getIdUsuario());
        response.setCriadoEm(mov.getCriadoEm());

        return response;
    }

    public List<MovimentacaoEstoquePecaResponse> toResponseList(
            List<MovimentacaoEstoquePeca> movimentacoes
    ) {
        return movimentacoes.stream().map(this::toResponse).toList();
    }
}