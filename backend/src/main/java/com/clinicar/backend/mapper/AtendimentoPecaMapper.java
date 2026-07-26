package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.AtendimentoPecaResponse;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.AtendimentoPecaUtilizada;
import com.clinicar.backend.model.EstoquePeca;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.Peca;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AtendimentoPecaMapper {

    public AtendimentoPecaResponse toResponse(AtendimentoPecaUtilizada item) {
        if (item == null) {
            return null;
        }

        AtendimentoPecaResponse response = new AtendimentoPecaResponse();

        response.setId(item.getId());

        Atendimento atendimento = item.getAtendimento();

        if (atendimento != null) {
            response.setIdAtendimento(atendimento.getId());
            response.setCodigoAtendimento(atendimento.getCodigoAtendimento());
        }

        Peca peca = item.getPeca();

        if (peca != null) {
            response.setIdPeca(peca.getId());
            response.setNomePeca(peca.getNome());
        }

        EstoquePeca estoquePeca = item.getEstoquePeca();

        if (estoquePeca != null) {
            response.setIdEstoquePeca(estoquePeca.getId());
        }

        Fornecedor fornecedor = item.getFornecedor();

        if (fornecedor != null) {
            response.setIdFornecedor(fornecedor.getId());
            response.setRazaoSocialFornecedor(fornecedor.getRazaoSocial());
        }

        response.setQuantidade(item.getQuantidade());
        response.setValorUnitario(item.getValorUnitario());
        response.setValorTotal(item.getValorTotal());

        response.setUnidadeMedida(item.getUnidadeMedida());
        response.setObservacoes(item.getObservacoes());

        response.setCriadoEm(item.getCriadoEm());
        response.setAtualizadoEm(item.getAtualizadoEm());

        return response;
    }

    public List<AtendimentoPecaResponse> toResponseList(List<AtendimentoPecaUtilizada> itens) {
        return itens
                .stream()
                .map(this::toResponse)
                .toList();
    }
}