package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.AtendimentoServicoExecutadoResponse;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.AtendimentoServicoExecutado;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.model.Usuario;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AtendimentoServicoExecutadoMapper {

    public AtendimentoServicoExecutadoResponse toResponse(AtendimentoServicoExecutado item) {
        if (item == null) {
            return null;
        }

        AtendimentoServicoExecutadoResponse response = new AtendimentoServicoExecutadoResponse();

        response.setId(item.getId());

        Atendimento atendimento = item.getAtendimento();

        if (atendimento != null) {
            response.setIdAtendimento(atendimento.getId());
            response.setCodigoAtendimento(atendimento.getCodigoAtendimento());
        }

        Servico servico = item.getServico();

        if (servico != null) {
            response.setIdServico(servico.getId());
            response.setNomeServico(servico.getNome());
            response.setCategoriaServico(servico.getCategoria());
        }

        Usuario responsavel = item.getResponsavel();

        if (responsavel != null) {
            response.setIdResponsavel(responsavel.getId());
            response.setNomeResponsavel(responsavel.getNome());
        }

        Fornecedor fornecedor = item.getFornecedor();

        if (fornecedor != null) {
            response.setIdFornecedor(fornecedor.getId());
            response.setRazaoSocialFornecedor(fornecedor.getRazaoSocial());
        }

        response.setTipoExecucao(item.getTipoExecucao());

        response.setQuantidade(item.getQuantidade());
        response.setUnidadeCobranca(item.getUnidadeCobranca());

        response.setTempoExecucao(item.getTempoExecucao());
        response.setUnidadeTempo(item.getUnidadeTempo());

        response.setValorMaoObra(item.getValorMaoObra());
        response.setValorTerceiro(item.getValorTerceiro());
        response.setDesconto(item.getDesconto());
        response.setValorTotal(item.getValorTotal());

        response.setStatusItem(item.getStatusItem());
        response.setObservacoes(item.getObservacoes());

        response.setCriadoEm(item.getCriadoEm());
        response.setAtualizadoEm(item.getAtualizadoEm());

        return response;
    }

    public List<AtendimentoServicoExecutadoResponse> toResponseList(List<AtendimentoServicoExecutado> itens) {
        return itens
                .stream()
                .map(this::toResponse)
                .toList();
    }
}