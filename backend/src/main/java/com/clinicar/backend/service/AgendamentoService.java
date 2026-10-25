package com.clinicar.backend.service;

import com.clinicar.backend.dto.AgendamentoCancelamentoRequest;
import com.clinicar.backend.dto.AgendamentoRequest;
import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
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
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class AgendamentoService {
    private final AvisosServicoWhatsappService avisosWhatsapp;
    private final NotificacaoOutboxService notificacoes;

    private static final Set<String> STATUS_VALIDOS = Set.of(
            "AGENDADO",
            "CONFIRMADO",
            "EM_ATENDIMENTO",
            "CONCLUIDO",
            "CANCELADO",
            "NAO_COMPARECEU",
            "REAGENDADO");

    private static final Set<String> CANAIS_VALIDOS = Set.of(
            "SISTEMA",
            "TELEFONE",
            "WHATSAPP",
            "PRESENCIAL",
            "SITE");

    private static final Set<String> PRIORIDADES_VALIDAS = Set.of(
            "BAIXA",
            "NORMAL",
            "ALTA",
            "URGENTE");

    private static final Set<String> TIPOS_ATENDIMENTO_VALIDOS = Set.of(
            "PRESENCIAL",
            "RETIRADA_ENTREGA",
            "GUINCHO");

    private static final Set<String> TIPOS_CLIENTE_VALIDOS = Set.of(
            "CLIENTE",
            "ADMINISTRADOR");

    private static final Set<String> TIPOS_RESPONSAVEL_VALIDOS = Set.of(
            "COLABORADOR",
            "ADMINISTRADOR");

    private final AtendimentoService atendimentoService;
    private final AgendamentoRepository agendamentoRepository;
    private final UsuarioRepository usuarioRepository;
    private final VeiculoRepository veiculoRepository;
    private final ServicoRepository servicoRepository;
    private final FornecedorRepository fornecedorRepository;
    private final AgendamentoPecaPrevistaService agendamentoPecaPrevistaService;
    private final ReservaEstoqueAgendamentoService reservaEstoqueAgendamentoService;

    public AgendamentoService(
            AtendimentoService atendimentoService,
            AgendamentoPecaPrevistaService agendamentoPecaPrevistaService,
            ReservaEstoqueAgendamentoService reservaEstoqueAgendamentoService,
            AgendamentoRepository agendamentoRepository,
            UsuarioRepository usuarioRepository,
            VeiculoRepository veiculoRepository,
            ServicoRepository servicoRepository,
            FornecedorRepository fornecedorRepository,
            AvisosServicoWhatsappService avisosWhatsapp,
            NotificacaoOutboxService notificacoes) {
        this.atendimentoService = atendimentoService;
        this.agendamentoPecaPrevistaService = agendamentoPecaPrevistaService;
        this.reservaEstoqueAgendamentoService = reservaEstoqueAgendamentoService;
        this.agendamentoRepository = agendamentoRepository;
        this.usuarioRepository = usuarioRepository;
        this.veiculoRepository = veiculoRepository;
        this.servicoRepository = servicoRepository;
        this.fornecedorRepository = fornecedorRepository;
        this.avisosWhatsapp = avisosWhatsapp;
        this.notificacoes = notificacoes;
    }

    public record ResultadoInicioAgendamento(
            Agendamento agendamento,
            Atendimento atendimento,
            boolean atendimentoCriado) {
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Agendamento criar(AgendamentoRequest request) {
        validarRequest(request);
        validarPecasDescritas(request);

        log.info(
                "[AGENDAMENTO-SERVICE] Criando agendamento. Peças previstas recebidas: {}",
                request.getPecasPrevistas() != null ? request.getPecasPrevistas().size() : 0);

        Agendamento agendamento = new Agendamento();

        agendamento.setCodigoAgendamento(gerarCodigoAgendamento());

        preencherDados(agendamento, request, null);

        Agendamento salvo = agendamentoRepository.save(agendamento);

        agendamentoPecaPrevistaService.substituirPecasDoAgendamento(
                salvo,
                request.getPecasPrevistas());
        corrigirValorEstimadoComPecas(salvo, request.getPecasPrevistas());

        log.info(
                "[AGENDAMENTO-SERVICE] Peças previstas processadas para o agendamento ID {}.",
                salvo.getId());

        if ("CONFIRMADO".equalsIgnoreCase(salvo.getStatusAgendamento())) {
            reservaEstoqueAgendamentoService.reservarPecasDoAgendamento(salvo.getId());
            avisosWhatsapp.confirmado(salvo);
        }

        return salvo;
    }

    @Transactional
    public Agendamento criarPorColaborador(AgendamentoRequest request) {
        if (request == null) throw new IllegalArgumentException("Dados do agendamento não informados.");
        Long idCliente = validarIdObrigatorio(request.getIdCliente(), "Cliente");
        Long idVeiculo = validarIdObrigatorio(request.getIdVeiculo(), "Veículo");
        Long idServico = validarIdObrigatorio(request.getIdServico(), "Serviço");
        Usuario cliente = usuarioRepository.findById(idCliente)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado."));
        if (!"CLIENTE".equalsIgnoreCase(cliente.getTipo_do_acesso()) || !"ATIVO".equalsIgnoreCase(cliente.getStatus()))
            throw new IllegalArgumentException("Selecione um cliente ativo.");
        Veiculo veiculo = veiculoRepository.findById(idVeiculo)
                .orElseThrow(() -> new IllegalArgumentException("Veículo não encontrado."));
        if (!java.util.Objects.equals(veiculo.getIdProprietario(), cliente.getId()))
            throw new IllegalArgumentException("O veículo selecionado não pertence ao cliente informado.");
        Servico servico = servicoRepository.findById(idServico)
                .orElseThrow(() -> new IllegalArgumentException("Serviço não encontrado."));
        if (!Boolean.TRUE.equals(servico.getAtivo())) throw new IllegalArgumentException("Selecione um serviço ativo.");
        if (request.getIdResponsavel() != null) {
            Usuario responsavel = usuarioRepository.findById(request.getIdResponsavel())
                    .orElseThrow(() -> new IllegalArgumentException("Responsável não encontrado."));
            String tipoResponsavel = responsavel.getTipo_do_acesso() == null ? "" : responsavel.getTipo_do_acesso().toUpperCase(java.util.Locale.ROOT);
            if (!"ATIVO".equalsIgnoreCase(responsavel.getStatus())
                    || !java.util.Set.of("COLABORADOR", "ADMINISTRADOR").contains(tipoResponsavel))
                throw new IllegalArgumentException("Selecione um responsável ativo.");
        }
        request.setStatusAgendamento("AGENDADO");
        request.setCanalOrigem("PRESENCIAL");
        request.setPrioridade("NORMAL");
        // A modalidade é validada em preencherDados; colaboradores também podem agendar execução externa.
        request.setPecasPrevistas(java.util.List.of());
        request.setValorEstimado(null);
        request.setValorFinal(null);
        request.setDiagnosticoPrevio(null);
        request.setConfirmado(false);
        request.setRequerConfirmacao(true);
        return criar(request);
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Agendamento atualizar(Long id, AgendamentoRequest request) {
        validarRequest(request);
        validarPecasDescritas(request);

        Agendamento agendamento = agendamentoRepository.buscarParaCancelamento(id)
                .orElseThrow(() -> new IllegalArgumentException("Agendamento não encontrado."));

        if ("CANCELADO".equalsIgnoreCase(agendamento.getStatusAgendamento())) {
            throw new IllegalArgumentException("Não é possível alterar um agendamento cancelado.");
        }

        if ("CONCLUIDO".equalsIgnoreCase(agendamento.getStatusAgendamento())) {
            throw new IllegalArgumentException("Não é possível alterar um agendamento concluído.");
        }

        String statusAntes = agendamento.getStatusAgendamento();
        LocalDateTime inicioAnterior = agendamento.getDataHoraInicio();

        boolean possuiaReservaAntes = statusPossuiReservaEstoque(statusAntes);

        if (possuiaReservaAntes) {
            reservaEstoqueAgendamentoService.liberarReservasDoAgendamento(id);
        }

        preencherDados(agendamento, request, id);

        Agendamento salvo = agendamentoRepository.save(agendamento);

        log.info(
                "[AGENDAMENTO] Atualizando agendamento ID {}. Peças previstas recebidas no PUT: {}",
                salvo.getId(),
                request.getPecasPrevistas() != null ? request.getPecasPrevistas().size() : null);

        if (request.getPecasPrevistas() != null) {
            agendamentoPecaPrevistaService.substituirPecasDoAgendamento(
                    salvo,
                    request.getPecasPrevistas());
            corrigirValorEstimadoComPecas(salvo, request.getPecasPrevistas());

            log.info(
                    "[AGENDAMENTO] Peças previstas substituídas para o agendamento ID {}.",
                    salvo.getId());
        }

        if (statusPossuiReservaEstoque(salvo.getStatusAgendamento())) {
            reservaEstoqueAgendamentoService.reservarPecasDoAgendamento(salvo.getId());
        }

        if (!java.util.Objects.equals(inicioAnterior, salvo.getDataHoraInicio())) {
            notificacoes.cancelarPendentes("AGENDAMENTO", salvo.getId());
            salvo.setLembreteEnviado(false);
            salvo.setLembreteEnviadoEm(null);
            avisosWhatsapp.reagendado(salvo, inicioAnterior);
        } else if (!"CONFIRMADO".equalsIgnoreCase(statusAntes)
                && "CONFIRMADO".equalsIgnoreCase(salvo.getStatusAgendamento())) {
            avisosWhatsapp.confirmado(salvo);
        }

        return salvo;
    }

    private void corrigirValorEstimadoComPecas(Agendamento agendamento,
            List<com.clinicar.backend.dto.AgendamentoPecaPrevistaRequest> pecas) {
        if (pecas == null || pecas.isEmpty()) return;
        BigDecimal maoDeObra = agendamento.getServico() == null || agendamento.getServico().getValorBase() == null
                ? BigDecimal.ZERO : agendamento.getServico().getValorBase();
        BigDecimal totalPecas = agendamentoPecaPrevistaService.listarPorAgendamento(agendamento.getId()).stream()
                .map(AgendamentoPecaPrevista::getValorTotal)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal minimo = maoDeObra.add(totalPecas);
        if (agendamento.getValorEstimado() == null || agendamento.getValorEstimado().compareTo(minimo) < 0) {
            agendamento.setValorEstimado(minimo);
            agendamentoRepository.save(agendamento);
        }
    }

    private void validarPecasDescritas(AgendamentoRequest request) {
        if (request.getPecasPrevistas() != null && request.getPecasPrevistas().isEmpty()
                && request.getObservacoes() != null
                && request.getObservacoes().contains("[PEÇAS PREVISTAS NO AGENDAMENTO]")) {
            throw new IllegalArgumentException("As peças exibidas no agendamento precisam estar vinculadas ao cadastro antes de salvar.");
        }
    }

    public List<Agendamento> listarTodos() {
        return agendamentoRepository.findAllByOrderByDataHoraInicioDesc();
    }

    @Transactional(readOnly = true)
    public List<com.clinicar.backend.dto.AgendamentoPecaPrevistaResponse> listarPecasPrevistas(Long id) {
        buscarPorId(id);
        return agendamentoPecaPrevistaService.listarPorAgendamento(id).stream()
                .map(item -> new com.clinicar.backend.dto.AgendamentoPecaPrevistaResponse(
                        item.getId(), item.getPeca().getId(), item.getPeca().getNome(),
                        item.getPeca().getDescricao(), item.getPeca().getFabricante(),
                        item.getPeca().getModelo(), item.getEstoquePeca() == null ? null : item.getEstoquePeca().getId(),
                        item.getFornecedor() == null ? null : item.getFornecedor().getId(),
                        item.getFornecedor() == null ? null : item.getFornecedor().getRazaoSocial(),
                        item.getQuantidade(), item.getUnidadeMedida(), item.getValorUnitario(),
                        item.getValorTotal(), item.getObservacoes()))
                .toList();
    }

    public List<Agendamento> listarPorStatus(String status) {
        String statusNormalizado = normalizarValorObrigatorio(status, "Status");

        validarPertenceAoConjunto(
                statusNormalizado,
                STATUS_VALIDOS,
                "Status de agendamento inválido.");

        return agendamentoRepository.findByStatusAgendamentoOrderByDataHoraInicioAsc(
                statusNormalizado);
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
                dataFim);
    }

    public Agendamento buscarPorId(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID do agendamento não informado.");
        }

        return agendamentoRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Agendamento não encontrado."));
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Agendamento confirmar(Long id) {
        Agendamento agendamento = agendamentoRepository.buscarParaCancelamento(id)
                .orElseThrow(() -> new IllegalArgumentException("Agendamento não encontrado."));

        validarPodeAlterarStatus(agendamento);
        if ("PENDENTE".equals(agendamento.getTipoExecucao()))
            throw new IllegalArgumentException("A oficina deve definir quem executará o serviço antes da confirmação.");
        if ("INTERNA".equals(agendamento.getTipoExecucao()) && agendamento.getResponsavel() == null)
            throw new IllegalArgumentException("Selecione o responsável pela execução na oficina antes da confirmação.");
        if ("EXTERNA".equals(agendamento.getTipoExecucao()) && agendamento.getFornecedor() == null)
            throw new IllegalArgumentException("Selecione o fornecedor externo antes da confirmação.");
        if (agendamento.getResponsavel() != null) {
            validarSobreposicaoResponsavel(agendamento.getResponsavel().getId(),
                    agendamento.getDataHoraInicio(), agendamento.getDataHoraFim(), id);
        }

        agendamento.setStatusAgendamento("CONFIRMADO");
        agendamento.setConfirmado(true);
        agendamento.setConfirmadoEm(LocalDateTime.now());

        Agendamento salvo = agendamentoRepository.save(agendamento);

        reservaEstoqueAgendamentoService.reservarPecasDoAgendamento(salvo.getId());

        avisosWhatsapp.confirmado(salvo);

        return salvo;
    }

    @Transactional
    public Agendamento confirmarPeloCliente(Long id, Long clienteId) {
        Agendamento agendamento = agendamentoRepository.buscarParaCancelamento(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        validarTitular(agendamento, clienteId);
        if (!Set.of("AGENDADO", "REAGENDADO").contains(agendamento.getStatusAgendamento())
                || agendamento.getDataHoraInicio() == null
                || !agendamento.getDataHoraInicio().isAfter(LocalDateTime.now()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este agendamento não pode ser confirmado pelo cliente.");
        if ("PENDENTE".equals(agendamento.getTipoExecucao())
                || "INTERNA".equals(agendamento.getTipoExecucao()) && agendamento.getResponsavel() == null
                || "EXTERNA".equals(agendamento.getTipoExecucao()) && agendamento.getFornecedor() == null)
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Aguarde a oficina definir quem executará o serviço antes de confirmar.");
        return confirmar(id);
    }

    @Transactional
    public Agendamento reagendarPeloCliente(Long id, Long clienteId, AgendamentoRequest request) {
        Agendamento agendamento = agendamentoRepository.buscarParaCancelamento(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        validarTitular(agendamento, clienteId);
        if (!Set.of("AGENDADO", "REAGENDADO", "CONFIRMADO").contains(agendamento.getStatusAgendamento()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este agendamento não pode ser reagendado pelo cliente.");
        if (agendamento.getDataHoraInicio() == null
                || agendamento.getDataHoraInicio().isBefore(LocalDateTime.now().plusDays(1)))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "O reagendamento deve ocorrer até 24 horas antes do início.");
        LocalDateTime novoInicio = parseDataHoraObrigatoria(request.getDataHoraInicio(), "Novo início");
        if (!novoInicio.isAfter(LocalDateTime.now()) || novoInicio.equals(agendamento.getDataHoraInicio()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Escolha uma nova data futura para reagendar.");
        request.setStatusAgendamento("REAGENDADO");
        request.setConfirmado(false);
        return atualizar(id, request);
    }

    private void validarTitular(Agendamento agendamento, Long clienteId) {
        if (agendamento.getCliente() == null || !clienteId.equals(agendamento.getCliente().getId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }

    @Transactional
    public Agendamento iniciarAtendimento(Long id) {
        return iniciarComAtendimento(id).agendamento();
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
            AgendamentoCancelamentoRequest request) {
        Agendamento agendamento = agendamentoRepository.buscarParaCancelamento(id)
                .orElseThrow(() -> new IllegalArgumentException("Agendamento não encontrado."));

        if ("CONCLUIDO".equals(agendamento.getStatusAgendamento())) {
            throw new IllegalArgumentException("Não é possível cancelar um agendamento concluído.");
        }

        reservaEstoqueAgendamentoService.liberarReservasDoAgendamento(id);

        agendamento.setStatusAgendamento("CANCELADO");
        notificacoes.cancelarPendentes("AGENDAMENTO", id);
        agendamento.setCanceladoEm(LocalDateTime.now());
        agendamento.setConfirmado(false);

        if (request != null) {
            agendamento.setMotivoCancelamento(
                    limparTextoOpcional(request.getMotivoCancelamento()));
        }

        return agendamentoRepository.save(agendamento);
    }

    @Transactional
    public Agendamento cancelarPeloCliente(Long id, Long clienteId) {
        Agendamento agendamento = agendamentoRepository.buscarParaCancelamento(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        validarTitular(agendamento, clienteId);
        if (!Set.of("AGENDADO", "REAGENDADO", "CONFIRMADO").contains(agendamento.getStatusAgendamento()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este agendamento não pode ser cancelado pelo cliente.");
        if (agendamento.getDataHoraInicio() == null
                || agendamento.getDataHoraInicio().isBefore(LocalDateTime.now().plusDays(1)))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "O cancelamento pelo cliente deve ocorrer até 24 horas antes do início. Contate a oficina.");
        return cancelar(id, null);
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

        reservaEstoqueAgendamentoService.liberarReservasDoAgendamento(id);
        agendamento.setStatusAgendamento("NAO_COMPARECEU");

        return agendamentoRepository.save(agendamento);
    }

    private void preencherDados(
            Agendamento agendamento,
            AgendamentoRequest request,
            Long ignorarIdNaValidacao) {
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
        if (!java.util.Objects.equals(veiculo.getIdProprietario(), cliente.getId())) {
            throw new IllegalArgumentException("O veículo selecionado não pertence ao cliente informado.");
        }

        Servico servico = servicoRepository
                .findById(idServico)
                .orElseThrow(() -> new IllegalArgumentException("Serviço não encontrado."));

        String tipoExecucao = request.getTipoExecucao();
        if (tipoExecucao == null || tipoExecucao.isBlank())
            tipoExecucao = request.getIdFornecedor() == null ? "INTERNA" : "EXTERNA";
        tipoExecucao = tipoExecucao.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("INTERNA", "EXTERNA", "PENDENTE").contains(tipoExecucao))
            throw new IllegalArgumentException("Modalidade de execução inválida.");
        if ("PENDENTE".equals(tipoExecucao) && (request.getIdResponsavel() != null || request.getIdFornecedor() != null))
            throw new IllegalArgumentException("A definição da execução ainda está pendente da oficina.");
        if ("INTERNA".equals(tipoExecucao) && request.getIdFornecedor() != null)
            throw new IllegalArgumentException("Execução pela oficina não deve indicar fornecedor externo.");
        if ("INTERNA".equals(tipoExecucao) && request.getIdResponsavel() == null)
            throw new IllegalArgumentException("Selecione o responsável pela execução na oficina.");
        if ("EXTERNA".equals(tipoExecucao) && request.getIdFornecedor() == null)
            throw new IllegalArgumentException("Selecione o fornecedor que executará o serviço.");

        Fornecedor fornecedor = null;

        if (request.getIdFornecedor() != null) {
            fornecedor = fornecedorRepository
                    .findById(request.getIdFornecedor())
                    .orElseThrow(() -> new IllegalArgumentException("Fornecedor não encontrado."));
            boolean vinculoHistorico = agendamento.getId() != null && agendamento.getFornecedor() != null
                    && fornecedor.getId().equals(agendamento.getFornecedor().getId());
            if ((!fornecedor.isAtivo() || !CategoriasFornecedor.aceita(fornecedor.getItemFornecido(), "SERVICOS")) && !vinculoHistorico)
                throw new IllegalArgumentException("Selecione um fornecedor ativo cadastrado para serviços.");
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
                "Data/hora de início");

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
                ignorarIdNaValidacao);

        String status = normalizarValorComDefault(
                request.getStatusAgendamento(),
                agendamento.getStatusAgendamento() == null
                        ? "AGENDADO"
                        : agendamento.getStatusAgendamento());

        validarPertenceAoConjunto(
                status,
                STATUS_VALIDOS,
                "Status de agendamento inválido.");

        if (responsavel != null && ("CONFIRMADO".equals(status) || "EM_ATENDIMENTO".equals(status))) {
            validarSobreposicaoResponsavel(responsavel.getId(), inicio, fim, ignorarIdNaValidacao);
        }

        String canal = normalizarValorComDefault(
                request.getCanalOrigem(),
                "SISTEMA");

        validarPertenceAoConjunto(
                canal,
                CANAIS_VALIDOS,
                "Canal de origem inválido.");

        String prioridade = normalizarValorComDefault(
                request.getPrioridade(),
                "NORMAL");

        validarPertenceAoConjunto(
                prioridade,
                PRIORIDADES_VALIDAS,
                "Prioridade inválida.");

        String tipoAtendimento = normalizarValorComDefault(
                request.getTipoAtendimento(),
                "PRESENCIAL");

        validarPertenceAoConjunto(
                tipoAtendimento,
                TIPOS_ATENDIMENTO_VALIDOS,
                "Tipo de atendimento inválido.");

        Integer quilometragem = request.getQuilometragemAtual();

        if (quilometragem != null && quilometragem < 0) {
            throw new IllegalArgumentException("A quilometragem não pode ser negativa.");
        }

        BigDecimal valorEstimado = parseMoedaOpcional(request.getValorEstimado(), "Valor estimado");
        BigDecimal valorFinal = parseMoedaOpcional(request.getValorFinal(), "Valor final");

        agendamento.setCliente(cliente);
        agendamento.vincularVeiculo(veiculo);
        agendamento.setServico(servico);
        agendamento.setFornecedor(fornecedor);
        agendamento.setTipoExecucao(tipoExecucao);
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
        if (request.getSugestaoMateriaisCliente() != null) {
            String sugestao = request.getSugestaoMateriaisCliente().trim();
            if (sugestao.length() > 1000)
                throw new IllegalArgumentException("A sugestão de materiais deve ter no máximo 1000 caracteres.");
            agendamento.setSugestaoMateriaisCliente(sugestao.isEmpty() ? null : sugestao);
        }
        if (request.getPreferenciaExecucaoCliente() != null) {
            String preferencia = request.getPreferenciaExecucaoCliente().trim();
            if (preferencia.length() > 1000)
                throw new IllegalArgumentException("A preferência de execução deve ter no máximo 1000 caracteres.");
            agendamento.setPreferenciaExecucaoCliente(preferencia.isEmpty() ? null : preferencia);
        }
        agendamento.setDiagnosticoPrevio(limparTextoOpcional(request.getDiagnosticoPrevio()));
        agendamento.setObservacoes(limparTextoOpcional(request.getObservacoes()));

        agendamento.setValorEstimado(valorEstimado);
        agendamento.setValorFinal(valorFinal);

        agendamento.setRequerConfirmacao(
                request.getRequerConfirmacao() == null
                        ? true
                        : request.getRequerConfirmacao());

        aplicarConfirmacao(agendamento, request);
    }

    private void aplicarConfirmacao(
            Agendamento agendamento,
            AgendamentoRequest request) {
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
                    "O usuário selecionado como cliente precisa possuir perfil CLIENTE.");
        }
    }

    private void validarUsuarioComoResponsavel(Usuario usuario) {
        String tipo = normalizarTipoAcessoUsuario(usuario);

        if (!TIPOS_RESPONSAVEL_VALIDOS.contains(tipo)) {
            throw new IllegalArgumentException(
                    "O responsável pelo atendimento precisa possuir perfil COLABORADOR ou ADMINISTRADOR.");
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
            Long ignorarId) {
        long conflitos = agendamentoRepository.contarSobreposicaoVeiculo(
                veiculoId,
                inicio,
                fim,
                ignorarId);

        if (conflitos > 0) {
            throw new IllegalArgumentException(
                    "Já existe agendamento para este veículo no período informado.");
        }
    }

    private void validarSobreposicaoResponsavel(
            Long responsavelId,
            LocalDateTime inicio,
            LocalDateTime fim,
            Long ignorarId) {
        // Serializa confirmações concorrentes para o mesmo profissional.
        usuarioRepository.buscarParaAtualizacao(responsavelId)
                .orElseThrow(() -> new IllegalArgumentException("Responsável não encontrado."));
        long conflitos = agendamentoRepository.contarSobreposicaoResponsavel(
                responsavelId,
                inicio,
                fim,
                ignorarId);

        if (conflitos > 0) {
            throw new IllegalArgumentException(
                    "Já existe agendamento para este responsável no período informado.");
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
            throw new IllegalArgumentException(
                    "Agendamento marcado como não compareceu não pode ter o status alterado.");
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
                DateTimeFormatter.ofPattern("yyyyMMdd"));

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
            String mensagemErro) {
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

    @Transactional
    public void excluir(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID do agendamento não informado.");
        }

        Agendamento agendamento = buscarPorId(id);

        if ("EM_ATENDIMENTO".equalsIgnoreCase(agendamento.getStatusAgendamento())) {
            throw new IllegalArgumentException("Não é possível excluir um agendamento em atendimento.");
        }

        if ("CONCLUIDO".equalsIgnoreCase(agendamento.getStatusAgendamento())) {
            throw new IllegalArgumentException("Não é possível excluir um agendamento concluído.");
        }
        reservaEstoqueAgendamentoService.liberarReservasDoAgendamento(id);
        agendamentoPecaPrevistaService.substituirPecasDoAgendamento(
                agendamento,
                List.of());
        agendamentoRepository.delete(agendamento);
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public ResultadoInicioAgendamento iniciarComAtendimento(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID do agendamento não informado.");
        }

        Agendamento agendamento = buscarPorId(id);

        String statusAtual = agendamento.getStatusAgendamento();

        if ("CANCELADO".equalsIgnoreCase(statusAtual)) {
            throw new IllegalArgumentException("Agendamento cancelado não pode ser iniciado.");
        }

        if ("CONCLUIDO".equalsIgnoreCase(statusAtual)) {
            throw new IllegalArgumentException("Agendamento concluído não pode ser iniciado.");
        }

        if ("NAO_COMPARECEU".equalsIgnoreCase(statusAtual)) {
            throw new IllegalArgumentException("Agendamento marcado como não compareceu não pode ser iniciado.");
        }

        if ("PENDENTE".equals(agendamento.getTipoExecucao())
                || "INTERNA".equals(agendamento.getTipoExecucao()) && agendamento.getResponsavel() == null
                || "EXTERNA".equals(agendamento.getTipoExecucao()) && agendamento.getFornecedor() == null)
            throw new IllegalArgumentException("A oficina deve definir quem executará o serviço antes de iniciar o atendimento.");

        LocalDateTime agora = LocalDateTime.now();

        if (agendamento.getResponsavel() != null) {
            validarSobreposicaoResponsavel(agendamento.getResponsavel().getId(),
                    agendamento.getDataHoraInicio(), agendamento.getDataHoraFim(), id);
        }

        agendamento.setStatusAgendamento("EM_ATENDIMENTO");

        if (!Boolean.TRUE.equals(agendamento.getConfirmado())) {
            agendamento.setConfirmado(true);
            agendamento.setConfirmadoEm(agora);
        }

        Agendamento agendamentoSalvo = agendamentoRepository.save(agendamento);

        reservaEstoqueAgendamentoService.reservarPecasDoAgendamento(
                agendamentoSalvo.getId());
        AtendimentoService.AtendimentoAutomaticoResultado resultadoAtendimento = atendimentoService
                .criarAutomaticamenteAPartirDoAgendamento(agendamentoSalvo);

        return new ResultadoInicioAgendamento(
                agendamentoSalvo,
                resultadoAtendimento.atendimento(),
                resultadoAtendimento.criado());
    }

    private boolean statusPossuiReservaEstoque(String status) {
        return "CONFIRMADO".equalsIgnoreCase(status)
                || "EM_ATENDIMENTO".equalsIgnoreCase(status);
    }
}
