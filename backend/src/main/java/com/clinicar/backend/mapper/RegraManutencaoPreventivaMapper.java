package com.clinicar.backend.mapper;
import com.clinicar.backend.model.RegraManutencaoPreventiva;
import com.clinicar.backend.dto.RegraManutencaoPreventivaResponse;
@org.springframework.stereotype.Component
public class RegraManutencaoPreventivaMapper {
    public RegraManutencaoPreventivaResponse toResponse(RegraManutencaoPreventiva regra){return converter(regra);}
    public static RegraManutencaoPreventivaResponse converter(
            RegraManutencaoPreventiva regra
    ) {
        Long idServico = regra.getServico() != null ? regra.getServico().getId() : null;
        String nomeServico = regra.getServico() != null ? regra.getServico().getNome() : null;

        Long idPeca = regra.getPeca() != null ? regra.getPeca().getId() : null;
        String nomePeca = regra.getPeca() != null ? regra.getPeca().getNome() : null;

        return new RegraManutencaoPreventivaResponse(
                regra.getId(),
                regra.getGrupoManutencao(),
                regra.getDescricao(),
                idServico,
                nomeServico,
                idPeca,
                nomePeca,
                regra.getOrigemOleo(),
                regra.getIntervaloKm(),
                regra.getIntervaloDias(),
                regra.getPrioridade(),
                regra.getAtivo(),
                regra.getObservacoes(),
                regra.getCriadoEm(),
                regra.getAtualizadoEm()
        );
    }


}