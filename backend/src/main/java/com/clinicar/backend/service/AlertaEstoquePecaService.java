package com.clinicar.backend.service;

import com.clinicar.backend.model.AlertaEstoquePeca;
import com.clinicar.backend.model.ConfiguracaoAlertaEstoque;
import com.clinicar.backend.model.EstoquePeca;
import com.clinicar.backend.repository.AlertaEstoquePecaRepository;
import com.clinicar.backend.repository.ConfiguracaoAlertaEstoqueRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class AlertaEstoquePecaService {

    private final AlertaEstoquePecaRepository alertaRepository;
    private final ConfiguracaoAlertaEstoqueRepository configuracaoRepository;
    private final WhatsappEstoqueService whatsappEstoqueService;

    public AlertaEstoquePecaService(
            AlertaEstoquePecaRepository alertaRepository,
            ConfiguracaoAlertaEstoqueRepository configuracaoRepository,
            WhatsappEstoqueService whatsappEstoqueService
    ) {
        this.alertaRepository = alertaRepository;
        this.configuracaoRepository = configuracaoRepository;
        this.whatsappEstoqueService = whatsappEstoqueService;
    }

    public void verificarEGerarAlertaSeNecessario(EstoquePeca estoque) {
        if (estoque == null || estoque.getStatusEstoque() == null) {
            return;
        }

        String status = estoque.getStatusEstoque();

        if ("NORMAL".equalsIgnoreCase(status)) {
            resolverAlertasAbertosSeEstoqueNormalizado(estoque);
            return;
        }

        if (!"ATENCAO".equalsIgnoreCase(status)
                && !"CRITICO".equalsIgnoreCase(status)
                && !"ZERADO".equalsIgnoreCase(status)) {
            return;
        }

        Optional<AlertaEstoquePeca> alertaAbertoMesmoNivel =
                alertaRepository.findFirstByEstoquePeca_IdAndNivelAlertaAndStatusAlertaOrderByCriadoEmDesc(
                        estoque.getId(),
                        status,
                        "ABERTO"
                );

        if (alertaAbertoMesmoNivel.isPresent()) {
            tentarReenvioSeNecessario(alertaAbertoMesmoNivel.get());
            return;
        }

        AlertaEstoquePeca alerta = new AlertaEstoquePeca();

        alerta.setEstoquePeca(estoque);
        alerta.setPeca(estoque.getPeca());
        alerta.setNivelAlerta(status);
        alerta.setStatusAlerta("ABERTO");
        alerta.setQuantidadeAtual(estoque.getQuantidadeAtual());
        alerta.setEstoqueMinimo(estoque.getEstoqueMinimo());
        alerta.setEstoqueCritico(estoque.getEstoqueCritico());
        alerta.setMensagem(montarMensagem(alerta));

        AlertaEstoquePeca salvo = alertaRepository.save(alerta);

        tentarEnviarWhatsapp(salvo);
    }

    public List<AlertaEstoquePeca> listarTodos() {
        return alertaRepository.findAllByOrderByCriadoEmDesc();
    }

    public List<AlertaEstoquePeca> listarAbertos() {
        return alertaRepository.findByStatusAlertaOrderByCriadoEmDesc("ABERTO");
    }

    public AlertaEstoquePeca buscarPorId(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID do alerta não informado.");
        }

        return alertaRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Alerta de estoque não encontrado."));
    }

    public AlertaEstoquePeca resolver(Long id) {
        AlertaEstoquePeca alerta = buscarPorId(id);

        alerta.setStatusAlerta("RESOLVIDO");

        return alertaRepository.save(alerta);
    }

    public AlertaEstoquePeca reenviarWhatsapp(Long id) {
        AlertaEstoquePeca alerta = buscarPorId(id);

        tentarEnviarWhatsapp(alerta);

        return alertaRepository.findById(id).orElse(alerta);
    }

    private void tentarEnviarWhatsapp(AlertaEstoquePeca alerta) {
        ConfiguracaoAlertaEstoque configuracao = configuracaoRepository
                .findFirstByAtivoTrueOrderByIdAsc()
                .orElse(null);

        if (configuracao == null) {
            alerta.setUltimoErro("Configuração de alerta de estoque não encontrada.");
            alerta.setTentativasEnvio(alerta.getTentativasEnvio() + 1);
            alertaRepository.save(alerta);
            return;
        }

        try {
            String messageId = whatsappEstoqueService.enviarAlertaEstoque(alerta, configuracao);

            alerta.setWhatsappEnviado(true);
            alerta.setWhatsappEnviadoEm(LocalDateTime.now());
            alerta.setWhatsappDestinatario(configuracao.getTelefoneAdministrador());
            alerta.setWhatsappMessageId(messageId);
            alerta.setUltimoErro(null);
            alerta.setTentativasEnvio(alerta.getTentativasEnvio() + 1);

            alertaRepository.save(alerta);

        } catch (Exception e) {
            alerta.setWhatsappEnviado(false);
            alerta.setTentativasEnvio(alerta.getTentativasEnvio() + 1);
            alerta.setUltimoErro(e.getMessage());

            alertaRepository.save(alerta);
        }
    }

    private void tentarReenvioSeNecessario(AlertaEstoquePeca alerta) {
        ConfiguracaoAlertaEstoque configuracao = configuracaoRepository
                .findFirstByAtivoTrueOrderByIdAsc()
                .orElse(null);

        if (configuracao == null) {
            return;
        }

        LocalDateTime ultimoEnvio = alerta.getWhatsappEnviadoEm();

        if (ultimoEnvio == null) {
            tentarEnviarWhatsapp(alerta);
            return;
        }

        LocalDateTime proximoReenvio = ultimoEnvio.plusHours(
                configuracao.getReenviarAlertaAposHoras()
        );

        if (LocalDateTime.now().isAfter(proximoReenvio)) {
            tentarEnviarWhatsapp(alerta);
        }
    }

    private void resolverAlertasAbertosSeEstoqueNormalizado(EstoquePeca estoque) {
        alertaRepository
                .findFirstByEstoquePeca_IdAndStatusAlertaOrderByCriadoEmDesc(
                        estoque.getId(),
                        "ABERTO"
                )
                .ifPresent(alerta -> {
                    alerta.setStatusAlerta("RESOLVIDO");
                    alertaRepository.save(alerta);
                });
    }

    private String montarMensagem(AlertaEstoquePeca alerta) {
        String nomePeca = alerta.getPeca() != null
                ? alerta.getPeca().getNome()
                : "Peça não identificada";

        String local = alerta.getEstoquePeca() != null
                && alerta.getEstoquePeca().getLocalEstoque() != null
                ? alerta.getEstoquePeca().getLocalEstoque().getNome()
                : "Local não informado";

        return "Alerta de estoque: peça " + nomePeca
                + " atingiu nível " + alerta.getNivelAlerta()
                + ". Saldo atual: " + alerta.getQuantidadeAtual()
                + ". Estoque mínimo: " + alerta.getEstoqueMinimo()
                + ". Local: " + local + ".";
    }
}