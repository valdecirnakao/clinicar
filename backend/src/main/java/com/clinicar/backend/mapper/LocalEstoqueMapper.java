package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.LocalEstoqueResponse;
import com.clinicar.backend.model.LocalEstoque;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class LocalEstoqueMapper {

    public LocalEstoqueResponse toResponse(LocalEstoque local) {
        if (local == null) {
            return null;
        }

        LocalEstoqueResponse response = new LocalEstoqueResponse();

        response.setId(local.getId());
        response.setNome(local.getNome());
        response.setDescricao(local.getDescricao());
        response.setAtivo(local.getAtivo());
        response.setCriadoEm(local.getCriadoEm());
        response.setAtualizadoEm(local.getAtualizadoEm());

        return response;
    }

    public List<LocalEstoqueResponse> toResponseList(List<LocalEstoque> locais) {
        return locais.stream().map(this::toResponse).toList();
    }
}