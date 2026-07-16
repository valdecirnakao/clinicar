package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.ServicoResponse;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.Servico;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ServicoMapper {

    public ServicoResponse toResponse(Servico servico) {
        if (servico == null) {
            return null;
        }

        ServicoResponse response = new ServicoResponse();

        response.setId(servico.getId());
        response.setNome(servico.getNome());
        response.setDescricao(servico.getDescricao());
        response.setCategoria(servico.getCategoria());
        response.setTipoDoPrestador(servico.getTipoDoPrestador());

        response.setDuracaoEstimada(servico.getDuracaoEstimada());
        response.setUnidadeDuracao(servico.getUnidadeDuracao());

        response.setValorBase(servico.getValorBase());
        response.setUnidadeCobranca(servico.getUnidadeCobranca());

        response.setGarantiaDias(servico.getGarantiaDias());
        response.setNecessitaPecas(servico.getNecessitaPecas());
        response.setAtivo(servico.getAtivo());

        response.setObservacoes(servico.getObservacoes());

        Fornecedor fornecedor = servico.getFornecedor();

        if (fornecedor != null) {
            response.setIdFornecedor(fornecedor.getId());
            response.setRazaoSocialFornecedor(fornecedor.getRazaoSocial());
        }

        response.setCriadoEm(servico.getCriadoEm());
        response.setAtualizadoEm(servico.getAtualizadoEm());

        return response;
    }

    public List<ServicoResponse> toResponseList(List<Servico> servicos) {
        return servicos
                .stream()
                .map(this::toResponse)
                .toList();
    }
}