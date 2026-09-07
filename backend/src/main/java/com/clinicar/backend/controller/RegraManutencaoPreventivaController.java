package com.clinicar.backend.controller;

import com.clinicar.backend.model.Peca;
import com.clinicar.backend.model.RegraManutencaoPreventiva;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.repository.PecaRepository;
import com.clinicar.backend.repository.RegraManutencaoPreventivaRepository;
import com.clinicar.backend.repository.ServicoRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@RestController
@RequestMapping("/api/regra-manutencao-preventiva")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class RegraManutencaoPreventivaController {

    private final RegraManutencaoPreventivaRepository regraRepository;
    private final ServicoRepository servicoRepository;
    private final PecaRepository pecaRepository;

    public RegraManutencaoPreventivaController(
            RegraManutencaoPreventivaRepository regraRepository,
            ServicoRepository servicoRepository,
            PecaRepository pecaRepository
    ) {
        this.regraRepository = regraRepository;
        this.servicoRepository = servicoRepository;
        this.pecaRepository = pecaRepository;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<RegraManutencaoPreventivaResponse> criar(
            @RequestBody RegraManutencaoPreventivaRequest request
    ) {
        validarRequest(request);

        RegraManutencaoPreventiva regra = new RegraManutencaoPreventiva();

        preencherEntidade(regra, request);

        RegraManutencaoPreventiva salva = regraRepository.save(regra);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(toResponse(salva));
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<RegraManutencaoPreventivaResponse>> listar(
            @RequestParam(required = false) Boolean ativo,
            @RequestParam(required = false) String grupoManutencao,
            @RequestParam(required = false) String origemOleo
    ) {
        List<RegraManutencaoPreventiva> regras = regraRepository.findAll(
                Sort.by(
                        Sort.Order.asc("prioridade"),
                        Sort.Order.asc("descricao")
                )
        );

        List<RegraManutencaoPreventivaResponse> response = regras
                .stream()
                .filter(regra -> ativo == null || Boolean.TRUE.equals(regra.getAtivo()) == ativo)
                .filter(regra -> grupoManutencao == null
                        || grupoManutencao.isBlank()
                        || Objects.equals(normalizarCodigo(regra.getGrupoManutencao()), normalizarCodigo(grupoManutencao)))
                .filter(regra -> origemOleo == null
                        || origemOleo.isBlank()
                        || Objects.equals(normalizarCodigo(regra.getOrigemOleo()), normalizarCodigo(origemOleo)))
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<RegraManutencaoPreventivaResponse> buscarPorId(
            @PathVariable Long id
    ) {
        RegraManutencaoPreventiva regra = buscarRegra(id);

        return ResponseEntity.ok(toResponse(regra));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<RegraManutencaoPreventivaResponse> atualizar(
            @PathVariable Long id,
            @RequestBody RegraManutencaoPreventivaRequest request
    ) {
        validarRequest(request);

        RegraManutencaoPreventiva regra = buscarRegra(id);

        preencherEntidade(regra, request);

        RegraManutencaoPreventiva atualizada = regraRepository.save(regra);

        return ResponseEntity.ok(toResponse(atualizada));
    }

    @PatchMapping("/{id}/ativar")
    @Transactional
    public ResponseEntity<RegraManutencaoPreventivaResponse> ativar(
            @PathVariable Long id
    ) {
        RegraManutencaoPreventiva regra = buscarRegra(id);

        regra.setAtivo(true);

        RegraManutencaoPreventiva atualizada = regraRepository.save(regra);

        return ResponseEntity.ok(toResponse(atualizada));
    }

    @PatchMapping("/{id}/desativar")
    @Transactional
    public ResponseEntity<RegraManutencaoPreventivaResponse> desativar(
            @PathVariable Long id
    ) {
        RegraManutencaoPreventiva regra = buscarRegra(id);

        regra.setAtivo(false);

        RegraManutencaoPreventiva atualizada = regraRepository.save(regra);

        return ResponseEntity.ok(toResponse(atualizada));
    }

    /**
     * Neste módulo, o DELETE atua como exclusão lógica.
     * Isso evita problemas com previsões já geradas que dependem da regra.
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> excluirLogicamente(
            @PathVariable Long id
    ) {
        RegraManutencaoPreventiva regra = buscarRegra(id);

        regra.setAtivo(false);

        regraRepository.save(regra);

        return ResponseEntity.noContent().build();
    }

    private RegraManutencaoPreventiva buscarRegra(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("Regra de manutenção preventiva é obrigatória.");
        }

        return regraRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Regra de manutenção preventiva não encontrada."));
    }

    private void validarRequest(RegraManutencaoPreventivaRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dados da regra de manutenção preventiva não informados.");
        }

        if (request.grupoManutencao() == null || request.grupoManutencao().trim().isBlank()) {
            throw new IllegalArgumentException("Grupo de manutenção é obrigatório.");
        }

        if (request.descricao() == null || request.descricao().trim().isBlank()) {
            throw new IllegalArgumentException("Descrição da regra é obrigatória.");
        }

        boolean possuiIntervaloKm = request.intervaloKm() != null && request.intervaloKm() > 0;
        boolean possuiIntervaloDias = request.intervaloDias() != null && request.intervaloDias() > 0;

        if (!possuiIntervaloKm && !possuiIntervaloDias) {
            throw new IllegalArgumentException(
                    "Informe ao menos um intervalo: quilometragem ou dias."
            );
        }

        if (request.intervaloKm() != null && request.intervaloKm() < 0) {
            throw new IllegalArgumentException("Intervalo em KM não pode ser negativo.");
        }

        if (request.intervaloDias() != null && request.intervaloDias() < 0) {
            throw new IllegalArgumentException("Intervalo em dias não pode ser negativo.");
        }

        String origemOleo = normalizarCodigo(request.origemOleo());

        if (origemOleo != null
                && !"MINERAL".equals(origemOleo)
                && !"SINTETICO".equals(origemOleo)) {
            throw new IllegalArgumentException(
                    "Origem do óleo inválida. Use MINERAL ou SINTETICO."
            );
        }
    }

    private void preencherEntidade(
            RegraManutencaoPreventiva regra,
            RegraManutencaoPreventivaRequest request
    ) {
        regra.setGrupoManutencao(normalizarCodigo(request.grupoManutencao()));
        regra.setDescricao(limparTexto(request.descricao()));

        regra.setOrigemOleo(normalizarCodigo(request.origemOleo()));

        regra.setIntervaloKm(request.intervaloKm());
        regra.setIntervaloDias(request.intervaloDias());

        regra.setPrioridade(
                request.prioridade() != null && request.prioridade() > 0
                        ? request.prioridade()
                        : 100
        );

        regra.setAtivo(request.ativo() != null ? request.ativo() : true);

        regra.setObservacoes(limparTexto(request.observacoes()));

        regra.setServico(resolverServico(request.idServico()));
        regra.setPeca(resolverPeca(request.idPeca()));
    }

    private Servico resolverServico(Long idServico) {
        if (idServico == null) {
            return null;
        }

        if (idServico <= 0) {
            throw new IllegalArgumentException("Serviço inválido.");
        }

        return servicoRepository
                .findById(idServico)
                .orElseThrow(() -> new IllegalArgumentException("Serviço não encontrado."));
    }

    private Peca resolverPeca(Long idPeca) {
        if (idPeca == null) {
            return null;
        }

        if (idPeca <= 0) {
            throw new IllegalArgumentException("Peça inválida.");
        }

        return pecaRepository
                .findById(idPeca)
                .orElseThrow(() -> new IllegalArgumentException("Peça não encontrada."));
    }

    private RegraManutencaoPreventivaResponse toResponse(
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

    private String limparTexto(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        return valor.trim();
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

    public record RegraManutencaoPreventivaRequest(
            String grupoManutencao,
            String descricao,
            Long idServico,
            Long idPeca,
            String origemOleo,
            Integer intervaloKm,
            Integer intervaloDias,
            Integer prioridade,
            Boolean ativo,
            String observacoes
    ) {
    }

    public record RegraManutencaoPreventivaResponse(
            Long id,
            String grupoManutencao,
            String descricao,
            Long idServico,
            String nomeServico,
            Long idPeca,
            String nomePeca,
            String origemOleo,
            Integer intervaloKm,
            Integer intervaloDias,
            Integer prioridade,
            Boolean ativo,
            String observacoes,
            LocalDateTime criadoEm,
            LocalDateTime atualizadoEm
    ) {
    }
}