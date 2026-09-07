package com.clinicar.backend.service;

import com.clinicar.backend.model.AgendamentoPecaPrevista;
import com.clinicar.backend.model.EstoquePeca;
import com.clinicar.backend.repository.AgendamentoPecaPrevistaRepository;
import com.clinicar.backend.repository.EstoquePecaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
public class ReservaEstoqueAgendamentoService {

    private final AgendamentoPecaPrevistaRepository agendamentoPecaPrevistaRepository;
    private final EstoquePecaRepository estoquePecaRepository;
    private final AlertaEstoquePecaService alertaEstoquePecaService;

    public ReservaEstoqueAgendamentoService(
            AgendamentoPecaPrevistaRepository agendamentoPecaPrevistaRepository,
            EstoquePecaRepository estoquePecaRepository,
            AlertaEstoquePecaService alertaEstoquePecaService
    ) {
        this.agendamentoPecaPrevistaRepository = agendamentoPecaPrevistaRepository;
        this.estoquePecaRepository = estoquePecaRepository;
        this.alertaEstoquePecaService = alertaEstoquePecaService;
    }

    @Transactional
    public void reservarPecasDoAgendamento(Long agendamentoId) {
        if (agendamentoId == null || agendamentoId <= 0) {
            throw new IllegalArgumentException("ID do agendamento não informado para reserva de estoque.");
        }

        log.info("[RESERVA-ESTOQUE] Iniciando reserva de peças para agendamento ID {}.", agendamentoId);

        List<AgendamentoPecaPrevista> itens =
                agendamentoPecaPrevistaRepository.findByAgendamento_Id(agendamentoId);

        log.info(
                "[RESERVA-ESTOQUE] Quantidade de peças previstas encontradas para o agendamento ID {}: {}.",
                agendamentoId,
                itens.size()
        );

        if (itens.isEmpty()) {
            return;
        }

        for (AgendamentoPecaPrevista item : itens) {
            if (Boolean.TRUE.equals(item.getReservado())
                    || "RESERVADA".equalsIgnoreCase(item.getStatusReserva())) {
                log.info(
                        "[RESERVA-ESTOQUE] Item ID {} já está reservado. Ignorando nova reserva.",
                        item.getId()
                );
                continue;
            }

            EstoquePeca estoque = localizarEstoqueComLock(item);

            BigDecimal quantidade = valorOuZero(item.getQuantidade());

            if (quantidade.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Quantidade inválida para reserva de peça.");
            }

            BigDecimal atual = valorOuZero(estoque.getQuantidadeAtual());
            BigDecimal reservada = valorOuZero(estoque.getQuantidadeReservada());
            BigDecimal disponivel = atual.subtract(reservada);

            if (disponivel.compareTo(quantidade) < 0) {
                String nomePeca = item.getPeca() != null
                        ? item.getPeca().getNome()
                        : "peça";

                throw new IllegalArgumentException(
                        "Estoque disponível insuficiente para reservar a peça "
                                + nomePeca
                                + ". Disponível: "
                                + disponivel
                                + ". Necessário: "
                                + quantidade
                                + "."
                );
            }

            BigDecimal novaReservada = reservada.add(quantidade);

            estoque.setQuantidadeReservada(novaReservada);

            atualizarStatusEstoquePeloDisponivel(estoque);

            item.setEstoquePeca(estoque);
            item.setReservado(true);
            item.setStatusReserva("RESERVADA");
            item.setReservadoEm(LocalDateTime.now());
            item.setLiberadoEm(null);

            EstoquePeca estoqueSalvo = estoquePecaRepository.save(estoque);
            agendamentoPecaPrevistaRepository.save(item);

            log.info(
                    "[RESERVA-ESTOQUE] Peça reservada. agendamentoId={}, itemId={}, pecaId={}, estoqueId={}, quantidade={}, atual={}, reservadaAnterior={}, reservadaNova={}, disponivelNovo={}.",
                    agendamentoId,
                    item.getId(),
                    item.getPeca() != null ? item.getPeca().getId() : null,
                    estoqueSalvo.getId(),
                    quantidade,
                    atual,
                    reservada,
                    novaReservada,
                    calcularQuantidadeDisponivel(estoqueSalvo)
            );

            alertaEstoquePecaService.avaliarEEnviarAlertaSeNecessario(
                    estoqueSalvo,
                    "RESERVA_AGENDAMENTO",
                    item.getAgendamento() != null
                            ? item.getAgendamento().getCodigoAgendamento()
                            : "Agendamento " + agendamentoId
            );
        }
    }

    @Transactional
    public void liberarReservasDoAgendamento(Long agendamentoId) {
        if (agendamentoId == null || agendamentoId <= 0) {
            throw new IllegalArgumentException("ID do agendamento não informado para liberação de reserva.");
        }

        log.info("[RESERVA-ESTOQUE] Liberando reservas do agendamento ID {}.", agendamentoId);

        List<AgendamentoPecaPrevista> itens =
                agendamentoPecaPrevistaRepository.findByAgendamento_Id(agendamentoId);

        if (itens.isEmpty()) {
            return;
        }

        for (AgendamentoPecaPrevista item : itens) {
            if (!Boolean.TRUE.equals(item.getReservado())
                    && !"RESERVADA".equalsIgnoreCase(item.getStatusReserva())) {
                continue;
            }

            EstoquePeca estoque = localizarEstoqueComLock(item);

            BigDecimal quantidade = valorOuZero(item.getQuantidade());
            BigDecimal reservadaAtual = valorOuZero(estoque.getQuantidadeReservada());

            BigDecimal novaReservada = reservadaAtual.subtract(quantidade);

            if (novaReservada.compareTo(BigDecimal.ZERO) < 0) {
                novaReservada = BigDecimal.ZERO;
            }

            estoque.setQuantidadeReservada(novaReservada);

            atualizarStatusEstoquePeloDisponivel(estoque);

            item.setReservado(false);
            item.setStatusReserva("LIBERADA");
            item.setLiberadoEm(LocalDateTime.now());

            EstoquePeca estoqueSalvo = estoquePecaRepository.save(estoque);
            agendamentoPecaPrevistaRepository.save(item);

            log.info(
                    "[RESERVA-ESTOQUE] Reserva liberada. agendamentoId={}, itemId={}, estoqueId={}, quantidade={}, reservadaAnterior={}, reservadaNova={}, disponivelNovo={}.",
                    agendamentoId,
                    item.getId(),
                    estoqueSalvo.getId(),
                    quantidade,
                    reservadaAtual,
                    novaReservada,
                    calcularQuantidadeDisponivel(estoqueSalvo)
            );

            /*
             * Não enviamos WhatsApp ao liberar reserva, porque a disponibilidade melhora.
             * Se futuramente o AlertaEstoquePecaService tiver método específico para
             * resolver alertas abertos sem enviar mensagem, ele pode ser chamado aqui.
             */
        }
    }

    @Transactional
    public void marcarReservasComoConsumidas(Long agendamentoId) {
        if (agendamentoId == null || agendamentoId <= 0) {
            throw new IllegalArgumentException("ID do agendamento não informado para consumir reservas.");
        }

        log.info("[RESERVA-ESTOQUE] Marcando reservas como consumidas para agendamento ID {}.", agendamentoId);

        List<AgendamentoPecaPrevista> itens =
                agendamentoPecaPrevistaRepository.findByAgendamento_Id(agendamentoId);

        for (AgendamentoPecaPrevista item : itens) {
            if ("RESERVADA".equalsIgnoreCase(item.getStatusReserva())) {
                item.setReservado(false);
                item.setStatusReserva("CONSUMIDA");
                item.setLiberadoEm(LocalDateTime.now());

                agendamentoPecaPrevistaRepository.save(item);

                log.info(
                        "[RESERVA-ESTOQUE] Reserva consumida. agendamentoId={}, itemId={}, pecaId={}.",
                        agendamentoId,
                        item.getId(),
                        item.getPeca() != null ? item.getPeca().getId() : null
                );
            }
        }
    }

    private EstoquePeca localizarEstoqueComLock(AgendamentoPecaPrevista item) {
        if (item.getEstoquePeca() != null && item.getEstoquePeca().getId() != null) {
            return estoquePecaRepository.buscarPorIdComLock(item.getEstoquePeca().getId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Estoque da peça prevista não encontrado."
                    ));
        }

        if (item.getPeca() == null || item.getPeca().getId() == null) {
            throw new IllegalArgumentException("Peça prevista sem vínculo com peça cadastrada.");
        }

        List<EstoquePeca> estoques = estoquePecaRepository.findByPeca_Id(
                item.getPeca().getId()
        );

        if (estoques.isEmpty()) {
            throw new IllegalArgumentException(
                    "Não existe estoque cadastrado para a peça "
                            + item.getPeca().getNome()
                            + "."
            );
        }

        EstoquePeca primeiro = estoques.get(0);

        return estoquePecaRepository.buscarPorIdComLock(primeiro.getId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Estoque da peça prevista não encontrado."
                ));
    }

    private void atualizarStatusEstoquePeloDisponivel(EstoquePeca estoque) {
        BigDecimal disponivel = calcularQuantidadeDisponivel(estoque);

        BigDecimal minimo = valorOuZero(estoque.getEstoqueMinimo());
        BigDecimal critico = valorOuZero(estoque.getEstoqueCritico());

        if (disponivel.compareTo(BigDecimal.ZERO) <= 0) {
            estoque.setStatusEstoque("ZERADO");
            return;
        }

        if (critico.compareTo(BigDecimal.ZERO) > 0
                && disponivel.compareTo(critico) <= 0) {
            estoque.setStatusEstoque("CRITICO");
            return;
        }

        if (minimo.compareTo(BigDecimal.ZERO) > 0
                && disponivel.compareTo(minimo) <= 0) {
            estoque.setStatusEstoque("ATENCAO");
            return;
        }

        estoque.setStatusEstoque("NORMAL");
    }

    private BigDecimal calcularQuantidadeDisponivel(EstoquePeca estoque) {
        BigDecimal atual = valorOuZero(estoque.getQuantidadeAtual());
        BigDecimal reservada = valorOuZero(estoque.getQuantidadeReservada());

        BigDecimal disponivel = atual.subtract(reservada);

        if (disponivel.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO;
        }

        return disponivel;
    }

    private BigDecimal valorOuZero(BigDecimal valor) {
        return valor != null ? valor : BigDecimal.ZERO;
    }
}