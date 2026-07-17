package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.FornecimentoServicoResponse;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.FornecimentoServico;
import com.clinicar.backend.model.Servico;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class FornecimentoServicoMapper {

    public FornecimentoServicoResponse toResponse(FornecimentoServico fornecimento) {
        if (fornecimento == null) {
            return null;
        }

        FornecimentoServicoResponse response = new FornecimentoServicoResponse();

        response.setId(fornecimento.getId());

        Fornecedor fornecedor = fornecimento.getFornecedor();

        if (fornecedor != null) {
            response.setIdFornecedor(fornecedor.getId());
            response.setRazaoSocialFornecedor(fornecedor.getRazaoSocial());
            response.setCnpjFornecedor(fornecedor.getCnpj());
        }

        Servico servico = fornecimento.getServico();

        if (servico != null) {
            response.setIdServico(servico.getId());
            response.setNomeServico(servico.getNome());
            response.setCategoriaServico(servico.getCategoria());
        }

        response.setValorCusto(fornecimento.getValorCusto());
        response.setUnidadeCobranca(fornecimento.getUnidadeCobranca());

        response.setPrazoExecucao(fornecimento.getPrazoExecucao());
        response.setUnidadePrazo(fornecimento.getUnidadePrazo());

        response.setQuantidadeMinima(fornecimento.getQuantidadeMinima());
        response.setDisponibilidade(fornecimento.getDisponibilidade());
        response.setContratoReferencia(fornecimento.getContratoReferencia());

        response.setDataInicioVigencia(fornecimento.getDataInicioVigencia());
        response.setDataFimVigencia(fornecimento.getDataFimVigencia());

        response.setAtivo(fornecimento.getAtivo());
        response.setObservacoes(fornecimento.getObservacoes());

        response.setCriadoEm(fornecimento.getCriadoEm());
        response.setAtualizadoEm(fornecimento.getAtualizadoEm());

        return response;
    }

    public List<FornecimentoServicoResponse> toResponseList(
            List<FornecimentoServico> fornecimentos
    ) {
        return fornecimentos
                .stream()
                .map(this::toResponse)
                .toList();
    }
}