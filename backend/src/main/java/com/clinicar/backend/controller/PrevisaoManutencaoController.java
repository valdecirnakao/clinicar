package com.clinicar.backend.controller;

import com.clinicar.backend.model.Peca;
import com.clinicar.backend.model.PrevisaoManutencaoVeiculo;
import com.clinicar.backend.model.RegraManutencaoPreventiva;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.repository.PrevisaoManutencaoVeiculoRepository;
import com.clinicar.backend.service.PrevisaoManutencaoService;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/previsao-manutencao")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class PrevisaoManutencaoController {

    private static final String STATUS_PENDENTE = "PENDENTE";
    private static final String STATUS_PROXIMA = "PROXIMA";
    private static final String STATUS_VENCIDA = "VENCIDA";
    private static final String STATUS_AGENDADA = "AGENDADA";
    private static final String STATUS_CONCLUIDA = "CONCLUIDA";
    private static final String STATUS_CANCELADA = "CANCELADA";

    private final PrevisaoManutencaoService previsaoManutencaoService;
    private final PrevisaoManutencaoVeiculoRepository previsaoRepository;

    public PrevisaoManutencaoController(
            PrevisaoManutencaoService previsaoManutencaoService,
            PrevisaoManutencaoVeiculoRepository previsaoRepository
    ) {
        this.previsaoManutencaoService = previsaoManutencaoService;
        this.previsaoRepository = previsaoRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<PrevisaoManutencaoResponse>> listar(
            @RequestParam(required = false) Long veiculoId,
            @RequestParam(required = false) Long clienteId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String grupoManutencao,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate inicio,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fim
    ) {
        List<PrevisaoManutencaoVeiculo> previsoes = previsaoRepository.findAll(
                Sort.by(
                        Sort.Order.asc("dataRecomendada"),
                        Sort.Order.asc("statusPrevisao")
                )
        );

        String statusNormalizado = normalizarCodigo(status);
        String grupoNormalizado = normalizarCodigo(grupoManutencao);

        List<PrevisaoManutencaoResponse> response = previsoes
                .stream()
                .filter(previsao -> veiculoId == null
                        || previsao.getVeiculo() != null
                        && previsao.getVeiculo().getId().equals(veiculoId))
                .filter(previsao -> clienteId == null
                        || previsao.getCliente() != null
                        && previsao.getCliente().getId().equals(clienteId))
                .filter(previsao -> statusNormalizado == null
                        || statusNormalizado.equals(normalizarCodigo(previsao.getStatusPrevisao())))
                .filter(previsao -> grupoNormalizado == null
                        || grupoNormalizado.equals(normalizarCodigo(previsao.getGrupoManutencao())))
                .filter(previsao -> inicio == null
                        || previsao.getDataRecomendada() == null
                        || !previsao.getDataRecomendada().isBefore(inicio))
                .filter(previsao -> fim == null
                        || previsao.getDataRecomendada() == null
                        || !previsao.getDataRecomendada().isAfter(fim))
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<PrevisaoManutencaoResponse> buscarPorId(
            @PathVariable Long id
    ) {
        PrevisaoManutencaoVeiculo previsao = buscarPrevisao(id);

        return ResponseEntity.ok(toResponse(previsao));
    }

    @GetMapping("/veiculo/{veiculoId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PrevisaoManutencaoResponse>> listarPorVeiculo(
            @PathVariable Long veiculoId
    ) {
        List<PrevisaoManutencaoResponse> response = previsaoRepository
                .findAll(Sort.by(Sort.Order.asc("dataRecomendada")))
                .stream()
                .filter(previsao -> previsao.getVeiculo() != null
                        && previsao.getVeiculo().getId().equals(veiculoId))
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/cliente/{clienteId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PrevisaoManutencaoResponse>> listarPorCliente(
            @PathVariable Long clienteId
    ) {
        List<PrevisaoManutencaoResponse> response = previsaoRepository
                .findAll(Sort.by(Sort.Order.asc("dataRecomendada")))
                .stream()
                .filter(previsao -> previsao.getCliente() != null
                        && previsao.getCliente().getId().equals(clienteId))
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{status}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PrevisaoManutencaoResponse>> listarPorStatus(
            @PathVariable String status
    ) {
        String statusNormalizado = normalizarCodigo(status);

        List<PrevisaoManutencaoResponse> response = previsaoRepository
                .findAll(Sort.by(Sort.Order.asc("dataRecomendada")))
                .stream()
                .filter(previsao -> statusNormalizado.equals(
                        normalizarCodigo(previsao.getStatusPrevisao())
                ))
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/atendimento/{atendimentoId}/gerar")
    @Transactional
    public ResponseEntity<List<PrevisaoManutencaoResponse>> gerarPorAtendimento(
            @PathVariable Long atendimentoId
    ) {
        List<PrevisaoManutencaoVeiculo> previsoes =
                previsaoManutencaoService.gerarPrevisoesDoAtendimento(atendimentoId);

        List<PrevisaoManutencaoResponse> response = previsoes
                .stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/marcar-agendada")
    @Transactional
    public ResponseEntity<PrevisaoManutencaoResponse> marcarAgendada(
            @PathVariable Long id
    ) {
        PrevisaoManutencaoVeiculo previsao = buscarPrevisao(id);

        previsao.setStatusPrevisao(STATUS_AGENDADA);
        adicionarObservacaoStatus(previsao, "Previsão marcada como AGENDADA.");

        PrevisaoManutencaoVeiculo atualizada = previsaoRepository.save(previsao);

        return ResponseEntity.ok(toResponse(atualizada));
    }

    @PatchMapping("/{id}/marcar-proxima")
    @Transactional
    public ResponseEntity<PrevisaoManutencaoResponse> marcarProxima(
            @PathVariable Long id
    ) {
        PrevisaoManutencaoVeiculo previsao = buscarPrevisao(id);

        previsao.setStatusPrevisao(STATUS_PROXIMA);
        adicionarObservacaoStatus(previsao, "Previsão marcada como PROXIMA.");

        PrevisaoManutencaoVeiculo atualizada = previsaoRepository.save(previsao);

        return ResponseEntity.ok(toResponse(atualizada));
    }

    @PatchMapping("/{id}/marcar-vencida")
    @Transactional
    public ResponseEntity<PrevisaoManutencaoResponse> marcarVencida(
            @PathVariable Long id
    ) {
        PrevisaoManutencaoVeiculo previsao = buscarPrevisao(id);

        previsao.setStatusPrevisao(STATUS_VENCIDA);
        adicionarObservacaoStatus(previsao, "Previsão marcada como VENCIDA.");

        PrevisaoManutencaoVeiculo atualizada = previsaoRepository.save(previsao);

        return ResponseEntity.ok(toResponse(atualizada));
    }

    @PatchMapping("/{id}/marcar-concluida")
    @Transactional
    public ResponseEntity<PrevisaoManutencaoResponse> marcarConcluida(
            @PathVariable Long id
    ) {
        PrevisaoManutencaoVeiculo previsao = buscarPrevisao(id);

        previsao.setStatusPrevisao(STATUS_CONCLUIDA);
        adicionarObservacaoStatus(previsao, "Previsão marcada como CONCLUIDA.");

        PrevisaoManutencaoVeiculo atualizada = previsaoRepository.save(previsao);

        return ResponseEntity.ok(toResponse(atualizada));
    }

    @PatchMapping("/{id}/cancelar")
    @Transactional
    public ResponseEntity<PrevisaoManutencaoResponse> cancelar(
            @PathVariable Long id
    ) {
        PrevisaoManutencaoVeiculo previsao = buscarPrevisao(id);

        previsao.setStatusPrevisao(STATUS_CANCELADA);
        adicionarObservacaoStatus(previsao, "Previsão cancelada manualmente.");

        PrevisaoManutencaoVeiculo atualizada = previsaoRepository.save(previsao);

        return ResponseEntity.ok(toResponse(atualizada));
    }

    @PatchMapping("/{id}/reabrir")
    @Transactional
    public ResponseEntity<PrevisaoManutencaoResponse> reabrir(
            @PathVariable Long id
    ) {
        PrevisaoManutencaoVeiculo previsao = buscarPrevisao(id);

        previsao.setStatusPrevisao(STATUS_PENDENTE);
        adicionarObservacaoStatus(previsao, "Previsão reaberta como PENDENTE.");

        PrevisaoManutencaoVeiculo atualizada = previsaoRepository.save(previsao);

        return ResponseEntity.ok(toResponse(atualizada));
    }

    private PrevisaoManutencaoVeiculo buscarPrevisao(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("Previsão de manutenção é obrigatória.");
        }

        return previsaoRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Previsão de manutenção não encontrada."));
    }

    private void adicionarObservacaoStatus(
            PrevisaoManutencaoVeiculo previsao,
            String texto
    ) {
        String observacaoAtual = previsao.getObservacoes() != null
                ? previsao.getObservacoes() + " "
                : "";

        previsao.setObservacoes(
                observacaoAtual
                        + "["
                        + LocalDateTime.now()
                        + "] "
                        + texto
        );
    }

    private PrevisaoManutencaoResponse toResponse(
            PrevisaoManutencaoVeiculo previsao
    ) {
        Veiculo veiculo = previsao.getVeiculo();
        Usuario cliente = previsao.getCliente();
        RegraManutencaoPreventiva regra = previsao.getRegraManutencao();
        Servico servico = previsao.getServico();
        Peca peca = previsao.getPeca();

        Long idVeiculo = veiculo != null ? veiculo.getId() : null;
        String placaVeiculo = veiculo != null ? veiculo.getPlaca() : null;
        String modeloVeiculo = veiculo != null ? veiculo.getModelo() : null;
        String fabricanteVeiculo = veiculo != null ? veiculo.getFabricante() : null;

        Long idCliente = cliente != null ? cliente.getId() : null;
        String nomeCliente = cliente != null ? cliente.getNome() : null;

        Long idRegra = regra != null ? regra.getId() : null;

        Long idServico = servico != null ? servico.getId() : null;
        String nomeServico = servico != null ? servico.getNome() : null;

        Long idPeca = peca != null ? peca.getId() : null;
        String nomePeca = peca != null ? peca.getNome() : null;

        Long idAtendimentoOrigem = previsao.getAtendimentoOrigem() != null
                ? previsao.getAtendimentoOrigem().getId()
                : null;

        String codigoAtendimentoOrigem = previsao.getAtendimentoOrigem() != null
                ? previsao.getAtendimentoOrigem().getCodigoAtendimento()
                : null;

        return new PrevisaoManutencaoResponse(
                previsao.getId(),

                idVeiculo,
                placaVeiculo,
                fabricanteVeiculo,
                modeloVeiculo,

                idCliente,
                nomeCliente,

                idAtendimentoOrigem,
                codigoAtendimentoOrigem,

                idRegra,
                idServico,
                nomeServico,
                idPeca,
                nomePeca,

                previsao.getGrupoManutencao(),
                previsao.getDescricao(),
                previsao.getOrigemOleo(),

                previsao.getKmReferencia(),
                previsao.getKmLimite(),

                previsao.getDataReferencia(),
                previsao.getDataLimiteTempo(),
                previsao.getDataEstimadaKm(),
                previsao.getDataRecomendada(),

                previsao.getCriterioUtilizado(),
                previsao.getMediaKmDia(),
                previsao.getQuantidadeRegistrosCalculo(),
                previsao.getNivelConfianca(),

                previsao.getStatusPrevisao(),
                previsao.getObservacoes(),

                previsao.getCriadoEm(),
                previsao.getAtualizadoEm()
        );
    }

    private String normalizarCodigo(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        return valor
                .trim()
                .toUpperCase(Locale.ROOT)
                .replace("-", "_")
                .replace(" ", "_");
    }

    public record PrevisaoManutencaoResponse(
            Long id,

            Long idVeiculo,
            String placaVeiculo,
            String fabricanteVeiculo,
            String modeloVeiculo,

            Long idCliente,
            String nomeCliente,

            Long idAtendimentoOrigem,
            String codigoAtendimentoOrigem,

            Long idRegraManutencao,
            Long idServico,
            String nomeServico,
            Long idPeca,
            String nomePeca,

            String grupoManutencao,
            String descricao,
            String origemOleo,

            Integer kmReferencia,
            Integer kmLimite,

            LocalDate dataReferencia,
            LocalDate dataLimiteTempo,
            LocalDate dataEstimadaKm,
            LocalDate dataRecomendada,

            String criterioUtilizado,
            BigDecimal mediaKmDia,
            Integer quantidadeRegistrosCalculo,
            String nivelConfianca,

            String statusPrevisao,
            String observacoes,

            LocalDateTime criadoEm,
            LocalDateTime atualizadoEm
    ) {
    }
}