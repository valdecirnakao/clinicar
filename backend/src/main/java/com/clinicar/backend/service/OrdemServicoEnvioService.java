package com.clinicar.backend.service;

import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.AtendimentoRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class OrdemServicoEnvioService {

    private final OrdemServicoPdfService ordemServicoPdfService;
    private final EmailAnexoService emailAnexoService;
    private final AtendimentoRepository atendimentoRepository;

    public OrdemServicoEnvioService(
            OrdemServicoPdfService ordemServicoPdfService,
            EmailAnexoService emailAnexoService,
            AtendimentoRepository atendimentoRepository
    ) {
        this.ordemServicoPdfService = ordemServicoPdfService;
        this.emailAnexoService = emailAnexoService;
        this.atendimentoRepository = atendimentoRepository;
    }

    @Transactional
    public Atendimento enviarOrdemServicoPorEmail(Atendimento atendimento) {
        if (atendimento == null || atendimento.getId() == null) {
            throw new IllegalArgumentException("Atendimento inválido para envio da Ordem de Serviço.");
        }

        try {
            Usuario cliente = atendimento.getCliente();

            if (cliente == null) {
                throw new IllegalArgumentException("Cliente não vinculado ao atendimento.");
            }

            String emailCliente = cliente.getEmail();

            if (emailCliente == null || emailCliente.isBlank()) {
                throw new IllegalArgumentException("Cliente não possui e-mail cadastrado.");
            }

            byte[] pdf = ordemServicoPdfService.gerarPdf(atendimento);
            String nomeArquivo = ordemServicoPdfService.gerarNomeArquivo(atendimento);

            String assunto = "CliniCar - Ordem de Serviço " + atendimento.getCodigoAtendimento();

            String corpo = montarCorpoEmail(atendimento, cliente);

            emailAnexoService.enviarEmailComAnexo(
                    emailCliente,
                    assunto,
                    corpo,
                    nomeArquivo,
                    pdf
            );

            atendimento.setOsPdfGeradaEm(LocalDateTime.now());
            atendimento.setOsEnviadaEmail(true);
            atendimento.setOsEnviadaEmailEm(LocalDateTime.now());
            atendimento.setOsEmailDestino(emailCliente);
            atendimento.setOsUltimoErro(null);

        } catch (Exception e) {
            atendimento.setOsPdfGeradaEm(LocalDateTime.now());
            atendimento.setOsEnviadaEmail(false);
            atendimento.setOsEnviadaEmailEm(null);
            atendimento.setOsUltimoErro(resumirErro(e));
        }

        return atendimentoRepository.save(atendimento);
    }

    private String montarCorpoEmail(
            Atendimento atendimento,
            Usuario cliente
    ) {
        String nomeCliente = cliente.getNome() == null || cliente.getNome().isBlank()
                ? "Cliente"
                : cliente.getNome();

        return """
                Olá, %s.

                O atendimento do seu veículo foi finalizado no sistema CliniCar.

                Segue em anexo a Ordem de Serviço executada, contendo os dados do atendimento, diagnóstico, serviço realizado e valores registrados.

                Código do atendimento: %s

                Atenciosamente,
                CliniCar
                """.formatted(
                nomeCliente,
                atendimento.getCodigoAtendimento()
        );
    }

    private String resumirErro(Exception e) {
        String mensagem = e.getMessage();

        if (mensagem == null || mensagem.isBlank()) {
            mensagem = e.getClass().getSimpleName();
        }

        if (mensagem.length() > 1000) {
            return mensagem.substring(0, 1000);
        }

        return mensagem;
    }
}