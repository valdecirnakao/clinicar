package com.clinicar.backend.repository;

import com.clinicar.backend.model.Veiculo;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Projeções evitam carregar os PDFs das OS e dados internos no relatório. */
public interface HistoricoVeicularRepository extends Repository<Veiculo, Long> {
    interface Linha {
        Long getId(); String getCodigo(); LocalDateTime getData(); String getStatus();
        String getPlaca(); String getFabricante(); String getModelo(); String getCor(); String getAno();
        Boolean getPreservado(); Integer getKmEntrada(); Integer getKmSaida();
        String getQueixa(); String getDiagnostico(); String getExecucao(); String getRecomendacoes(); BigDecimal getValor();
    }
    interface ItemLinha {
        Long getAtendimentoId(); String getDescricao(); BigDecimal getQuantidade(); String getUnidade(); BigDecimal getValorTotal();
    }

    @Query("""
        select a.id as id, a.codigoAtendimento as codigo,
          coalesce(a.dataEntrada, a.inicioReal, a.criadoEm) as data, a.statusAtendimento as status,
          case when a.veiculoPreservadoEm is not null then a.veiculoPlacaHistorica else v.placa end as placa,
          case when a.veiculoPreservadoEm is not null then a.veiculoFabricanteHistorico else v.fabricante end as fabricante,
          case when a.veiculoPreservadoEm is not null then a.veiculoModeloHistorico else v.modelo end as modelo,
          case when a.veiculoPreservadoEm is not null then a.veiculoCorHistorica else v.cor end as cor,
          case when a.veiculoPreservadoEm is not null then a.veiculoAnoModeloCombustivelHistorico else v.anoModeloCombustivel end as ano,
          case when a.veiculoPreservadoEm is not null then true else false end as preservado,
          a.quilometragemEntrada as kmEntrada, a.quilometragemSaida as kmSaida,
          a.relatoCliente as queixa, a.diagnosticoTecnico as diagnostico,
          a.servicoExecutado as execucao, a.recomendacoesCliente as recomendacoes, a.valorTotal as valor
        from Atendimento a join a.veiculo v
        where v.id = :veiculoId
          and (:inicio is null or coalesce(a.dataEntrada, a.inicioReal, a.criadoEm) >= :inicio)
          and (:fim is null or coalesce(a.dataEntrada, a.inicioReal, a.criadoEm) < :fim)
        order by coalesce(a.dataEntrada, a.inicioReal, a.criadoEm) desc, a.id desc
        """)
    List<Linha> atendimentos(@Param("veiculoId") Long veiculoId, @Param("inicio") LocalDateTime inicio,
                            @Param("fim") LocalDateTime fim, Pageable limite);

    @Query("""
        select a.id as id, a.codigoAgendamento as codigo, a.dataHoraInicio as data, a.statusAgendamento as status,
          case when a.veiculoPreservadoEm is not null then a.veiculoPlacaHistorica else v.placa end as placa,
          case when a.veiculoPreservadoEm is not null then a.veiculoFabricanteHistorico else v.fabricante end as fabricante,
          case when a.veiculoPreservadoEm is not null then a.veiculoModeloHistorico else v.modelo end as modelo,
          case when a.veiculoPreservadoEm is not null then a.veiculoCorHistorica else v.cor end as cor,
          case when a.veiculoPreservadoEm is not null then a.veiculoAnoModeloCombustivelHistorico else v.anoModeloCombustivel end as ano,
          case when a.veiculoPreservadoEm is not null then true else false end as preservado,
          a.quilometragemAtual as kmEntrada, a.queixaCliente as queixa,
          a.diagnosticoPrevio as diagnostico, a.valorEstimado as valor
        from Agendamento a join a.veiculo v
        where v.id = :veiculoId and (:inicio is null or a.dataHoraInicio >= :inicio)
          and (:fim is null or a.dataHoraInicio < :fim)
        order by a.dataHoraInicio desc, a.id desc
        """)
    List<Linha> agendamentos(@Param("veiculoId") Long veiculoId, @Param("inicio") LocalDateTime inicio,
                            @Param("fim") LocalDateTime fim, Pageable limite);

    @Query("""
        select i.atendimento.id as atendimentoId, s.nome as descricao, i.quantidade as quantidade,
            'serviço' as unidade, i.valorTotal as valorTotal
        from AtendimentoServicoExecutado i join i.servico s
        where i.atendimento.id in :ids and i.statusItem <> 'CANCELADO'
        order by i.atendimento.id, i.criadoEm, i.id
        """)
    List<ItemLinha> servicos(@Param("ids") List<Long> ids);

    @Query("""
        select i.atendimento.id as atendimentoId, p.nome as descricao, i.quantidade as quantidade,
            i.unidadeMedida as unidade, i.valorTotal as valorTotal
        from AtendimentoPecaUtilizada i join i.peca p
        where i.atendimento.id in :ids order by i.atendimento.id, i.criadoEm, i.id
        """)
    List<ItemLinha> pecas(@Param("ids") List<Long> ids);
}
