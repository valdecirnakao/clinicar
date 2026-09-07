package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.PecaRequest;
import com.clinicar.backend.dto.PecaResponse;
import com.clinicar.backend.model.Peca;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;

@Component
public class PecaMapper {

    public PecaResponse toResponse(Peca peca) {
        if (peca == null) {
            return null;
        }

        PecaResponse response = new PecaResponse();

        response.setId(peca.getId());
        response.setNome(peca.getNome());
        response.setDescricao(peca.getDescricao());
        response.setTipo(peca.getTipo());
        response.setOrigemOleo(peca.getOrigemOleo());

        response.setEspecificacao(peca.getEspecificacao());
        response.setFabricante(peca.getFabricante());
        response.setModelo(peca.getModelo());
        response.setNorma(peca.getNorma());
        response.setUnidade(peca.getUnidade());
        response.setUnidadeMedida(peca.getUnidade());

        response.setObservacoes(peca.getObservacoes());
        response.setCriadoEm(peca.getCriadoEm());
        response.setAtualizadoEm(peca.getAtualizadoEm());

        return response;
    }

    public List<PecaResponse> toResponseList(List<Peca> pecas) {
        if (pecas == null || pecas.isEmpty()) {
            return List.of();
        }

        return pecas
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public void preencherEntidade(Peca peca, PecaRequest request) {
        if (peca == null || request == null) {
            return;
        }

        peca.setNome(limparTexto(request.getNome()));
        peca.setDescricao(limparTexto(request.getDescricao()));
        peca.setTipo(limparTexto(request.getTipo()));
        peca.setOrigemOleo(normalizarOrigemOleo(request.getOrigemOleo()));

        peca.setEspecificacao(limparTexto(request.getEspecificacao()));
        peca.setFabricante(limparTexto(request.getFabricante()));
        peca.setModelo(limparTexto(request.getModelo()));
        peca.setNorma(limparTexto(request.getNorma()));
        peca.setUnidade(limparTexto(request.getUnidade()));
        peca.setObservacoes(limparTexto(request.getObservacoes()));
    }

    private String limparTexto(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        return valor.trim();
    }

    private String normalizarOrigemOleo(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        String origem = valor.trim().toUpperCase(Locale.ROOT);

        if (!"MINERAL".equals(origem) && !"SINTETICO".equals(origem)) {
            throw new IllegalArgumentException(
                    "Origem do óleo inválida. Use MINERAL ou SINTETICO."
            );
        }

        return origem;
    }
}
