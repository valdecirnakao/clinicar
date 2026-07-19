package com.clinicar.backend.repository;

import com.clinicar.backend.model.Atendimento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AtendimentoRepository extends JpaRepository<Atendimento, Long> {

    List<Atendimento> findAllByOrderByCriadoEmDesc();

    Optional<Atendimento> findByAgendamento_Id(Long agendamentoId);

    boolean existsByAgendamento_Id(Long agendamentoId);

    List<Atendimento> findByStatusAtendimentoOrderByCriadoEmDesc(String statusAtendimento);

    List<Atendimento> findByTipoExecucaoOrderByCriadoEmDesc(String tipoExecucao);

    List<Atendimento> findByCliente_IdOrderByCriadoEmDesc(Long clienteId);

    List<Atendimento> findByVeiculo_IdOrderByCriadoEmDesc(Long veiculoId);

    List<Atendimento> findByResponsavel_IdOrderByCriadoEmDesc(Long responsavelId);

    List<Atendimento> findByFornecedor_IdOrderByCriadoEmDesc(Long fornecedorId);

    List<Atendimento> findByInicioRealBetweenOrderByInicioRealAsc(
            LocalDateTime inicio,
            LocalDateTime fim
    );
}