package com.clinicar.backend.service;

import com.clinicar.backend.model.AlertaEstoquePeca;
import com.clinicar.backend.model.ConfiguracaoAlertaEstoque;
import com.clinicar.backend.model.EstoquePeca;
import com.clinicar.backend.repository.AlertaEstoquePecaRepository;
import com.clinicar.backend.repository.ConfiguracaoAlertaEstoqueRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
public class AlertaEstoquePecaService {

    private static final String STATUS_ABERTO = "ABERTO";
    private static final String STATUS_RESOLVIDO = "RESOLVIDO";

    private static final String NIVEL_NORMAL = "NORMAL";
    private static final String NIVEL_ATENCAO = "ATENCAO";
    private static final String NIVEL_CRITICO = "CRITICO";
    private static final String NIVEL_ZERADO = "ZERADO";

    private static final Set<String> NIVEIS_COM_ENVIO_WHATSAPP = Set.of(
            NIVEL_ATENCAO,
            NIVEL_CRITICO,
            NIVEL_ZERADO
    );

    private final AlertaEstoquePecaRepository alertaRepository;
    private final ConfiguracaoAlertaEstoqueRepository configuracaoRepository;
    private final WhatsappEstoqueService whatsappEstoqueService;
    private final com.clinicar.backend.repository.EstoquePecaRepository estoqueRepository;

    public AlertaEstoquePecaService(
            AlertaEstoquePecaRepository alertaRepository,
            ConfiguracaoAlertaEstoqueRepository configuracaoRepository,
            WhatsappEstoqueService whatsappEstoqueService,
            com.clinicar.backend.repository.EstoquePecaRepository estoqueRepository
    ) {
        this.alertaRepository = alertaRepository;
        this.configuracaoRepository = configuracaoRepository;
        this.whatsappEstoqueService = whatsappEstoqueService;
        this.estoqueRepository = estoqueRepository;
    }

    /**
     * Método usado pelos fluxos de reserva, baixa e movimentações de estoque.
     *
     * Regra de alerta:
     * - NORMAL: não envia WhatsApp e resolve alertas abertos.
     * - ATENCAO: envia se ainda não existir alerta aberto de ATENCAO para o mesmo estoque.
     * - CRITICO: envia se ainda não existir alerta aberto de CRITICO para o mesmo estoque.
     * - ZERADO: envia se ainda não existir alerta aberto de ZERADO para o mesmo estoque.
     */
    @Transactional
    public void avaliarEEnviarAlertaSeNecessario(
            EstoquePeca estoque,
            String origem,
            String documentoReferencia
    ) {
        avaliarEEnviarAlertaSeNecessario(estoque, origem, documentoReferencia, false);
    }

    @Transactional
    public void avaliarEEnviarAlertaSeNecessario(EstoquePeca estoque, String origem, String documentoReferencia, boolean forcarPendente) {
        if (estoque == null || estoque.getId() == null) {
            log.warn("[ALERTA-ESTOQUE] Estoque não informado. Avaliação de alerta ignorada.");
            return;
        }

        String nivelAtual = calcularNivelPelaQuantidadeDisponivel(estoque);
        BigDecimal quantidadeAtual = valorOuZero(estoque.getQuantidadeAtual());
        BigDecimal quantidadeReservada = valorOuZero(estoque.getQuantidadeReservada());
        BigDecimal quantidadeDisponivel = calcularQuantidadeDisponivel(estoque);

        log.info(
                "[ALERTA-ESTOQUE] Avaliando estoque ID {}. Nivel={}, origem={}, documento={}, atual={}, reservada={}, disponivel={}.",
                estoque.getId(),
                nivelAtual,
                origem,
                documentoReferencia,
                quantidadeAtual,
                quantidadeReservada,
                quantidadeDisponivel
        );

        boolean suspenso = false;
        for (var encerrado : alertaRepository.findByEstoquePeca_IdAndStatusAlerta(estoque.getId(), "ENCERRADO")) {
            if (!Boolean.TRUE.equals(encerrado.getExcecaoAtiva())) continue;
            if (nivelAtual.equals(encerrado.getNivelAlerta())) suspenso = true;
            else { encerrado.setExcecaoAtiva(false); alertaRepository.save(encerrado); }
        }
        if (suspenso) return;

        if (NIVEL_NORMAL.equals(nivelAtual)) {
            resolverAlertasAbertosSeEstoqueNormalizado(estoque);
            return;
        }

        if (!NIVEIS_COM_ENVIO_WHATSAPP.contains(nivelAtual)) {
            log.info(
                    "[ALERTA-ESTOQUE] Nível {} não configurado para envio de WhatsApp. Estoque ID {}.",
                    nivelAtual,
                    estoque.getId()
            );
            return;
        }

        // Mantém aberto apenas o nível atual; evita lembretes de níveis antigos.
        for (var anterior : alertaRepository.findByEstoquePeca_IdAndStatusAlerta(estoque.getId(), STATUS_ABERTO)) {
            if (!nivelAtual.equals(anterior.getNivelAlerta())) { anterior.setStatusAlerta("SUPERADO"); anterior.setEncerradoEm(LocalDateTime.now()); alertaRepository.save(anterior); }
        }
        Optional<AlertaEstoquePeca> alertaAbertoMesmoNivel =
                alertaRepository.findFirstByEstoquePeca_IdAndNivelAlertaAndStatusAlertaOrderByCriadoEmDesc(
                        estoque.getId(),
                        nivelAtual,
                        STATUS_ABERTO
                );

        /*
         * Regra anti-duplicidade:
         * bloqueia apenas alertas repetidos do mesmo nível.
         *
         * Exemplo:
         * - já existe CRITICO aberto: não cria outro CRITICO.
         * - já existe CRITICO aberto e o estoque passou para ZERADO: cria novo ZERADO.
         */
        if (alertaAbertoMesmoNivel.isPresent()) {
            AlertaEstoquePeca alertaExistente = alertaAbertoMesmoNivel.get();

            var c = configuracaoRepository.findFirstByAtivoTrueOrderByIdAsc().orElse(null);
            LocalDateTime ultima = alertaExistente.getUltimaTentativaEm() != null ? alertaExistente.getUltimaTentativaEm() : alertaExistente.getWhatsappEnviadoEm();
            boolean pendente = !Boolean.TRUE.equals(alertaExistente.getWhatsappEnviado());
            boolean intervaloVencido = ultima == null || (c != null && !ultima.plusHours(c.getReenviarAlertaAposHoras()).isAfter(LocalDateTime.now()));
            if ((forcarPendente && pendente) || intervaloVencido) {
                atualizarDadosAlerta(alertaExistente, estoque, origem, documentoReferencia);
                tentarEnviarWhatsapp(alertaExistente);
            }
            return;
        }

        AlertaEstoquePeca alerta = new AlertaEstoquePeca();

        alerta.setEstoquePeca(estoque);
        alerta.setPeca(estoque.getPeca());
        alerta.setNivelAlerta(nivelAtual);
        alerta.setStatusAlerta(STATUS_ABERTO);

        alerta.setQuantidadeAtual(quantidadeAtual);
        alerta.setEstoqueMinimo(valorOuZero(estoque.getEstoqueMinimo()));
        alerta.setEstoqueCritico(valorOuZero(estoque.getEstoqueCritico()));

        alerta.setWhatsappEnviado(false);
        alerta.setTentativasEnvio(0);
        alerta.setUltimoErro(null);

        alerta.setMensagem(
                montarMensagem(
                        alerta,
                        estoque,
                        origem,
                        documentoReferencia
                )
        );

        AlertaEstoquePeca salvo = alertaRepository.save(alerta);

        log.info(
                "[ALERTA-ESTOQUE] Novo alerta criado. alertaId={}, estoqueId={}, nivel={}",
                salvo.getId(),
                estoque.getId(),
                nivelAtual
        );

        tentarEnviarWhatsapp(salvo);
    }

    /**
     * Mantido por compatibilidade com chamadas antigas do sistema.
     */
    @Transactional
    public void verificarEGerarAlertaSeNecessario(EstoquePeca estoque) {
        avaliarEEnviarAlertaSeNecessario(
                estoque,
                "VERIFICACAO_ESTOQUE",
                null
        );
    }

    public List<AlertaEstoquePeca> listarTodos() {
        return alertaRepository.findAllByOrderByCriadoEmDesc();
    }

    public List<AlertaEstoquePeca> listarAbertos() {
        return alertaRepository.findByStatusAlertaOrderByCriadoEmDesc(STATUS_ABERTO);
    }

    public AlertaEstoquePeca buscarPorId(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID do alerta não informado.");
        }

        return alertaRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Alerta de estoque não encontrado."));
    }

    @Transactional
    public AlertaEstoquePeca resolver(Long id) {
        var alerta = bloquearAlerta(id);
        if (!NIVEL_NORMAL.equals(calcularNivelPelaQuantidadeDisponivel(alerta.getEstoquePeca())))
            throw new IllegalArgumentException("O estoque ainda está abaixo do nível normal. Registre uma entrada real ou reconheça o alerta.");
        alerta.setStatusAlerta(STATUS_RESOLVIDO);
        alerta.setEncerradoEm(LocalDateTime.now());
        return alertaRepository.save(alerta);
    }

    @Transactional
    public AlertaEstoquePeca reconhecer(Long id, com.clinicar.backend.dto.UsuarioResponse usuario) {
        validarAdministrador(usuario);
        var alerta = bloquearAlerta(id);
        if (alerta.getReconhecidoEm() == null) {
            alerta.setReconhecidoEm(LocalDateTime.now());
            alerta.setIdUsuarioReconhecimento(usuario.getId());
            alerta.setNomeUsuarioReconhecimento(usuario.getNome());
        }
        return alertaRepository.save(alerta);
    }

    @Transactional
    public AlertaEstoquePeca encerrarExcepcionalmente(Long id, String justificativa, com.clinicar.backend.dto.UsuarioResponse usuario) {
        validarAdministrador(usuario);
        String motivo = justificativa == null ? "" : justificativa.strip();
        if (motivo.length() < 10 || motivo.length() > 1000)
            throw new IllegalArgumentException("Informe uma justificativa com 10 a 1.000 caracteres para o encerramento excepcional.");
        var alerta = bloquearAlerta(id);
        validarReenvio(alerta, alerta.getEstoquePeca());
        alerta.setStatusAlerta("ENCERRADO");
        alerta.setEncerradoEm(LocalDateTime.now());
        alerta.setIdUsuarioEncerramento(usuario.getId());
        alerta.setNomeUsuarioEncerramento(usuario.getNome());
        alerta.setJustificativaEncerramento(motivo);
        alerta.setExcecaoAtiva(true);
        return alertaRepository.save(alerta);
    }

    private void validarAdministrador(com.clinicar.backend.dto.UsuarioResponse usuario) {
        if (usuario == null || usuario.getId() == null || !"ADMINISTRADOR".equalsIgnoreCase(usuario.getTipo_do_acesso()))
            throw new IllegalArgumentException("A ação exige um administrador autenticado.");
    }

    private AlertaEstoquePeca bloquearAlerta(Long id) {
        var estoqueId = alertaRepository.buscarIdEstoque(id).orElseThrow(() -> new IllegalArgumentException("Alerta de estoque não encontrado."));
        estoqueRepository.buscarComLockPorId(estoqueId).orElseThrow(() -> new IllegalArgumentException("Estoque não encontrado."));
        var alerta = buscarPorId(id);
        if (!STATUS_ABERTO.equals(alerta.getStatusAlerta()))
            throw new IllegalArgumentException("Este alerta já foi encerrado. Atualize a lista de alertas.");
        return alerta;
    }

    @Transactional
    public AlertaEstoquePeca reenviarWhatsapp(Long id) {
        var idEstoque = alertaRepository.buscarIdEstoque(id).orElseThrow(() -> new IllegalArgumentException("Alerta de estoque não encontrado."));
        var estoque = estoqueRepository.buscarComLockPorId(idEstoque).orElseThrow();
        var alerta = alertaRepository.findById(id).orElseThrow();
        validarReenvio(alerta, estoque);
        atualizarDadosAlerta(alerta, estoque, "REENVIO_MANUAL", null);
        tentarEnviarWhatsapp(alerta);

        return alertaRepository.findById(id).orElse(alerta);
    }

    private void tentarEnviarWhatsapp(AlertaEstoquePeca alerta) {
        if (alerta == null || alerta.getId() == null) {
            return;
        }

        ConfiguracaoAlertaEstoque configuracao = configuracaoRepository
                .findFirstByAtivoTrueOrderByIdAsc()
                .orElse(null);

        if (configuracao == null) {
            alerta.setUltimoErro("Configure e ative os alertas de estoque na página Alertas para enviar pelo WhatsApp.");
            alertaRepository.save(alerta);
            log.warn(
                    "[ALERTA-ESTOQUE] Configuração ativa de alerta de estoque não encontrada. WhatsApp não enviado para alerta ID {}.",
                    alerta.getId()
            );
            return;
        }

        alerta.setUltimaTentativaEm(LocalDateTime.now());
        try {
            ConfiguracaoAlertaEstoque destinatario = configuracao;
            if ("CRITICO".equalsIgnoreCase(alerta.getNivelAlerta()) || "ZERADO".equalsIgnoreCase(alerta.getNivelAlerta())) {
                destinatario = new ConfiguracaoAlertaEstoque();
                destinatario.setAtivo(configuracao.getAtivo());
                destinatario.setIdResponsavel(configuracao.getIdAdministradorCritico());
                destinatario.setNomeResponsavel(configuracao.getNomeAdministradorCritico());
                destinatario.setTelefoneAdministrador(configuracao.getTelefoneAdministradorCritico());
            }
            String messageId = whatsappEstoqueService.enviarAlertaEstoque(alerta, destinatario);

            if (messageId == null || messageId.isBlank()) throw new IllegalStateException("A Meta não confirmou a aceitação do envio. Verifique o histórico antes de reenviar.");
            alerta.setWhatsappEnviado(!messageId.startsWith("fila:"));
            alerta.setWhatsappEnviadoEm(messageId.startsWith("fila:") ? null : LocalDateTime.now());
            alerta.setWhatsappDestinatario(destinatario.getTelefoneAdministrador());
            alerta.setWhatsappMessageId(messageId);
            alerta.setUltimoErro(null);
            alerta.setTentativasEnvio(incrementarTentativas(alerta));

            alertaRepository.save(alerta);

            log.info(
                    "[ALERTA-ESTOQUE] WhatsApp enviado com sucesso para alerta ID {}. MessageId={}",
                    alerta.getId(),
                    messageId
            );

        } catch (Exception e) {
            if(e instanceof org.springframework.dao.DataAccessException databaseError) throw databaseError;
            alerta.setWhatsappEnviado(false);
            alerta.setTentativasEnvio(incrementarTentativas(alerta));
            alerta.setUltimoErro(e.getMessage());

            alertaRepository.save(alerta);

            log.error(
                    "[ALERTA-ESTOQUE] Falha ao enviar WhatsApp para alerta ID {}: {}",
                    alerta.getId(),
                    e.getMessage(),
                    e
            );
        }
    }

    private void validarReenvio(AlertaEstoquePeca alerta, EstoquePeca estoque) {
        if (!STATUS_ABERTO.equals(alerta.getStatusAlerta()) || !Boolean.TRUE.equals(estoque.getAtivo())
                || !alerta.getNivelAlerta().equals(calcularNivelPelaQuantidadeDisponivel(estoque)))
            throw new IllegalArgumentException("Este alerta não corresponde à situação atual do estoque. Atualize a lista de alertas.");
    }
    private void atualizarDadosAlerta(AlertaEstoquePeca alerta, EstoquePeca estoque, String origem, String documento) {
        alerta.setQuantidadeAtual(valorOuZero(estoque.getQuantidadeAtual()));
        alerta.setEstoqueMinimo(valorOuZero(estoque.getEstoqueMinimo())); alerta.setEstoqueCritico(valorOuZero(estoque.getEstoqueCritico()));
        alerta.setMensagem(montarMensagem(alerta, estoque, origem, documento));
    }
    private void resolverAlertasAbertosSeEstoqueNormalizado(EstoquePeca estoque) {
        if (estoque == null || estoque.getId() == null) {
            return;
        }

        List<AlertaEstoquePeca> alertasAbertos =
                alertaRepository.findByEstoquePeca_IdAndStatusAlerta(
                        estoque.getId(),
                        STATUS_ABERTO
                );

        if (alertasAbertos.isEmpty()) {
            return;
        }

        for (AlertaEstoquePeca alerta : alertasAbertos) {
            alerta.setStatusAlerta(STATUS_RESOLVIDO);
            alerta.setEncerradoEm(LocalDateTime.now());
            alertaRepository.save(alerta);

            log.info(
                    "[ALERTA-ESTOQUE] Alerta ID {} resolvido automaticamente. Estoque ID {} voltou ao nível NORMAL.",
                    alerta.getId(),
                    estoque.getId()
            );
        }
    }

    private String calcularNivelPelaQuantidadeDisponivel(EstoquePeca estoque) {
        BigDecimal disponivel = calcularQuantidadeDisponivel(estoque);
        BigDecimal minimo = valorOuZero(estoque.getEstoqueMinimo());
        BigDecimal critico = valorOuZero(estoque.getEstoqueCritico());

        /*
         * O nível ZERADO precisa ser avaliado antes do CRITICO.
         * Caso contrário, uma peça com disponibilidade 0 poderia continuar sendo tratada como CRITICO
         * e o alerta de agravamento para ZERADO nunca seria criado/enviado.
         */
        if (disponivel.compareTo(BigDecimal.ZERO) <= 0) {
            return NIVEL_ZERADO;
        }

        if (critico.compareTo(BigDecimal.ZERO) > 0
                && disponivel.compareTo(critico) <= 0) {
            return NIVEL_CRITICO;
        }

        if (minimo.compareTo(BigDecimal.ZERO) > 0
                && disponivel.compareTo(minimo) <= 0) {
            return NIVEL_ATENCAO;
        }

        return NIVEL_NORMAL;
    }

    private BigDecimal calcularQuantidadeDisponivel(EstoquePeca estoque) {
        BigDecimal atual = valorOuZero(estoque.getQuantidadeAtual());
        BigDecimal reservada = valorOuZero(estoque.getQuantidadeReservada());

        BigDecimal disponivel = atual.subtract(reservada);

        if (disponivel.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return disponivel.setScale(3, RoundingMode.HALF_UP);
    }

    private String montarMensagem(
            AlertaEstoquePeca alerta,
            EstoquePeca estoque,
            String origem,
            String documentoReferencia
    ) {
        String nomePeca = alerta.getPeca() != null
                ? alerta.getPeca().getNome()
                : "Peça não identificada";

        String local = estoque != null
                && estoque.getLocalEstoque() != null
                ? estoque.getLocalEstoque().getNome()
                : "Local não informado";

        BigDecimal quantidadeAtual = valorOuZero(estoque.getQuantidadeAtual());
        BigDecimal quantidadeReservada = valorOuZero(estoque.getQuantidadeReservada());
        BigDecimal quantidadeDisponivel = calcularQuantidadeDisponivel(estoque);
        BigDecimal estoqueMinimo = valorOuZero(estoque.getEstoqueMinimo());
        BigDecimal estoqueCritico = valorOuZero(estoque.getEstoqueCritico());

        String textoOrigem = origem == null || origem.isBlank()
                ? ""
                : " Origem: " + origem + ".";

        String textoDocumento = documentoReferencia == null || documentoReferencia.isBlank()
                ? ""
                : " Referência: " + documentoReferencia + ".";

        return "Alerta de estoque: peça " + nomePeca
                + " atingiu nível " + descricaoNivel(alerta.getNivelAlerta())
                + ". Estoque atual: " + quantidadeAtual
                + ". Quantidade reservada: " + quantidadeReservada
                + ". Quantidade disponível: " + quantidadeDisponivel
                + ". Estoque mínimo: " + estoqueMinimo
                + ". Estoque crítico: " + estoqueCritico
                + ". Local: " + local + "."
                + textoOrigem
                + textoDocumento;
    }

    private String descricaoNivel(String nivel) {
        if (NIVEL_ZERADO.equals(nivel)) {
            return "ZERADO - reposição imediata necessária";
        }

        if (NIVEL_CRITICO.equals(nivel)) {
            return "CRITICO";
        }

        if (NIVEL_ATENCAO.equals(nivel)) {
            return "ATENCAO";
        }

        return nivel != null ? nivel : "NÃO INFORMADO";
    }

    private int incrementarTentativas(AlertaEstoquePeca alerta) {
        Integer tentativas = alerta.getTentativasEnvio();

        if (tentativas == null) {
            return 1;
        }

        return tentativas + 1;
    }

    private BigDecimal valorOuZero(BigDecimal valor) {
        if (valor == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return valor.setScale(3, RoundingMode.HALF_UP);
    }
}
