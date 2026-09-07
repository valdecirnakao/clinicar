package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.AtendimentoResponse;
import com.clinicar.backend.model.Agendamento;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.model.Veiculo;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
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

        response.setNecessitaRetorno(valorBooleanoComDefault(atendimento.getNecessitaRetorno(), false));
        response.setDataRetornoSugerida(atendimento.getDataRetornoSugerida());
        response.setGarantiaDias(atendimento.getGarantiaDias());

        response.setValorMaoObra(valorOuZero(atendimento.getValorMaoObra()));
        response.setValorPecas(valorOuZero(atendimento.getValorPecas()));
        response.setValorTerceiros(valorOuZero(atendimento.getValorTerceiros()));
        response.setDesconto(valorOuZero(atendimento.getDesconto()));
        response.setValorTotal(valorOuZero(atendimento.getValorTotal()));

        response.setAprovado(valorBooleanoComDefault(atendimento.getAprovado(), false));
        response.setAprovadoEm(atendimento.getAprovadoEm());

        response.setFinalizadoEm(atendimento.getFinalizadoEm());

        response.setCanceladoEm(atendimento.getCanceladoEm());
        response.setMotivoCancelamento(atendimento.getMotivoCancelamento());

        response.setOsPdfGeradaEm(atendimento.getOsPdfGeradaEm());
        response.setOsEnviadaEmail(valorBooleanoComDefault(atendimento.getOsEnviadaEmail(), false));
        response.setOsEnviadaEmailEm(atendimento.getOsEnviadaEmailEm());
        response.setOsEmailDestino(atendimento.getOsEmailDestino());
        response.setOsUltimoErro(atendimento.getOsUltimoErro());

        response.setCriadoEm(atendimento.getCriadoEm());
        response.setAtualizadoEm(atendimento.getAtualizadoEm());

        response.setEstoqueBaixado(valorBooleanoComDefault(atendimento.getEstoqueBaixado(), false));
        response.setEstoqueBaixadoEm(atendimento.getEstoqueBaixadoEm());

        return response;
    }

    public List<AtendimentoResponse> toResponseList(List<Atendimento> atendimentos) {
        if (atendimentos == null || atendimentos.isEmpty()) {
            return List.of();
        }

        return atendimentos
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private BigDecimal valorOuZero(BigDecimal valor) {
        return valor != null ? valor : BigDecimal.ZERO;
    }

    private Boolean valorBooleanoComDefault(Boolean valor, boolean padrao) {
        return valor != null ? valor : padrao;
    }
}