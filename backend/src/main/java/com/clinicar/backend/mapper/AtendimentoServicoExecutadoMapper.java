package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.AtendimentoServicoExecutadoResponse;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.AtendimentoServicoExecutado;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.model.Usuario;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
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

            /*
             * Evita LazyInitializationException:
             * o ID pode ser lido do proxy, mas campos como codigoAtendimento
             * só devem ser acessados se a entidade estiver inicializada.
             */
            if (Hibernate.isInitialized(atendimento)) {
                response.setCodigoAtendimento(atendimento.getCodigoAtendimento());
            }
        }

        Servico servico = item.getServico();

        if (servico != null) {
            response.setIdServico(servico.getId());

            if (Hibernate.isInitialized(servico)) {
                response.setNomeServico(servico.getNome());
                response.setCategoriaServico(servico.getCategoria());
            }
        }

        Usuario responsavel = item.getResponsavel();

        if (responsavel != null) {
            response.setIdResponsavel(responsavel.getId());

            if (Hibernate.isInitialized(responsavel)) {
                response.setNomeResponsavel(responsavel.getNome());
            }
        }

        Fornecedor fornecedor = item.getFornecedor();

        if (fornecedor != null) {
            response.setIdFornecedor(fornecedor.getId());

            if (Hibernate.isInitialized(fornecedor)) {
                response.setRazaoSocialFornecedor(fornecedor.getRazaoSocial());
            }
        }

        response.setTipoExecucao(
                item.getTipoExecucao() != null
                        ? item.getTipoExecucao()
                        : "INTERNO"
        );

        response.setQuantidade(valorOuZero(item.getQuantidade()));
        response.setUnidadeCobranca(item.getUnidadeCobranca());

        response.setTempoExecucao(item.getTempoExecucao());
        response.setUnidadeTempo(item.getUnidadeTempo());

        response.setValorMaoObra(valorOuZero(item.getValorMaoObra()));
        response.setValorTerceiro(valorOuZero(item.getValorTerceiro()));
        response.setDesconto(valorOuZero(item.getDesconto()));
        response.setValorTotal(valorOuZero(item.getValorTotal()));

        response.setStatusItem(
                item.getStatusItem() != null
                        ? item.getStatusItem()
                        : "EXECUTADO"
        );

        response.setObservacoes(item.getObservacoes());

        response.setCriadoEm(item.getCriadoEm());
        response.setAtualizadoEm(item.getAtualizadoEm());

        return response;
    }

    public List<AtendimentoServicoExecutadoResponse> toResponseList(
            List<AtendimentoServicoExecutado> itens
    ) {
        if (itens == null || itens.isEmpty()) {
            return List.of();
        }

        return itens
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private BigDecimal valorOuZero(BigDecimal valor) {
        return valor != null ? valor : BigDecimal.ZERO;
    }
}