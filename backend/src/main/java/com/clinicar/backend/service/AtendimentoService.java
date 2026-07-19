package com.clinicar.backend.service;

import com.clinicar.backend.dto.AtendimentoCancelamentoRequest;
import com.clinicar.backend.dto.AtendimentoRequest;
import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class AtendimentoService {

    private static final Set<String> TIPOS_EXECUCAO_VALIDOS = Set.of(
            "INTERNO",
            "TERCEIRO",
            "MISTO"
    );

    private static final Set<String> STATUS_VALIDOS = Set.of(
            "ABERTO",
            "EM_DIAGNOSTICO",
            "AGUARDANDO_APROVACAO",
            "APROVADO",
            "EM_EXECUCAO",
            "AGUARDANDO_TERCEIRO",
            "CONCLUIDO",
            "ENTREGUE",
            "CANCELADO"
    );

    private static final Set<String> TIPOS_RESPONSAVEL_VALIDOS = Set.of(
            "COLABORADOR",
            "ADMINISTRADOR"
    );

    private final AtendimentoRepository atendimentoRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final UsuarioRepository usuarioRepository;
    private final FornecedorRepository fornecedorRepository;

    public AtendimentoService(
            AtendimentoRepository atendimentoRepository,
            AgendamentoRepository agendamentoRepository,
            UsuarioRepository usuarioRepository,
            FornecedorRepository fornecedorRepository
    ) {
        this.atendimentoRepository = atendimentoRepository;
        this.agendamentoRepository = agendamentoRepository;
        this.usuarioRepository = usuarioRepository;
        this.fornecedorRepository = fornecedorRepository;
    }

    @Transactional
    public Atendimento criar(AtendimentoRequest request) {
        validarRequest(request);

        Long idAgendamento = validarIdObrigatorio(
                request.getIdAgendamento(),
                "Agendamento"
        );

        if (atendimentoRepository.existsByAgendamento_Id(idAgendamento)) {
            throw new IllegalArgumentException("Já existe atendimento para este agendamento.");
        }

        Agendamento agendamento = agendamentoRepository
                .findById(idAgendamento)
                .orElseThrow(() -> new IllegalArgumentException("Agendamento não encontrado."));

        validarAgendamentoPodeGerarAtendimento(agendamento);

        Atendimento atendimento = new Atendimento();

        atendimento.setCodigoAtendimento(gerarCodigoAtendimento());

        atendimento.setAgendamento(agendamento);
        atendimento.setCliente(agendamento.getCliente());
        atendimento.setVeiculo(agendamento.getVeiculo());
        atendimento.setServico(agendamento.getServico());

        preencherDadosEditaveis(atendimento, request);

        if (atendimento.getDataEntrada() == null) {
            atendimento.setDataEntrada(LocalDateTime.now());
        }

        if ("AGENDADO".equals(agendamento.getStatusAgendamento())
                || "CONFIRMADO".equals(agendamento.getStatusAgendamento())) {
            agendamento.setStatusAgendamento("EM_ATENDIMENTO");
            agendamentoRepository.save(agendamento);
        }

        return atendimentoRepository.save(atendimento);
    }

    @Transactional
    public Atendimento atualizar(Long id, AtendimentoRequest request) {
        validarRequest(request);

        Atendimento atendimento = buscarPorId(id);

        validarPodeEditar(atendimento);

        preencherDadosEditaveis(atendimento, request);

        return atendimentoRepository.save(atendimento);
    }

    public List<Atendimento> listarTodos() {
        return atendimentoRepository.findAllByOrderByCriadoEmDesc();
    }

    public List<Atendimento> listarPorStatus(String status) {
        String statusNormalizado = normalizarValorObrigatorio(status, "Status");

        validarPertenceAoConjunto(
                statusNormalizado,
                STATUS_VALIDOS,
                "Status de atendimento inválido."
        );

        return atendimentoRepository.findByStatusAtendimentoOrderByCriadoEmDesc(statusNormalizado);
    }

    public List<Atendimento> listarPorTipoExecucao(String tipoExecucao) {
        String tipoNormalizado = normalizarValorObrigatorio(tipoExecucao, "Tipo de execução");

        validarPertenceAoConjunto(
                tipoNormalizado,
                TIPOS_EXECUCAO_VALIDOS,
                "Tipo de execução inválido."
        );

        return atendimentoRepository.findByTipoExecucaoOrderByCriadoEmDesc(tipoNormalizado);
    }

    public List<Atendimento> listarPorCliente(Long clienteId) {
        validarIdObrigatorio(clienteId, "Cliente");

        return atendimentoRepository.findByCliente_IdOrderByCriadoEmDesc(clienteId);
    }

    public List<Atendimento> listarPorVeiculo(Long veiculoId) {
        validarIdObrigatorio(veiculoId, "Veículo");

        return atendimentoRepository.findByVeiculo_IdOrderByCriadoEmDesc(veiculoId);
    }

    public List<Atendimento> listarPorResponsavel(Long responsavelId) {
        validarIdObrigatorio(responsavelId, "Responsável");

        return atendimentoRepository.findByResponsavel_IdOrderByCriadoEmDesc(responsavelId);
    }

    public List<Atendimento> listarPorFornecedor(Long fornecedorId) {
        validarIdObrigatorio(fornecedorId, "Fornecedor");

        return atendimentoRepository.findByFornecedor_IdOrderByCriadoEmDesc(fornecedorId);
    }

    public List<Atendimento> listarPorPeriodo(String inicio, String fim) {
        LocalDateTime dataInicio = parseDataHoraObrigatoria(inicio, "Data/hora inicial");
        LocalDateTime dataFim = parseDataHoraObrigatoria(fim, "Data/hora final");

        if (!dataFim.isAfter(dataInicio)) {
            throw new IllegalArgumentException("A data/hora final deve ser posterior à inicial.");
        }

        return atendimentoRepository.findByInicioRealBetweenOrderByInicioRealAsc(
                dataInicio,
                dataFim
        );
    }

    public Atendimento buscarPorId(Long id) {
        validarIdObrigatorio(id, "Atendimento");

        return atendimentoRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Atendimento não encontrado."));
    }

    public Atendimento buscarPorAgendamento(Long agendamentoId) {
        validarIdObrigatorio(agendamentoId, "Agendamento");

        return atendimentoRepository
                .findByAgendamento_Id(agendamentoId)
                .orElseThrow(() -> new IllegalArgumentException("Atendimento não encontrado para este agendamento."));
    }

    @Transactional
    public Atendimento iniciar(Long id) {
        Atendimento atendimento = buscarPorId(id);

        validarPodeAlterarStatus(atendimento);

        atendimento.setStatusAtendimento("EM_EXECUCAO");

        if (atendimento.getInicioReal() == null) {
            atendimento.setInicioReal(LocalDateTime.now());
        }

        if (atendimento.getDataEntrada() == null) {
            atendimento.setDataEntrada(LocalDateTime.now());
        }

        Agendamento agendamento = atendimento.getAgendamento();

        if (agendamento != null
                && !"CONCLUIDO".equals(agendamento.getStatusAgendamento())
                && !"CANCELADO".equals(agendamento.getStatusAgendamento())) {
            agendamento.setStatusAgendamento("EM_ATENDIMENTO");
            agendamentoRepository.save(agendamento);
        }

        return atendimentoRepository.save(atendimento);
    }

    @Transactional
    public Atendimento aprovar(Long id) {
        Atendimento atendimento = buscarPorId(id);

        validarPodeAlterarStatus(atendimento);

        atendimento.setAprovado(true);
        atendimento.setAprovadoEm(LocalDateTime.now());
        atendimento.setStatusAtendimento("APROVADO");

        return atendimentoRepository.save(atendimento);
    }

    @Transactional
    public Atendimento aguardarTerceiro(Long id) {
        Atendimento atendimento = buscarPorId(id);

        validarPodeAlterarStatus(atendimento);

        if (!"TERCEIRO".equals(atendimento.getTipoExecucao())
                && !"MISTO".equals(atendimento.getTipoExecucao())) {
            throw new IllegalArgumentException(
                    "Apenas atendimentos do tipo TERCEIRO ou MISTO podem aguardar fornecedor terceiro."
            );
        }

        if (atendimento.getFornecedor() == null) {
            throw new IllegalArgumentException(
                    "Informe um fornecedor para colocar o atendimento em aguardando terceiro."
            );
        }

        atendimento.setStatusAtendimento("AGUARDANDO_TERCEIRO");

        return atendimentoRepository.save(atendimento);
    }

    @Transactional
    public Atendimento concluir(Long id) {
        Atendimento atendimento = buscarPorId(id);

        if ("CANCELADO".equals(atendimento.getStatusAtendimento())) {
            throw new IllegalArgumentException("Não é possível concluir um atendimento cancelado.");
        }

        if ("ENTREGUE".equals(atendimento.getStatusAtendimento())) {
            throw new IllegalArgumentException("Não é possível concluir um atendimento já entregue.");
        }

        LocalDateTime agora = LocalDateTime.now();

        if (atendimento.getDataEntrada() != null && agora.isBefore(atendimento.getDataEntrada())) {
            throw new IllegalArgumentException(
                    "Não é possível concluir o atendimento antes da data de entrada."
            );
        }

        atendimento.setStatusAtendimento("CONCLUIDO");

        if (atendimento.getInicioReal() == null) {
            atendimento.setInicioReal(
                    atendimento.getDataEntrada() != null
                            ? atendimento.getDataEntrada()
                            : agora
            );
        }

        if (atendimento.getFimReal() == null) {
            atendimento.setFimReal(agora);
        }

        atendimento.setFinalizadoEm(agora);

        Agendamento agendamento = atendimento.getAgendamento();

        if (agendamento != null) {
            agendamento.setStatusAgendamento("CONCLUIDO");
            agendamentoRepository.save(agendamento);
        }

        return atendimentoRepository.save(atendimento);
    }

    @Transactional
    public Atendimento entregar(Long id) {
        Atendimento atendimento = buscarPorId(id);

        if (!"CONCLUIDO".equals(atendimento.getStatusAtendimento())) {
            throw new IllegalArgumentException("Somente atendimento concluído pode ser marcado como entregue.");
        }

        LocalDateTime agora = LocalDateTime.now();

        if (atendimento.getDataEntrada() != null && agora.isBefore(atendimento.getDataEntrada())) {
            throw new IllegalArgumentException(
                    "Não é possível entregar o veículo antes da data de entrada do atendimento."
            );
        }

        if (atendimento.getFimReal() != null && agora.isBefore(atendimento.getFimReal())) {
            throw new IllegalArgumentException(
                    "Não é possível entregar o veículo antes da data/hora de conclusão do serviço."
            );
        }

        atendimento.setStatusAtendimento("ENTREGUE");
        atendimento.setDataEntrega(agora);

        return atendimentoRepository.save(atendimento);
    }

    @Transactional
    public Atendimento cancelar(
            Long id,
            AtendimentoCancelamentoRequest request
    ) {
        Atendimento atendimento = buscarPorId(id);

        if ("CONCLUIDO".equals(atendimento.getStatusAtendimento())
                || "ENTREGUE".equals(atendimento.getStatusAtendimento())) {
            throw new IllegalArgumentException("Não é possível cancelar atendimento concluído ou entregue.");
        }

        atendimento.setStatusAtendimento("CANCELADO");
        atendimento.setCanceladoEm(LocalDateTime.now());

        if (request != null) {
            atendimento.setMotivoCancelamento(
                    limparTextoOpcional(request.getMotivoCancelamento())
            );
        }

        Agendamento agendamento = atendimento.getAgendamento();

        if (agendamento != null
                && !"CONCLUIDO".equals(agendamento.getStatusAgendamento())) {
            agendamento.setStatusAgendamento("CANCELADO");
            agendamento.setCanceladoEm(LocalDateTime.now());

            if (request != null) {
                agendamento.setMotivoCancelamento(
                        limparTextoOpcional(request.getMotivoCancelamento())
                );
            }

            agendamentoRepository.save(agendamento);
        }

        return atendimentoRepository.save(atendimento);
    }

    private void preencherDadosEditaveis(
            Atendimento atendimento,
            AtendimentoRequest request
    ) {
        String tipoExecucao = normalizarValorComDefault(
                request.getTipoExecucao(),
                atendimento.getTipoExecucao() == null
                        ? "INTERNO"
                        : atendimento.getTipoExecucao()
        );

        validarPertenceAoConjunto(
                tipoExecucao,
                TIPOS_EXECUCAO_VALIDOS,
                "Tipo de execução inválido."
        );

        String status = normalizarValorComDefault(
                request.getStatusAtendimento(),
                atendimento.getStatusAtendimento() == null
                        ? "ABERTO"
                        : atendimento.getStatusAtendimento()
        );

        validarPertenceAoConjunto(
                status,
                STATUS_VALIDOS,
                "Status de atendimento inválido."
        );

        Fornecedor fornecedor = resolverFornecedor(request, atendimento, tipoExecucao);
        Usuario responsavel = resolverResponsavel(request);

        LocalDateTime dataEntrada = parseDataHoraOpcional(request.getDataEntrada());
        LocalDateTime inicioReal = parseDataHoraOpcional(request.getInicioReal());
        LocalDateTime fimReal = parseDataHoraOpcional(request.getFimReal());
        LocalDateTime prazoEstimadoEntrega = parseDataHoraOpcional(request.getPrazoEstimadoEntrega());
        LocalDateTime dataEntrega = parseDataHoraOpcional(request.getDataEntrega());
        LocalDateTime dataRetornoSugerida = parseDataHoraOpcional(request.getDataRetornoSugerida());

        validarDatas(dataEntrada, inicioReal, fimReal, dataEntrega);

        validarQuilometragem(request.getQuilometragemEntrada(), "Quilometragem de entrada");
        validarQuilometragem(request.getQuilometragemSaida(), "Quilometragem de saída");

        Integer garantiaDias = request.getGarantiaDias() == null
                ? 0
                : request.getGarantiaDias();

        if (garantiaDias < 0) {
            throw new IllegalArgumentException("A garantia em dias não pode ser negativa.");
        }

        BigDecimal valorMaoObra = parseMoedaComDefault(request.getValorMaoObra(), atendimento.getValorMaoObra());
        BigDecimal valorPecas = parseMoedaComDefault(request.getValorPecas(), atendimento.getValorPecas());
        BigDecimal valorTerceiros = parseMoedaComDefault(request.getValorTerceiros(), atendimento.getValorTerceiros());
        BigDecimal desconto = parseMoedaComDefault(request.getDesconto(), atendimento.getDesconto());

        atendimento.setFornecedor(fornecedor);
        atendimento.setResponsavel(responsavel);

        atendimento.setTipoExecucao(tipoExecucao);
        atendimento.setStatusAtendimento(status);

        atendimento.setDataEntrada(dataEntrada);
        atendimento.setInicioReal(inicioReal);
        atendimento.setFimReal(fimReal);
        atendimento.setPrazoEstimadoEntrega(prazoEstimadoEntrega);
        atendimento.setDataEntrega(dataEntrega);

        atendimento.setQuilometragemEntrada(request.getQuilometragemEntrada());
        atendimento.setQuilometragemSaida(request.getQuilometragemSaida());

        atendimento.setRelatoCliente(limparTextoOpcional(request.getRelatoCliente()));
        atendimento.setDiagnosticoTecnico(limparTextoOpcional(request.getDiagnosticoTecnico()));
        atendimento.setServicoExecutado(limparTextoOpcional(request.getServicoExecutado()));
        atendimento.setObservacoesInternas(limparTextoOpcional(request.getObservacoesInternas()));
        atendimento.setRecomendacoesCliente(limparTextoOpcional(request.getRecomendacoesCliente()));

        atendimento.setNecessitaRetorno(
                request.getNecessitaRetorno() == null
                        ? false
                        : request.getNecessitaRetorno()
        );

        atendimento.setDataRetornoSugerida(dataRetornoSugerida);
        atendimento.setGarantiaDias(garantiaDias);

        atendimento.setValorMaoObra(valorMaoObra);
        atendimento.setValorPecas(valorPecas);
        atendimento.setValorTerceiros(valorTerceiros);
        atendimento.setDesconto(desconto);

        aplicarAprovacao(atendimento, request);

        validarRegraTerceiro(atendimento);
    }

    private Fornecedor resolverFornecedor(
            AtendimentoRequest request,
            Atendimento atendimento,
            String tipoExecucao
    ) {
        if (request.getIdFornecedor() != null) {
            return fornecedorRepository
                    .findById(request.getIdFornecedor())
                    .orElseThrow(() -> new IllegalArgumentException("Fornecedor não encontrado."));
        }

        if (atendimento.getFornecedor() != null) {
            return atendimento.getFornecedor();
        }

        Agendamento agendamento = atendimento.getAgendamento();

        if (agendamento != null && agendamento.getFornecedor() != null) {
            return agendamento.getFornecedor();
        }

        Servico servico = atendimento.getServico();

        if (servico != null && servico.getFornecedor() != null) {
            return servico.getFornecedor();
        }

        if ("TERCEIRO".equals(tipoExecucao)) {
            throw new IllegalArgumentException("Fornecedor é obrigatório para atendimento terceirizado.");
        }

        return null;
    }

    private Usuario resolverResponsavel(AtendimentoRequest request) {
        if (request.getIdResponsavel() == null) {
            return null;
        }

        Usuario responsavel = usuarioRepository
                .findById(request.getIdResponsavel())
                .orElseThrow(() -> new IllegalArgumentException("Responsável não encontrado."));

        validarUsuarioComoResponsavel(responsavel);

        return responsavel;
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

    private void validarAgendamentoPodeGerarAtendimento(Agendamento agendamento) {
        String status = agendamento.getStatusAgendamento();

        if ("CANCELADO".equals(status)) {
            throw new IllegalArgumentException("Agendamento cancelado não pode gerar atendimento.");
        }

        if ("NAO_COMPARECEU".equals(status)) {
            throw new IllegalArgumentException("Agendamento marcado como não compareceu não pode gerar atendimento.");
        }

        if ("CONCLUIDO".equals(status)) {
            throw new IllegalArgumentException("Agendamento concluído não pode gerar novo atendimento.");
        }
    }

    private void validarPodeEditar(Atendimento atendimento) {
        if ("CANCELADO".equals(atendimento.getStatusAtendimento())) {
            throw new IllegalArgumentException("Não é possível editar atendimento cancelado.");
        }

        if ("ENTREGUE".equals(atendimento.getStatusAtendimento())) {
            throw new IllegalArgumentException("Não é possível editar atendimento entregue.");
        }
    }

    private void validarPodeAlterarStatus(Atendimento atendimento) {
        if ("CANCELADO".equals(atendimento.getStatusAtendimento())) {
            throw new IllegalArgumentException("Atendimento cancelado não pode ter status alterado.");
        }

        if ("ENTREGUE".equals(atendimento.getStatusAtendimento())) {
            throw new IllegalArgumentException("Atendimento entregue não pode ter status alterado.");
        }
    }

    private void validarRegraTerceiro(Atendimento atendimento) {
        if ("TERCEIRO".equals(atendimento.getTipoExecucao())
                && atendimento.getFornecedor() == null) {
            throw new IllegalArgumentException("Fornecedor é obrigatório para atendimento terceirizado.");
        }

        if ("INTERNO".equals(atendimento.getTipoExecucao())
                && "AGUARDANDO_TERCEIRO".equals(atendimento.getStatusAtendimento())) {
            throw new IllegalArgumentException(
                    "Atendimento interno não pode ficar com status AGUARDANDO_TERCEIRO."
            );
        }
    }

    private void validarDatas(
            LocalDateTime dataEntrada,
            LocalDateTime inicioReal,
            LocalDateTime fimReal,
            LocalDateTime dataEntrega
    ) {
        if (inicioReal != null && fimReal != null && fimReal.isBefore(inicioReal)) {
            throw new IllegalArgumentException("A data/hora final não pode ser anterior ao início real.");
        }

        if (dataEntrada != null && dataEntrega != null && dataEntrega.isBefore(dataEntrada)) {
            throw new IllegalArgumentException("A data de entrega não pode ser anterior à data de entrada.");
        }
    }

    private void validarQuilometragem(Integer valor, String campo) {
        if (valor != null && valor < 0) {
            throw new IllegalArgumentException(campo + " não pode ser negativa.");
        }
    }

    private void aplicarAprovacao(
            Atendimento atendimento,
            AtendimentoRequest request
    ) {
        if (request.getAprovado() == null) {
            return;
        }

        atendimento.setAprovado(request.getAprovado());

        if (request.getAprovado() && atendimento.getAprovadoEm() == null) {
            atendimento.setAprovadoEm(LocalDateTime.now());
        }

        if (!request.getAprovado()) {
            atendimento.setAprovadoEm(null);
        }
    }

    private BigDecimal parseMoedaComDefault(
            String valor,
            BigDecimal valorAtual
    ) {
        if (valor == null || valor.trim().isBlank()) {
            return valorAtual == null
                    ? BigDecimal.ZERO
                    : valorAtual;
        }

        return parseMoeda(valor);
    }

    private BigDecimal parseMoeda(String valor) {
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
            throw new IllegalArgumentException("Valor monetário inválido.");
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

    private String gerarCodigoAtendimento() {
        String data = LocalDateTime.now().format(
                DateTimeFormatter.ofPattern("yyyyMMdd")
        );

        String sufixo = UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 8)
                .toUpperCase();

        return "ATD-" + data + "-" + sufixo;
    }

    private void validarRequest(AtendimentoRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dados do atendimento não informados.");
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
}