package com.clinicar.backend.service;

import com.clinicar.backend.dto.AgendamentoCancelamentoRequest;
import com.clinicar.backend.dto.AgendamentoRequest;
import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class AgendamentoService {

    private static final Set<String> STATUS_VALIDOS = Set.of(
            "AGENDADO",
            "CONFIRMADO",
            "EM_ATENDIMENTO",
            "CONCLUIDO",
            "CANCELADO",
            "NAO_COMPARECEU",
            "REAGENDADO"
    );

    private static final Set<String> CANAIS_VALIDOS = Set.of(
            "SISTEMA",
            "TELEFONE",
            "WHATSAPP",
            "PRESENCIAL",
            "SITE"
    );

    private static final Set<String> PRIORIDADES_VALIDAS = Set.of(
            "BAIXA",
            "NORMAL",
            "ALTA",
            "URGENTE"
    );

    private static final Set<String> TIPOS_ATENDIMENTO_VALIDOS = Set.of(
            "PRESENCIAL",
            "RETIRADA_ENTREGA",
            "GUINCHO"
    );

    /*
     * Como no CliniCar o cliente também é um Usuario,
     * validamos o papel pelo campo tipo_do_acesso.
     *
     * Se quiser restringir cliente apenas a CLIENTE,
     * remova ADMINISTRADOR deste conjunto.
     */
    private static final Set<String> TIPOS_CLIENTE_VALIDOS = Set.of(
            "CLIENTE",
            "ADMINISTRADOR"
    );

    /*
     * O mecânico no seu projeto está cadastrado como COLABORADOR.
     * Por isso, o responsável pelo atendimento pode ser:
     * - COLABORADOR
     * - ADMINISTRADOR
     */
    private static final Set<String> TIPOS_RESPONSAVEL_VALIDOS = Set.of(
            "COLABORADOR",
            "ADMINISTRADOR"
    );

    private final AgendamentoRepository agendamentoRepository;
    private final UsuarioRepository usuarioRepository;
    private final VeiculoRepository veiculoRepository;
    private final ServicoRepository servicoRepository;
    private final FornecedorRepository fornecedorRepository;

    public AgendamentoService(
            AgendamentoRepository agendamentoRepository,
            UsuarioRepository usuarioRepository,
            VeiculoRepository veiculoRepository,
            ServicoRepository servicoRepository,
            FornecedorRepository fornecedorRepository
    ) {
        this.agendamentoRepository = agendamentoRepository;
        this.usuarioRepository = usuarioRepository;
        this.veiculoRepository = veiculoRepository;
        this.servicoRepository = servicoRepository;
        this.fornecedorRepository = fornecedorRepository;
    }

    @Transactional
    public Agendamento criar(AgendamentoRequest request) {
        validarRequest(request);

        Agendamento agendamento = new Agendamento();

        agendamento.setCodigoAgendamento(gerarCodigoAgendamento());

        preencherDados(agendamento, request, null);

        return agendamentoRepository.save(agendamento);
    }

    @Transactional
    public Agendamento atualizar(Long id, AgendamentoRequest request) {
        validarRequest(request);

        Agendamento agendamento = buscarPorId(id);

        if ("CANCELADO".equals(agendamento.getStatusAgendamento())) {
            throw new IllegalArgumentException("Não é possível alterar um agendamento cancelado.");
        }

        if ("CONCLUIDO".equals(agendamento.getStatusAgendamento())) {
            throw new IllegalArgumentException("Não é possível alterar um agendamento concluído.");
        }

        preencherDados(agendamento, request, id);

        return agendamentoRepository.save(agendamento);
    }

    public List<Agendamento> listarTodos() {
        return agendamentoRepository.findAllByOrderByDataHoraInicioDesc();
    }

    public List<Agendamento> listarPorStatus(String status) {
        String statusNormalizado = normalizarValorObrigatorio(status, "Status");

        validarPertenceAoConjunto(
                statusNormalizado,
                STATUS_VALIDOS,
                "Status de agendamento inválido."
        );

        return agendamentoRepository.findByStatusAgendamentoOrderByDataHoraInicioAsc(
                statusNormalizado
        );
    }

    public List<Agendamento> listarPorCliente(Long clienteId) {
        if (clienteId == null) {
            throw new IllegalArgumentException("ID do cliente não informado.");
        }

        return agendamentoRepository.findByCliente_IdOrderByDataHoraInicioDesc(clienteId);
    }

    public List<Agendamento> listarPorVeiculo(Long veiculoId) {
        if (veiculoId == null) {
            throw new IllegalArgumentException("ID do veículo não informado.");
        }

        return agendamentoRepository.findByVeiculo_IdOrderByDataHoraInicioDesc(veiculoId);
    }

    public List<Agendamento> listarPorPeriodo(String inicio, String fim) {
        LocalDateTime dataInicio = parseDataHoraObrigatoria(inicio, "Data/hora inicial");
        LocalDateTime dataFim = parseDataHoraObrigatoria(fim, "Data/hora final");

        if (!dataFim.isAfter(dataInicio)) {
            throw new IllegalArgumentException("A data/hora final deve ser posterior à inicial.");
        }

        return agendamentoRepository.findByDataHoraInicioBetweenOrderByDataHoraInicioAsc(
                dataInicio,
                dataFim
        );
    }

    public Agendamento buscarPorId(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID do agendamento não informado.");
        }

        return agendamentoRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Agendamento não encontrado."));
    }

    @Transactional
    public Agendamento confirmar(Long id) {
        Agendamento agendamento = buscarPorId(id);

        validarPodeAlterarStatus(agendamento);

        agendamento.setStatusAgendamento("CONFIRMADO");
        agendamento.setConfirmado(true);
        agendamento.setConfirmadoEm(LocalDateTime.now());

        return agendamentoRepository.save(agendamento);
    }

    @Transactional
    public Agendamento iniciarAtendimento(Long id) {
        Agendamento agendamento = buscarPorId(id);

        validarPodeAlterarStatus(agendamento);

        agendamento.setStatusAgendamento("EM_ATENDIMENTO");

        return agendamentoRepository.save(agendamento);
    }

    @Transactional
    public Agendamento concluir(Long id) {
        Agendamento agendamento = buscarPorId(id);

        if ("CANCELADO".equals(agendamento.getStatusAgendamento())) {
            throw new IllegalArgumentException("Não é possível concluir um agendamento cancelado.");
        }

        agendamento.setStatusAgendamento("CONCLUIDO");

        return agendamentoRepository.save(agendamento);
    }

    @Transactional
    public Agendamento cancelar(
            Long id,
            AgendamentoCancelamentoRequest request
    ) {
        Agendamento agendamento = buscarPorId(id);

        if ("CONCLUIDO".equals(agendamento.getStatusAgendamento())) {
            throw new IllegalArgumentException("Não é possível cancelar um agendamento concluído.");
        }

        agendamento.setStatusAgendamento("CANCELADO");
        agendamento.setCanceladoEm(LocalDateTime.now());
        agendamento.setConfirmado(false);

        if (request != null) {
            agendamento.setMotivoCancelamento(
                    limparTextoOpcional(request.getMotivoCancelamento())
            );
        }

        return agendamentoRepository.save(agendamento);
    }

    @Transactional
    public Agendamento marcarNaoCompareceu(Long id) {
        Agendamento agendamento = buscarPorId(id);

        if ("CONCLUIDO".equals(agendamento.getStatusAgendamento())) {
            throw new IllegalArgumentException("Agendamento concluído não pode ser marcado como não compareceu.");
        }

        if ("CANCELADO".equals(agendamento.getStatusAgendamento())) {
            throw new IllegalArgumentException("Agendamento cancelado não pode ser marcado como não compareceu.");
        }

        agendamento.setStatusAgendamento("NAO_COMPARECEU");

        return agendamentoRepository.save(agendamento);
    }

    private void preencherDados(
            Agendamento agendamento,
            AgendamentoRequest request,
            Long ignorarIdNaValidacao
    ) {
        Long idCliente = validarIdObrigatorio(request.getIdCliente(), "Cliente");
        Long idVeiculo = validarIdObrigatorio(request.getIdVeiculo(), "Veículo");
        Long idServico = validarIdObrigatorio(request.getIdServico(), "Serviço");

        Usuario cliente = usuarioRepository
                .findById(idCliente)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado."));

        validarUsuarioComoCliente(cliente);

        Veiculo veiculo = veiculoRepository
                .findById(idVeiculo)
                .orElseThrow(() -> new IllegalArgumentException("Veículo não encontrado."));

        Servico servico = servicoRepository
                .findById(idServico)
                .orElseThrow(() -> new IllegalArgumentException("Serviço não encontrado."));

        Fornecedor fornecedor = null;

        if (request.getIdFornecedor() != null) {
            fornecedor = fornecedorRepository
                    .findById(request.getIdFornecedor())
                    .orElseThrow(() -> new IllegalArgumentException("Fornecedor não encontrado."));
        } else if (servico.getFornecedor() != null) {
            fornecedor = servico.getFornecedor();
        }

        Usuario responsavel = null;

        if (request.getIdResponsavel() != null) {
            responsavel = usuarioRepository
                    .findById(request.getIdResponsavel())
                    .orElseThrow(() -> new IllegalArgumentException("Responsável não encontrado."));

            validarUsuarioComoResponsavel(responsavel);
        }

        LocalDateTime inicio = parseDataHoraObrigatoria(
                request.getDataHoraInicio(),
                "Data/hora de início"
        );

        LocalDateTime fim = parseDataHoraOpcional(request.getDataHoraFim());

        if (fim == null) {
            fim = inicio.plusMinutes(calcularDuracaoServicoEmMinutos(servico));
        }

        if (!fim.isAfter(inicio)) {
            throw new IllegalArgumentException("A data/hora final deve ser posterior à data/hora inicial.");
        }

        int duracaoMinutos = Math.toIntExact(Duration.between(inicio, fim).toMinutes());

        if (duracaoMinutos <= 0) {
            throw new IllegalArgumentException("A duração do agendamento deve ser maior que zero.");
        }

        validarSobreposicaoVeiculo(
                veiculo.getId(),
                inicio,
                fim,
                ignorarIdNaValidacao
        );

        if (responsavel != null) {
            validarSobreposicaoResponsavel(
                    responsavel.getId(),
                    inicio,
                    fim,
                    ignorarIdNaValidacao
            );
        }

        String status = normalizarValorComDefault(
                request.getStatusAgendamento(),
                agendamento.getStatusAgendamento() == null
                        ? "AGENDADO"
                        : agendamento.getStatusAgendamento()
        );

        validarPertenceAoConjunto(
                status,
                STATUS_VALIDOS,
                "Status de agendamento inválido."
        );

        String canal = normalizarValorComDefault(
                request.getCanalOrigem(),
                "SISTEMA"
        );

        validarPertenceAoConjunto(
                canal,
                CANAIS_VALIDOS,
                "Canal de origem inválido."
        );

        String prioridade = normalizarValorComDefault(
                request.getPrioridade(),
                "NORMAL"
        );

        validarPertenceAoConjunto(
                prioridade,
                PRIORIDADES_VALIDAS,
                "Prioridade inválida."
        );

        String tipoAtendimento = normalizarValorComDefault(
                request.getTipoAtendimento(),
                "PRESENCIAL"
        );

        validarPertenceAoConjunto(
                tipoAtendimento,
                TIPOS_ATENDIMENTO_VALIDOS,
                "Tipo de atendimento inválido."
        );

        Integer quilometragem = request.getQuilometragemAtual();

        if (quilometragem != null && quilometragem < 0) {
            throw new IllegalArgumentException("A quilometragem não pode ser negativa.");
        }

        BigDecimal valorEstimado = parseMoedaOpcional(request.getValorEstimado(), "Valor estimado");
        BigDecimal valorFinal = parseMoedaOpcional(request.getValorFinal(), "Valor final");

        agendamento.setCliente(cliente);
        agendamento.setVeiculo(veiculo);
        agendamento.setServico(servico);
        agendamento.setFornecedor(fornecedor);
        agendamento.setResponsavel(responsavel);

        agendamento.setDataHoraInicio(inicio);
        agendamento.setDataHoraFim(fim);
        agendamento.setDuracaoEstimadaMinutos(duracaoMinutos);

        agendamento.setStatusAgendamento(status);
        agendamento.setCanalOrigem(canal);
        agendamento.setPrioridade(prioridade);
        agendamento.setTipoAtendimento(tipoAtendimento);

        agendamento.setQuilometragemAtual(quilometragem);

        agendamento.setQueixaCliente(limparTextoOpcional(request.getQueixaCliente()));
        agendamento.setDiagnosticoPrevio(limparTextoOpcional(request.getDiagnosticoPrevio()));
        agendamento.setObservacoes(limparTextoOpcional(request.getObservacoes()));

        agendamento.setValorEstimado(valorEstimado);
        agendamento.setValorFinal(valorFinal);

        agendamento.setRequerConfirmacao(
                request.getRequerConfirmacao() == null
                        ? true
                        : request.getRequerConfirmacao()
        );

        aplicarConfirmacao(agendamento, request);
    }

    private void aplicarConfirmacao(
            Agendamento agendamento,
            AgendamentoRequest request
    ) {
        if ("CONFIRMADO".equals(agendamento.getStatusAgendamento())) {
            agendamento.setConfirmado(true);

            if (agendamento.getConfirmadoEm() == null) {
                agendamento.setConfirmadoEm(LocalDateTime.now());
            }

            return;
        }

        if (request.getConfirmado() != null) {
            agendamento.setConfirmado(request.getConfirmado());

            if (request.getConfirmado() && agendamento.getConfirmadoEm() == null) {
                agendamento.setConfirmadoEm(LocalDateTime.now());
            }

            if (!request.getConfirmado()) {
                agendamento.setConfirmadoEm(null);
            }
        }
    }

    private void validarUsuarioComoCliente(Usuario usuario) {
        String tipo = normalizarTipoAcessoUsuario(usuario);

        if (!TIPOS_CLIENTE_VALIDOS.contains(tipo)) {
            throw new IllegalArgumentException(
                    "O usuário selecionado como cliente precisa possuir perfil CLIENTE."
            );
        }
    }

    private void validarUsuarioComoResponsavel(Usuario usuario) {
        String tipo = normalizarTipoAcessoUsuario(usuario);

        if (!TIPOS_RESPONSAVEL_VALIDOS.contains(tipo)) {
            throw new IllegalArgumentException(
                    "O responsável pelo atendimento precisa possuir perfil COLABORADOR ou ADMINISTRADOR."
            );
        }
    }

    private String normalizarTipoAcessoUsuario(Usuario usuario) {
        if (usuario == null || usuario.getTipo_do_acesso() == null) {
            throw new IllegalArgumentException("Tipo de acesso do usuário não informado.");
        }

        String semAcento = Normalizer
                .normalize(usuario.getTipo_do_acesso(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        return semAcento
                .trim()
                .toUpperCase(Locale.ROOT)
                .replace("-", "_")
                .replace(" ", "_");
    }

    private void validarSobreposicaoVeiculo(
            Long veiculoId,
            LocalDateTime inicio,
            LocalDateTime fim,
            Long ignorarId
    ) {
        long conflitos = agendamentoRepository.contarSobreposicaoVeiculo(
                veiculoId,
                inicio,
                fim,
                ignorarId
        );

        if (conflitos > 0) {
            throw new IllegalArgumentException(
                    "Já existe agendamento para este veículo no período informado."
            );
        }
    }

    private void validarSobreposicaoResponsavel(
            Long responsavelId,
            LocalDateTime inicio,
            LocalDateTime fim,
            Long ignorarId
    ) {
        long conflitos = agendamentoRepository.contarSobreposicaoResponsavel(
                responsavelId,
                inicio,
                fim,
                ignorarId
        );

        if (conflitos > 0) {
            throw new IllegalArgumentException(
                    "Já existe agendamento para este responsável no período informado."
            );
        }
    }

    private void validarPodeAlterarStatus(Agendamento agendamento) {
        if ("CANCELADO".equals(agendamento.getStatusAgendamento())) {
            throw new IllegalArgumentException("Agendamento cancelado não pode ter o status alterado.");
        }

        if ("CONCLUIDO".equals(agendamento.getStatusAgendamento())) {
            throw new IllegalArgumentException("Agendamento concluído não pode ter o status alterado.");
        }

        if ("NAO_COMPARECEU".equals(agendamento.getStatusAgendamento())) {
            throw new IllegalArgumentException("Agendamento marcado como não compareceu não pode ter o status alterado.");
        }
    }

    private int calcularDuracaoServicoEmMinutos(Servico servico) {
        if (servico.getDuracaoEstimada() == null) {
            return 60;
        }

        BigDecimal duracao = servico.getDuracaoEstimada();

        String unidade = servico.getUnidadeDuracao() == null
                ? "MINUTO"
                : servico.getUnidadeDuracao().trim().toUpperCase();

        BigDecimal minutos;

        if ("HORA".equals(unidade)) {
            minutos = duracao.multiply(BigDecimal.valueOf(60));
        } else if ("DIA".equals(unidade)) {
            minutos = duracao.multiply(BigDecimal.valueOf(1440));
        } else {
            minutos = duracao;
        }

        int resultado = minutos.setScale(0, RoundingMode.HALF_UP).intValue();

        return Math.max(resultado, 1);
    }

    private String gerarCodigoAgendamento() {
        String data = LocalDateTime.now().format(
                DateTimeFormatter.ofPattern("yyyyMMdd")
        );

        String sufixo = UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 8)
                .toUpperCase();

        return "AGD-" + data + "-" + sufixo;
    }

    private void validarRequest(AgendamentoRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dados do agendamento não informados.");
        }
    }

    private Long validarIdObrigatorio(Long id, String campo) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException(campo + " é obrigatório.");
        }

        return id;
    }

    private String normalizarValorObrigatorio(String valor, String campo) {
        if (valor == null || valor.trim().isBlank()) {
            throw new IllegalArgumentException(campo + " é obrigatório.");
        }

        return valor.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizarValorComDefault(String valor, String padrao) {
        if (valor == null || valor.trim().isBlank()) {
            return padrao;
        }

        return valor.trim().toUpperCase(Locale.ROOT);
    }

    private void validarPertenceAoConjunto(
            String valor,
            Set<String> permitidos,
            String mensagemErro
    ) {
        if (!permitidos.contains(valor)) {
            throw new IllegalArgumentException(mensagemErro);
        }
    }

    private String limparTextoOpcional(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        return valor.trim();
    }

    private BigDecimal parseMoedaOpcional(String valor, String campo) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        try {
            String texto = valor
                    .trim()
                    .replace("R$", "")
                    .replaceAll("\\s", "");

            if (texto.matches("^\\d+\\.\\d{1,2}$")) {
                return new BigDecimal(texto).setScale(2, RoundingMode.HALF_UP);
            }

            if (texto.contains(",")) {
                texto = texto
                        .replace(".", "")
                        .replace(",", ".");

                return new BigDecimal(texto).setScale(2, RoundingMode.HALF_UP);
            }

            return new BigDecimal(texto).setScale(2, RoundingMode.HALF_UP);

        } catch (Exception e) {
            throw new IllegalArgumentException(campo + " inválido.");
        }
    }

    private LocalDateTime parseDataHoraObrigatoria(String valor, String campo) {
        if (valor == null || valor.trim().isBlank()) {
            throw new IllegalArgumentException(campo + " é obrigatória.");
        }

        return parseDataHora(valor, campo);
    }

    private LocalDateTime parseDataHoraOpcional(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        return parseDataHora(valor, "Data/hora");
    }

    private LocalDateTime parseDataHora(String valor, String campo) {
        String texto = valor.trim();

        try {
            return LocalDateTime.parse(texto);
        } catch (DateTimeParseException ignored) {
        }

        DateTimeFormatter[] formatos = new DateTimeFormatter[] {
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
        };

        for (DateTimeFormatter formato : formatos) {
            try {
                return LocalDateTime.parse(texto, formato);
            } catch (DateTimeParseException ignored) {
            }
        }

        throw new IllegalArgumentException(campo + " inválida.");
    }
}