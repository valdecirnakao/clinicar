package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.AlertaEstoquePecaResponse;
import com.clinicar.backend.model.AlertaEstoquePeca;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AlertaEstoquePecaMapper {

    public AlertaEstoquePecaResponse toResponse(AlertaEstoquePeca alerta) {
        if (alerta == null) {
            return null;
        }

        AlertaEstoquePecaResponse response = new AlertaEstoquePecaResponse();

        response.setId(alerta.getId());

        if (alerta.getEstoquePeca() != null) {
            response.setIdEstoquePeca(alerta.getEstoquePeca().getId());

            if (alerta.getEstoquePeca().getLocalEstoque() != null) {
                response.setNomeLocalEstoque(alerta.getEstoquePeca().getLocalEstoque().getNome());
            }
        }

        if (alerta.getPeca() != null) {
            response.setIdPeca(alerta.getPeca().getId());
            response.setNomePeca(alerta.getPeca().getNome());
        }

        response.setNivelAlerta(alerta.getNivelAlerta());
        response.setStatusAlerta(alerta.getStatusAlerta());

        response.setQuantidadeAtual(alerta.getQuantidadeAtual());
        response.setEstoqueMinimo(alerta.getEstoqueMinimo());
        response.setEstoqueCritico(alerta.getEstoqueCritico());

        response.setMensagem(alerta.getMensagem());

        response.setWhatsappEnviado(alerta.getWhatsappEnviado());
        response.setWhatsappEnviadoEm(alerta.getWhatsappEnviadoEm());
        response.setWhatsappDestinatario(alerta.getWhatsappDestinatario());
        response.setWhatsappMessageId(alerta.getWhatsappMessageId());

        response.setTentativasEnvio(alerta.getTentativasEnvio());
        response.setUltimoErro(alerta.getUltimoErro());

        response.setCriadoEm(alerta.getCriadoEm());
        response.setAtualizadoEm(alerta.getAtualizadoEm());

        return response;
    }

    public List<AlertaEstoquePecaResponse> toResponseList(List<AlertaEstoquePeca> alertas) {
        return alertas.stream().map(this::toResponse).toList();
    }
}