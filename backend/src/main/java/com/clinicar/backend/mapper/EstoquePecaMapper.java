package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.EstoquePecaResponse;
import com.clinicar.backend.model.EstoquePeca;
import com.clinicar.backend.model.LocalEstoque;
import com.clinicar.backend.model.Peca;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class EstoquePecaMapper {

    public EstoquePecaResponse toResponse(EstoquePeca estoque) {
        if (estoque == null) {
            return null;
        }

        EstoquePecaResponse response = new EstoquePecaResponse();

        response.setId(estoque.getId());

        Peca peca = estoque.getPeca();

        if (peca != null) {
            response.setIdPeca(peca.getId());
            response.setNomePeca(peca.getNome());
            response.setFabricantePeca(peca.getFabricante());
            response.setModeloPeca(peca.getModelo());
            response.setUnidadePeca(peca.getUnidade());
        }

        LocalEstoque local = estoque.getLocalEstoque();

        if (local != null) {
            response.setIdLocalEstoque(local.getId());
            response.setNomeLocalEstoque(local.getNome());
        }

        response.setQuantidadeAtual(estoque.getQuantidadeAtual());
        response.setQuantidadeReservada(estoque.getQuantidadeReservada());

        response.setEstoqueMinimo(estoque.getEstoqueMinimo());
        response.setEstoqueCritico(estoque.getEstoqueCritico());
        response.setEstoqueMaximo(estoque.getEstoqueMaximo());

        response.setPontoReposicao(estoque.getPontoReposicao());
        response.setQuantidadeReposicaoSugerida(estoque.getQuantidadeReposicaoSugerida());

        response.setCustoMedio(estoque.getCustoMedio());
        response.setLocalizacaoFisica(estoque.getLocalizacaoFisica());

        response.setStatusEstoque(estoque.getStatusEstoque());
        response.setAtivo(estoque.getAtivo());

        response.setCriadoEm(estoque.getCriadoEm());
        response.setAtualizadoEm(estoque.getAtualizadoEm());

        return response;
    }

    public List<EstoquePecaResponse> toResponseList(List<EstoquePeca> estoques) {
        return estoques.stream().map(this::toResponse).toList();
    }
}