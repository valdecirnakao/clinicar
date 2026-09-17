package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.PecaRequest;
import com.clinicar.backend.dto.PecaResponse;
import com.clinicar.backend.model.Peca;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
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
        response.setViscosidadeSae(peca.getViscosidadeSae());
        response.setClassificacaoApi(peca.getClassificacaoApi());
        response.setClassificacaoAcea(peca.getClassificacaoAcea());
        response.setNormaOem(peca.getNormaOem());

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

        if (ehOleoMotor(request.getTipo())) {
            peca.setOrigemOleo(normalizarOrigemOleo(request.getOrigemOleo()));
            peca.setViscosidadeSae(normalizarViscosidadeSae(request.getViscosidadeSae()));
            peca.setClassificacaoApi(limparTextoCaixaAlta(request.getClassificacaoApi()));
            peca.setClassificacaoAcea(limparTextoCaixaAlta(request.getClassificacaoAcea()));
            peca.setNormaOem(limparTextoCaixaAlta(request.getNormaOem()));
        } else {
            peca.setOrigemOleo(null);
            peca.setViscosidadeSae(null);
            peca.setClassificacaoApi(null);
            peca.setClassificacaoAcea(null);
            peca.setNormaOem(null);
        }

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

    private String limparTextoCaixaAlta(String valor) {
        String limpo = limparTexto(valor);
        return limpo == null ? null : limpo.toUpperCase(Locale.ROOT);
    }

    private String normalizarOrigemOleo(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        String origem = Normalizer
                .normalize(valor.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace("-", "")
                .replace(" ", "")
                .toUpperCase(Locale.ROOT);

        if (!"MINERAL".equals(origem)
                && !"SEMISSINTETICO".equals(origem)
                && !"SINTETICO".equals(origem)) {
            throw new IllegalArgumentException(
                    "Origem do óleo inválida. Use MINERAL, SEMISSINTETICO ou SINTETICO."
            );
        }

        return origem;
    }

    private String normalizarViscosidadeSae(String valor) {
        String limpo = limparTextoCaixaAlta(valor);

        if (limpo == null) {
            return null;
        }

        String compacto = limpo.replaceAll("\\s+", "");

        if (compacto.matches("\\d{1,2}W\\d{2}")) {
            int posicaoW = compacto.indexOf('W');
            return compacto.substring(0, posicaoW + 1) + "-" + compacto.substring(posicaoW + 1);
        }

        if (compacto.matches("\\d{1,2}W-\\d{2}")) {
            return compacto;
        }

        if (compacto.matches("SAE\\d{2,3}")) {
            return "SAE " + compacto.substring(3);
        }

        return limpo;
    }

    private boolean ehOleoMotor(String tipo) {
        if (tipo == null || tipo.isBlank()) {
            return false;
        }

        String normalizado = Normalizer
                .normalize(tipo, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();

        return "oleo de motor".equals(normalizado);
    }
}
