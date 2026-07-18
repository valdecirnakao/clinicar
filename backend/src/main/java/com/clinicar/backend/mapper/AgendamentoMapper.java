package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.AgendamentoResponse;
import com.clinicar.backend.model.*;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AgendamentoMapper {

    public AgendamentoResponse toResponse(Agendamento agendamento) {
        if (agendamento == null) {
            return null;
        }

        AgendamentoResponse response = new AgendamentoResponse();

        response.setId(agendamento.getId());
        response.setCodigoAgendamento(agendamento.getCodigoAgendamento());

        Usuario cliente = agendamento.getCliente();

        if (cliente != null) {
            response.setIdCliente(cliente.getId());
            response.setNomeCliente(cliente.getNome());
            response.setCpfCliente(cliente.getCpf());
            response.setTelefoneCliente(cliente.getTelefone());
            response.setEmailCliente(cliente.getEmail());
            response.setTipoAcessoCliente(cliente.getTipo_do_acesso());
        }

        Veiculo veiculo = agendamento.getVeiculo();

        if (veiculo != null) {
            response.setIdVeiculo(veiculo.getId());
            response.setPlacaVeiculo(veiculo.getPlaca());
            response.setFabricanteVeiculo(veiculo.getFabricante());
            response.setModeloVeiculo(veiculo.getModelo());
        }

        Servico servico = agendamento.getServico();

        if (servico != null) {
            response.setIdServico(servico.getId());
            response.setNomeServico(servico.getNome());
            response.setCategoriaServico(servico.getCategoria());
        }

        Fornecedor fornecedor = agendamento.getFornecedor();

        if (fornecedor != null) {
            response.setIdFornecedor(fornecedor.getId());
            response.setRazaoSocialFornecedor(fornecedor.getRazaoSocial());
        }

        Usuario responsavel = agendamento.getResponsavel();

        if (responsavel != null) {
            response.setIdResponsavel(responsavel.getId());
            response.setNomeResponsavel(responsavel.getNome());
            response.setTipoAcessoResponsavel(responsavel.getTipo_do_acesso());
        }

        response.setDataHoraInicio(agendamento.getDataHoraInicio());
        response.setDataHoraFim(agendamento.getDataHoraFim());
        response.setDuracaoEstimadaMinutos(agendamento.getDuracaoEstimadaMinutos());

        response.setStatusAgendamento(agendamento.getStatusAgendamento());
        response.setCanalOrigem(agendamento.getCanalOrigem());
        response.setPrioridade(agendamento.getPrioridade());
        response.setTipoAtendimento(agendamento.getTipoAtendimento());

        response.setQuilometragemAtual(agendamento.getQuilometragemAtual());

        response.setQueixaCliente(agendamento.getQueixaCliente());
        response.setDiagnosticoPrevio(agendamento.getDiagnosticoPrevio());
        response.setObservacoes(agendamento.getObservacoes());

        response.setValorEstimado(agendamento.getValorEstimado());
        response.setValorFinal(agendamento.getValorFinal());

        response.setRequerConfirmacao(agendamento.getRequerConfirmacao());
        response.setConfirmado(agendamento.getConfirmado());
        response.setConfirmadoEm(agendamento.getConfirmadoEm());

        response.setLembreteEnviado(agendamento.getLembreteEnviado());
        response.setLembreteEnviadoEm(agendamento.getLembreteEnviadoEm());

        response.setCanceladoEm(agendamento.getCanceladoEm());
        response.setMotivoCancelamento(agendamento.getMotivoCancelamento());

        response.setCriadoEm(agendamento.getCriadoEm());
        response.setAtualizadoEm(agendamento.getAtualizadoEm());

        return response;
    }

    public List<AgendamentoResponse> toResponseList(List<Agendamento> agendamentos) {
        return agendamentos
                .stream()
                .map(this::toResponse)
                .toList();
    }
}