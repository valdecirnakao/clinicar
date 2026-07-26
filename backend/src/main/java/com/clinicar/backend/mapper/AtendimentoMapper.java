package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.AtendimentoResponse;
import com.clinicar.backend.model.*;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AtendimentoMapper {

    public AtendimentoResponse toResponse(Atendimento atendimento) {
        if (atendimento == null) {
            return null;
        }

        AtendimentoResponse response = new AtendimentoResponse();

        response.setId(atendimento.getId());
        response.setCodigoAtendimento(atendimento.getCodigoAtendimento());

        Agendamento agendamento = atendimento.getAgendamento();

        if (agendamento != null) {
            response.setIdAgendamento(agendamento.getId());
            response.setCodigoAgendamento(agendamento.getCodigoAgendamento());
        }

        Usuario cliente = atendimento.getCliente();

        if (cliente != null) {
            response.setIdCliente(cliente.getId());
            response.setNomeCliente(cliente.getNome());
            response.setCpfCliente(cliente.getCpf());
            response.setTelefoneCliente(cliente.getTelefone());
            response.setEmailCliente(cliente.getEmail());
        }

        Veiculo veiculo = atendimento.getVeiculo();

        if (veiculo != null) {
            response.setIdVeiculo(veiculo.getId());
            response.setPlacaVeiculo(veiculo.getPlaca());
            response.setFabricanteVeiculo(veiculo.getFabricante());
            response.setModeloVeiculo(veiculo.getModelo());
        }

        Servico servico = atendimento.getServico();

        if (servico != null) {
            response.setIdServico(servico.getId());
            response.setNomeServico(servico.getNome());
            response.setCategoriaServico(servico.getCategoria());
        }

        Fornecedor fornecedor = atendimento.getFornecedor();

        if (fornecedor != null) {
            response.setIdFornecedor(fornecedor.getId());
            response.setRazaoSocialFornecedor(fornecedor.getRazaoSocial());
        }

        Usuario responsavel = atendimento.getResponsavel();

        if (responsavel != null) {
            response.setIdResponsavel(responsavel.getId());
            response.setNomeResponsavel(responsavel.getNome());
            response.setTipoAcessoResponsavel(responsavel.getTipo_do_acesso());
        }

        response.setTipoExecucao(atendimento.getTipoExecucao());
        response.setStatusAtendimento(atendimento.getStatusAtendimento());

        response.setDataEntrada(atendimento.getDataEntrada());
        response.setInicioReal(atendimento.getInicioReal());
        response.setFimReal(atendimento.getFimReal());
        response.setPrazoEstimadoEntrega(atendimento.getPrazoEstimadoEntrega());
        response.setDataEntrega(atendimento.getDataEntrega());

        response.setQuilometragemEntrada(atendimento.getQuilometragemEntrada());
        response.setQuilometragemSaida(atendimento.getQuilometragemSaida());

        response.setRelatoCliente(atendimento.getRelatoCliente());
        response.setDiagnosticoTecnico(atendimento.getDiagnosticoTecnico());
        response.setServicoExecutado(atendimento.getServicoExecutado());
        response.setObservacoesInternas(atendimento.getObservacoesInternas());
        response.setRecomendacoesCliente(atendimento.getRecomendacoesCliente());

        response.setNecessitaRetorno(atendimento.getNecessitaRetorno());
        response.setDataRetornoSugerida(atendimento.getDataRetornoSugerida());
        response.setGarantiaDias(atendimento.getGarantiaDias());

        response.setValorMaoObra(atendimento.getValorMaoObra());
        response.setValorPecas(atendimento.getValorPecas());
        response.setValorTerceiros(atendimento.getValorTerceiros());
        response.setDesconto(atendimento.getDesconto());
        response.setValorTotal(atendimento.getValorTotal());

        response.setAprovado(atendimento.getAprovado());
        response.setAprovadoEm(atendimento.getAprovadoEm());

        response.setFinalizadoEm(atendimento.getFinalizadoEm());

        response.setCanceladoEm(atendimento.getCanceladoEm());
        response.setMotivoCancelamento(atendimento.getMotivoCancelamento());

        response.setOsPdfGeradaEm(atendimento.getOsPdfGeradaEm());
        response.setOsEnviadaEmail(atendimento.getOsEnviadaEmail());
        response.setOsEnviadaEmailEm(atendimento.getOsEnviadaEmailEm());
        response.setOsEmailDestino(atendimento.getOsEmailDestino());
        response.setOsUltimoErro(atendimento.getOsUltimoErro());

        response.setCriadoEm(atendimento.getCriadoEm());
        response.setAtualizadoEm(atendimento.getAtualizadoEm());

        return response;
    }

    public List<AtendimentoResponse> toResponseList(List<Atendimento> atendimentos) {
        return atendimentos
                .stream()
                .map(this::toResponse)
                .toList();
    }
}