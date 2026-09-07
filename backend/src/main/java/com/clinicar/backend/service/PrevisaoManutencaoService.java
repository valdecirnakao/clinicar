package com.clinicar.backend.service;

import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.AtendimentoPecaUtilizada;
import com.clinicar.backend.model.AtendimentoServicoExecutado;
import com.clinicar.backend.model.HistoricoQuilometragemVeiculo;
import com.clinicar.backend.model.Peca;
import com.clinicar.backend.model.PrevisaoManutencaoVeiculo;
import com.clinicar.backend.model.RegraManutencaoPreventiva;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.repository.AtendimentoPecaUtilizadaRepository;
import com.clinicar.backend.repository.AtendimentoRepository;
import com.clinicar.backend.repository.AtendimentoServicoExecutadoRepository;
import com.clinicar.backend.repository.HistoricoQuilometragemVeiculoRepository;
import com.clinicar.backend.repository.PrevisaoManutencaoVeiculoRepository;
import com.clinicar.backend.repository.RegraManutencaoPreventivaRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
public class PrevisaoManutencaoService {

    private static final String STATUS_PENDENTE = "PENDENTE";
    private static final String STATUS_PROXIMA = "PROXIMA";
    private static final String STATUS_VENCIDA = "VENCIDA";
    private static final String STATUS_AGENDADA = "AGENDADA";
    private static final String STATUS_CONCLUIDA = "CONCLUIDA";

    private static final String CRITERIO_TEMPO = "TEMPO";
    private static final String CRITERIO_QUILOMETRAGEM = "QUILOMETRAGEM_ESTIMADA";
    private static final String CRITERIO_TEMPO_HISTORICO_INSUFICIENTE = "TEMPO_HISTORICO_INSUFICIENTE";

    private static final String CONFIANCA_BAIXA = "BAIXA";

    private static final String GRUPO_TROCA_OLEO = "TROCA_OLEO";

    private final AtendimentoRepository atendimentoRepository;
    private final AtendimentoServicoExecutadoRepository atendimentoServicoRepository;
    private final AtendimentoPecaUtilizadaRepository atendimentoPecaRepository;
    private final RegraManutencaoPreventivaRepository regraRepository;
    private final PrevisaoManutencaoVeiculoRepository previsaoRepository;
    private final HistoricoQuilometragemVeiculoRepository historicoRepository;
    private final MediaUsoVeiculoService mediaUsoVeiculoService;

    public PrevisaoManutencaoService(
            AtendimentoRepository atendimentoRepository,
            AtendimentoServicoExecutadoRepository atendimentoServicoRepository,
            AtendimentoPecaUtilizadaRepository atendimentoPecaRepository,
            RegraManutencaoPreventivaRepository regraRepository,
            PrevisaoManutencaoVeiculoRepository previsaoRepository,
            HistoricoQuilometragemVeiculoRepository historicoRepository,
            MediaUsoVeiculoService mediaUsoVeiculoService
    ) {
        this.atendimentoRepository = atendimentoRepository;
        this.atendimentoServicoRepository = atendimentoServicoRepository;
        this.atendimentoPecaRepository = atendimentoPecaRepository;
        this.regraRepository = regraRepository;
        this.previsaoRepository = previsaoRepository;
        this.historicoRepository = historicoRepository;
        this.mediaUsoVeiculoService = mediaUsoVeiculoService;
    }

    @Transactional
    public List<PrevisaoManutencaoVeiculo> gerarPrevisoesDoAtendimento(Long atendimentoId) {
        if (atendimentoId == null || atendimentoId <= 0) {
            throw new IllegalArgumentException("Atendimento é obrigatório para gerar previsões.");
        }

        Atendimento atendimento = atendimentoRepository
                .findById(atendimentoId)
                .orElseThrow(() -> new IllegalArgumentException("Atendimento não encontrado."));

        validarAtendimentoParaPrevisao(atendimento);

        Veiculo veiculo = atendimento.getVeiculo();
        Usuario cliente = atendimento.getCliente();

        Integer kmReferencia = resolverQuilometragemReferencia(atendimento);
        LocalDate dataReferencia = resolverDataReferencia(atendimento);

        registrarHistoricoQuilometragem(
                atendimento,
                veiculo,
                dataReferencia,
                kmReferencia
        );

        List<RegraManutencaoPreventiva> regrasAtivas =
                regraRepository.findByAtivoTrueOrderByPrioridadeAsc();

        if (regrasAtivas == null || regrasAtivas.isEmpty()) {
            log.warn(
                    "[PREVISAO-MANUTENCAO] Nenhuma regra ativa encontrada. atendimentoId={}",
                    atendimentoId
            );
            return List.of();
        }

        List<AtendimentoServicoExecutado> servicosExecutados =
                buscarServicosExecutados(atendimentoId);

        List<AtendimentoPecaUtilizada> pecasUtilizadas =
                atendimentoPecaRepository.findByAtendimento_Id(atendimentoId);

        List<CandidatoRegra> candidatos = montarCandidatosDeRegras(
                atendimento,
                servicosExecutados,
                pecasUtilizadas,
                regrasAtivas
        );

        if (candidatos.isEmpty()) {
            log.info(
                    "[PREVISAO-MANUTENCAO] Nenhuma regra aplicável encontrada para atendimentoId={}",
                    atendimentoId
            );
            return List.of();
        }

        Map<String, CandidatoRegra> melhoresCandidatosPorGrupo =
                selecionarMelhorRegraPorGrupo(candidatos);

        List<PrevisaoManutencaoVeiculo> previsoesGeradas = new ArrayList<>();

        for (CandidatoRegra candidato : melhoresCandidatosPorGrupo.values()) {
            PrevisaoManutencaoVeiculo previsao = calcularPrevisao(
                    atendimento,
                    veiculo,
                    cliente,
                    candidato,
                    kmReferencia,
                    dataReferencia
            );

            if (previsao == null) {
                continue;
            }

            encerrarPrevisoesAbertasDoGrupo(
                    veiculo.getId(),
                    previsao.getGrupoManutencao(),
                    atendimento.getId()
            );

            PrevisaoManutencaoVeiculo salva = previsaoRepository.save(previsao);
            previsoesGeradas.add(salva);

            log.info(
                    "[PREVISAO-MANUTENCAO] Previsão gerada. atendimentoId={}, veiculoId={}, grupo={}, dataRecomendada={}, criterio={}, confianca={}",
                    atendimento.getId(),
                    veiculo.getId(),
                    salva.getGrupoManutencao(),
                    salva.getDataRecomendada(),
                    salva.getCriterioUtilizado(),
                    salva.getNivelConfianca()
            );
        }

        return previsoesGeradas;
    }

    private void validarAtendimentoParaPrevisao(Atendimento atendimento) {
        if (atendimento == null || atendimento.getId() == null) {
            throw new IllegalArgumentException("Atendimento inválido para geração de previsão.");
        }

        if (atendimento.getVeiculo() == null || atendimento.getVeiculo().getId() == null) {
            throw new IllegalArgumentException("Atendimento sem veículo vinculado.");
        }

        if (atendimento.getCliente() == null || atendimento.getCliente().getId() == null) {
            throw new IllegalArgumentException("Atendimento sem cliente vinculado.");
        }

        Integer kmReferencia = resolverQuilometragemReferencia(atendimento);

        if (kmReferencia == null || kmReferencia <= 0) {
            throw new IllegalArgumentException(
                    "Informe a quilometragem atual do veículo para gerar a previsão de manutenção."
            );
        }
    }

    private Integer resolverQuilometragemReferencia(Atendimento atendimento) {
        if (atendimento == null) {
            return null;
        }

        if (atendimento.getQuilometragemSaida() != null && atendimento.getQuilometragemSaida() > 0) {
            return atendimento.getQuilometragemSaida();
        }

        return atendimento.getQuilometragemEntrada();
    }

    private LocalDate resolverDataReferencia(Atendimento atendimento) {
        /*
         * Como a previsão deve ser gerada ao concluir o atendimento,
         * usamos atualizadoEm como referência principal.
         *
         * Se sua entidade Atendimento tiver um campo específico,
         * como getConcluidoEm() ou getFinalizadoEm(),
         * você pode priorizar esse campo aqui.
         */
        LocalDateTime dataBase = atendimento.getFinalizadoEm();

        if (dataBase == null) {
            dataBase = atendimento.getFimReal();
        }

        if (dataBase == null) {
            dataBase = atendimento.getAtualizadoEm();
        }

        if (dataBase == null) {
            dataBase = atendimento.getCriadoEm();
        }

        if (dataBase == null) {
            dataBase = LocalDateTime.now();
        }

        return dataBase.toLocalDate();
    }

    private void registrarHistoricoQuilometragem(
            Atendimento atendimento,
            Veiculo veiculo,
            LocalDate dataReferencia,
            Integer kmReferencia
    ) {
        historicoRepository
                .findByAtendimento_Id(atendimento.getId())
                .ifPresentOrElse(
                        historicoExistente -> {
                            historicoExistente.setDataRegistro(dataReferencia);
                            historicoExistente.setQuilometragem(kmReferencia);
                            historicoExistente.setValidoParaCalculo(true);
                            historicoExistente.setOrigem("ATENDIMENTO");
                            historicoExistente.setObservacoes(
                                    "Quilometragem atualizada a partir do atendimento "
                                            + atendimento.getCodigoAtendimento()
                            );
                            historicoRepository.save(historicoExistente);
                        },
                        () -> {
                            HistoricoQuilometragemVeiculo historico =
                                    new HistoricoQuilometragemVeiculo();

                            historico.setVeiculo(veiculo);
                            historico.setAtendimento(atendimento);
                            historico.setDataRegistro(dataReferencia);
                            historico.setQuilometragem(kmReferencia);
                            historico.setOrigem("ATENDIMENTO");
                            historico.setValidoParaCalculo(true);
                            historico.setObservacoes(
                                    "Quilometragem registrada automaticamente a partir do atendimento "
                                            + atendimento.getCodigoAtendimento()
                            );

                            historicoRepository.save(historico);
                        }
                );
    }

    private List<AtendimentoServicoExecutado> buscarServicosExecutados(Long atendimentoId) {
        try {
            return atendimentoServicoRepository.buscarPorAtendimentoComRelacionamentos(atendimentoId);
        } catch (Exception e) {
            log.warn(
                    "[PREVISAO-MANUTENCAO] Não foi possível buscar serviços com relacionamentos. Usando busca simples. atendimentoId={}",
                    atendimentoId
            );

            return atendimentoServicoRepository.findByAtendimento_IdOrderByCriadoEmAsc(atendimentoId);
        }
    }

    private List<CandidatoRegra> montarCandidatosDeRegras(
            Atendimento atendimento,
            List<AtendimentoServicoExecutado> servicosExecutados,
            List<AtendimentoPecaUtilizada> pecasUtilizadas,
            List<RegraManutencaoPreventiva> regrasAtivas
    ) {
        List<CandidatoRegra> candidatos = new ArrayList<>();

        List<Servico> servicos = extrairServicosDoAtendimento(
                atendimento,
                servicosExecutados
        );

        List<Peca> pecas = extrairPecasDoAtendimento(pecasUtilizadas);

        for (Servico servico : servicos) {
            for (RegraManutencaoPreventiva regra : regrasAtivas) {
                if (!regraPossuiIntervalo(regra)) {
                    continue;
                }

                if (regraAplicavelPorServico(regra, servico)) {
                    candidatos.add(new CandidatoRegra(
                            regra,
                            servico,
                            null,
                            80,
                            "SERVICO"
                    ));
                }
            }
        }

        for (Peca peca : pecas) {
            for (RegraManutencaoPreventiva regra : regrasAtivas) {
                if (!regraPossuiIntervalo(regra)) {
                    continue;
                }

                if (regraAplicavelPorPeca(regra, peca)) {
                    candidatos.add(new CandidatoRegra(
                            regra,
                            null,
                            peca,
                            100,
                            "PECA"
                    ));
                    continue;
                }

                if (regraAplicavelPorOrigemOleo(regra, peca)) {
                    candidatos.add(new CandidatoRegra(
                            regra,
                            null,
                            peca,
                            90,
                            "ORIGEM_OLEO"
                    ));
                    continue;
                }

                if (regraGenericaTrocaOleo(regra, peca)) {
                    candidatos.add(new CandidatoRegra(
                            regra,
                            null,
                            peca,
                            70,
                            "OLEO_GENERICO"
                    ));
                }
            }
        }

        return candidatos;
    }

    private List<Servico> extrairServicosDoAtendimento(
            Atendimento atendimento,
            List<AtendimentoServicoExecutado> servicosExecutados
    ) {
        Map<Long, Servico> servicos = new LinkedHashMap<>();

        if (atendimento.getServico() != null && atendimento.getServico().getId() != null) {
            servicos.put(atendimento.getServico().getId(), atendimento.getServico());
        }

        if (servicosExecutados != null) {
            for (AtendimentoServicoExecutado item : servicosExecutados) {
                if (item == null || item.getServico() == null || item.getServico().getId() == null) {
                    continue;
                }

                if ("CANCELADO".equalsIgnoreCase(item.getStatusItem())) {
                    continue;
                }

                servicos.put(item.getServico().getId(), item.getServico());
            }
        }

        return new ArrayList<>(servicos.values());
    }

    private List<Peca> extrairPecasDoAtendimento(
            List<AtendimentoPecaUtilizada> pecasUtilizadas
    ) {
        Map<Long, Peca> pecas = new LinkedHashMap<>();

        if (pecasUtilizadas == null) {
            return List.of();
        }

        for (AtendimentoPecaUtilizada item : pecasUtilizadas) {
            if (item == null || item.getPeca() == null || item.getPeca().getId() == null) {
                continue;
            }

            pecas.put(item.getPeca().getId(), item.getPeca());
        }

        return new ArrayList<>(pecas.values());
    }

    private boolean regraPossuiIntervalo(RegraManutencaoPreventiva regra) {
        if (regra == null) {
            return false;
        }

        boolean possuiKm = regra.getIntervaloKm() != null && regra.getIntervaloKm() > 0;
        boolean possuiDias = regra.getIntervaloDias() != null && regra.getIntervaloDias() > 0;

        return possuiKm || possuiDias;
    }

    private boolean regraAplicavelPorServico(
            RegraManutencaoPreventiva regra,
            Servico servico
    ) {
        if (regra == null || servico == null) {
            return false;
        }

        if (regra.getServico() == null || regra.getServico().getId() == null) {
            return false;
        }

        return Objects.equals(regra.getServico().getId(), servico.getId());
    }

    private boolean regraAplicavelPorPeca(
            RegraManutencaoPreventiva regra,
            Peca peca
    ) {
        if (regra == null || peca == null) {
            return false;
        }

        if (regra.getPeca() == null || regra.getPeca().getId() == null) {
            return false;
        }

        return Objects.equals(regra.getPeca().getId(), peca.getId());
    }

    private boolean regraAplicavelPorOrigemOleo(
            RegraManutencaoPreventiva regra,
            Peca peca
    ) {
        if (regra == null || peca == null) {
            return false;
        }

        String origemRegra = normalizarCodigo(regra.getOrigemOleo());
        String origemPeca = normalizarCodigo(peca.getOrigemOleo());

        if (origemRegra == null || origemPeca == null) {
            return false;
        }

        return origemRegra.equals(origemPeca);
    }

    private boolean regraGenericaTrocaOleo(
            RegraManutencaoPreventiva regra,
            Peca peca
    ) {
        if (regra == null || peca == null) {
            return false;
        }

        String grupo = normalizarCodigo(regra.getGrupoManutencao());

        if (!GRUPO_TROCA_OLEO.equals(grupo)) {
            return false;
        }

        if (!pecaPareceSerOleo(peca)) {
            return false;
        }

        boolean regraSemPeca = regra.getPeca() == null || regra.getPeca().getId() == null;
        boolean regraSemServico = regra.getServico() == null || regra.getServico().getId() == null;
        boolean regraSemOrigem = regra.getOrigemOleo() == null || regra.getOrigemOleo().trim().isBlank();

        return regraSemPeca && regraSemServico && regraSemOrigem;
    }

    private boolean pecaPareceSerOleo(Peca peca) {
        if (peca == null) {
            return false;
        }

        if (peca.getOrigemOleo() != null && !peca.getOrigemOleo().trim().isBlank()) {
            return true;
        }

        String nome = normalizarTextoLivre(peca.getNome());
        String descricao = normalizarTextoLivre(peca.getDescricao());
        String tipo = normalizarTextoLivre(peca.getTipo());

        return contem(nome, "OLEO")
                || contem(descricao, "OLEO")
                || contem(tipo, "OLEO")
                || contem(tipo, "LUBRIFICANTE")
                || contem(descricao, "LUBRIFICANTE");
    }

    private boolean contem(String texto, String trecho) {
        return texto != null && texto.contains(trecho);
    }

    private Map<String, CandidatoRegra> selecionarMelhorRegraPorGrupo(
            List<CandidatoRegra> candidatos
    ) {
        Map<String, CandidatoRegra> melhores = new LinkedHashMap<>();

        for (CandidatoRegra candidato : candidatos) {
            String grupo = normalizarCodigo(candidato.getRegra().getGrupoManutencao());

            if (grupo == null) {
                grupo = "REGRA_" + candidato.getRegra().getId();
            }

            CandidatoRegra atual = melhores.get(grupo);

            if (atual == null || candidatoEhMelhor(candidato, atual)) {
                melhores.put(grupo, candidato);
            }
        }

        return melhores;
    }

    private boolean candidatoEhMelhor(
            CandidatoRegra novo,
            CandidatoRegra atual
    ) {
        if (novo.getEspecificidade() > atual.getEspecificidade()) {
            return true;
        }

        if (novo.getEspecificidade() < atual.getEspecificidade()) {
            return false;
        }

        int prioridadeNovo = novo.getRegra().getPrioridade() != null
                ? novo.getRegra().getPrioridade()
                : 100;

        int prioridadeAtual = atual.getRegra().getPrioridade() != null
                ? atual.getRegra().getPrioridade()
                : 100;

        if (prioridadeNovo < prioridadeAtual) {
            return true;
        }

        if (prioridadeNovo > prioridadeAtual) {
            return false;
        }

        Long idNovo = novo.getRegra().getId() != null ? novo.getRegra().getId() : Long.MAX_VALUE;
        Long idAtual = atual.getRegra().getId() != null ? atual.getRegra().getId() : Long.MAX_VALUE;

        return idNovo < idAtual;
    }

    private PrevisaoManutencaoVeiculo calcularPrevisao(
            Atendimento atendimento,
            Veiculo veiculo,
            Usuario cliente,
            CandidatoRegra candidato,
            Integer kmReferencia,
            LocalDate dataReferencia
    ) {
        RegraManutencaoPreventiva regra = candidato.getRegra();

        Integer kmLimite = null;

        if (regra.getIntervaloKm() != null && regra.getIntervaloKm() > 0) {
            kmLimite = kmReferencia + regra.getIntervaloKm();
        }

        LocalDate dataLimiteTempo = null;

        if (regra.getIntervaloDias() != null && regra.getIntervaloDias() > 0) {
            dataLimiteTempo = dataReferencia.plusDays(regra.getIntervaloDias());
        }

        MediaUsoVeiculoService.MediaUsoVeiculoResultado media =
                mediaUsoVeiculoService.calcularMediaUsoVeiculo(veiculo.getId());

        LocalDate dataEstimadaKm = calcularDataEstimadaPorKm(
                dataReferencia,
                kmReferencia,
                kmLimite,
                media
        );

        LocalDate dataRecomendada = escolherMenorDataValida(
                dataLimiteTempo,
                dataEstimadaKm
        );

        if (dataRecomendada == null) {
            log.warn(
                    "[PREVISAO-MANUTENCAO] Regra ignorada porque não foi possível calcular data recomendada. regraId={}, grupo={}",
                    regra.getId(),
                    regra.getGrupoManutencao()
            );
            return null;
        }

        String criterioUtilizado = definirCriterioUtilizado(
                dataRecomendada,
                dataLimiteTempo,
                dataEstimadaKm,
                media
        );

        String nivelConfianca = definirNivelConfiancaFinal(
                criterioUtilizado,
                media
        );

        PrevisaoManutencaoVeiculo previsao = new PrevisaoManutencaoVeiculo();

        previsao.setVeiculo(veiculo);
        previsao.setCliente(cliente);
        previsao.setAtendimentoOrigem(atendimento);
        previsao.setRegraManutencao(regra);

        previsao.setServico(candidato.getServico() != null ? candidato.getServico() : regra.getServico());
        previsao.setPeca(candidato.getPeca() != null ? candidato.getPeca() : regra.getPeca());

        previsao.setGrupoManutencao(normalizarCodigo(regra.getGrupoManutencao()));
        previsao.setDescricao(regra.getDescricao());

        previsao.setOrigemOleo(resolverOrigemOleoPrevisao(candidato, regra));

        previsao.setKmReferencia(kmReferencia);
        previsao.setKmLimite(kmLimite);

        previsao.setDataReferencia(dataReferencia);
        previsao.setDataLimiteTempo(dataLimiteTempo);
        previsao.setDataEstimadaKm(dataEstimadaKm);
        previsao.setDataRecomendada(dataRecomendada);

        previsao.setCriterioUtilizado(criterioUtilizado);
        previsao.setMediaKmDia(media.getMediaKmDia());
        previsao.setQuantidadeRegistrosCalculo(media.getQuantidadeRegistrosCalculo());
        previsao.setNivelConfianca(nivelConfianca);

        previsao.setStatusPrevisao(STATUS_PENDENTE);

        previsao.setObservacoes(montarObservacaoPrevisao(
                regra,
                candidato,
                media,
                dataLimiteTempo,
                dataEstimadaKm,
                dataRecomendada,
                criterioUtilizado
        ));

        return previsao;
    }

    private LocalDate calcularDataEstimadaPorKm(
            LocalDate dataReferencia,
            Integer kmReferencia,
            Integer kmLimite,
            MediaUsoVeiculoService.MediaUsoVeiculoResultado media
    ) {
        if (dataReferencia == null || kmReferencia == null || kmLimite == null) {
            return null;
        }

        if (media == null || media.getMediaKmDia() == null) {
            return null;
        }

        if (media.getMediaKmDia().compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }

        int kmRestante = kmLimite - kmReferencia;

        if (kmRestante <= 0) {
            return dataReferencia;
        }

        long diasEstimados = BigDecimal
                .valueOf(kmRestante)
                .divide(media.getMediaKmDia(), 0, RoundingMode.CEILING)
                .longValue();

        return dataReferencia.plusDays(diasEstimados);
    }

    private LocalDate escolherMenorDataValida(
            LocalDate dataLimiteTempo,
            LocalDate dataEstimadaKm
    ) {
        if (dataLimiteTempo == null) {
            return dataEstimadaKm;
        }

        if (dataEstimadaKm == null) {
            return dataLimiteTempo;
        }

        return dataLimiteTempo.isBefore(dataEstimadaKm)
                ? dataLimiteTempo
                : dataEstimadaKm;
    }

    private String definirCriterioUtilizado(
            LocalDate dataRecomendada,
            LocalDate dataLimiteTempo,
            LocalDate dataEstimadaKm,
            MediaUsoVeiculoService.MediaUsoVeiculoResultado media
    ) {
        if (dataEstimadaKm == null && dataLimiteTempo != null) {
            if (media == null
                    || media.getMediaKmDia() == null
                    || media.getMediaKmDia().compareTo(BigDecimal.ZERO) <= 0) {
                return CRITERIO_TEMPO_HISTORICO_INSUFICIENTE;
            }

            return CRITERIO_TEMPO;
        }

        if (dataLimiteTempo == null && dataEstimadaKm != null) {
            return CRITERIO_QUILOMETRAGEM;
        }

        if (dataRecomendada != null && dataRecomendada.equals(dataEstimadaKm)) {
            return CRITERIO_QUILOMETRAGEM;
        }

        return CRITERIO_TEMPO;
    }

    private String definirNivelConfiancaFinal(
            String criterioUtilizado,
            MediaUsoVeiculoService.MediaUsoVeiculoResultado media
    ) {
        if (CRITERIO_TEMPO_HISTORICO_INSUFICIENTE.equals(criterioUtilizado)) {
            return CONFIANCA_BAIXA;
        }

        if (media == null || media.getNivelConfianca() == null) {
            return CONFIANCA_BAIXA;
        }

        return media.getNivelConfianca();
    }

    private String resolverOrigemOleoPrevisao(
            CandidatoRegra candidato,
            RegraManutencaoPreventiva regra
    ) {
        if (candidato.getPeca() != null && candidato.getPeca().getOrigemOleo() != null) {
            return normalizarCodigo(candidato.getPeca().getOrigemOleo());
        }

        if (regra.getOrigemOleo() != null) {
            return normalizarCodigo(regra.getOrigemOleo());
        }

        return null;
    }

    private String montarObservacaoPrevisao(
            RegraManutencaoPreventiva regra,
            CandidatoRegra candidato,
            MediaUsoVeiculoService.MediaUsoVeiculoResultado media,
            LocalDate dataLimiteTempo,
            LocalDate dataEstimadaKm,
            LocalDate dataRecomendada,
            String criterioUtilizado
    ) {
        StringBuilder obs = new StringBuilder();

        obs.append("Previsão gerada com base na regra: ")
                .append(regra.getDescricao())
                .append(". Origem da aplicação: ")
                .append(candidato.getOrigemAplicacao())
                .append(".");

        if (dataLimiteTempo != null) {
            obs.append(" Limite por tempo: ")
                    .append(dataLimiteTempo)
                    .append(".");
        }

        if (dataEstimadaKm != null) {
            obs.append(" Data estimada por quilometragem: ")
                    .append(dataEstimadaKm)
                    .append(".");
        }

        obs.append(" Data recomendada: ")
                .append(dataRecomendada)
                .append(". Critério utilizado: ")
                .append(criterioUtilizado)
                .append(".");

        if (media != null && media.getObservacao() != null) {
            obs.append(" ").append(media.getObservacao());
        }

        return obs.toString();
    }

    private void encerrarPrevisoesAbertasDoGrupo(
            Long veiculoId,
            String grupoManutencao,
            Long atendimentoOrigemId
    ) {
        List<String> statusAbertos = List.of(
                STATUS_PENDENTE,
                STATUS_PROXIMA,
                STATUS_VENCIDA,
                STATUS_AGENDADA
        );

        List<PrevisaoManutencaoVeiculo> previsoesAbertas =
                previsaoRepository.findByVeiculo_IdAndGrupoManutencaoAndStatusPrevisaoIn(
                        veiculoId,
                        grupoManutencao,
                        statusAbertos
                );

        if (previsoesAbertas == null || previsoesAbertas.isEmpty()) {
            return;
        }

        for (PrevisaoManutencaoVeiculo previsao : previsoesAbertas) {
            previsao.setStatusPrevisao(STATUS_CONCLUIDA);

            String observacaoAnterior = previsao.getObservacoes() != null
                    ? previsao.getObservacoes() + " "
                    : "";

            previsao.setObservacoes(
                    observacaoAnterior
                            + "Previsão encerrada automaticamente após conclusão do atendimento ID "
                            + atendimentoOrigemId
                            + "."
            );
        }

        previsaoRepository.saveAll(previsoesAbertas);
    }

    private String normalizarCodigo(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        String semAcento = Normalizer
                .normalize(valor, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        return semAcento
                .trim()
                .toUpperCase(Locale.ROOT)
                .replace("-", "_")
                .replace(" ", "_");
    }

    private String normalizarTextoLivre(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        String semAcento = Normalizer
                .normalize(valor, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        return semAcento
                .trim()
                .toUpperCase(Locale.ROOT);
    }

    @Data
    @AllArgsConstructor
    private static class CandidatoRegra {

        private RegraManutencaoPreventiva regra;

        private Servico servico;

        private Peca peca;

        private Integer especificidade;

        private String origemAplicacao;
    }
}