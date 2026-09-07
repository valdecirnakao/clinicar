package com.clinicar.backend.service;

import com.clinicar.backend.dto.AtendimentoServicoExecutadoRequest;
import com.clinicar.backend.model.Agendamento;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.AtendimentoServicoExecutado;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.AtendimentoRepository;
import com.clinicar.backend.repository.AtendimentoServicoExecutadoRepository;
import com.clinicar.backend.repository.FornecedorRepository;
import com.clinicar.backend.repository.ServicoRepository;
import com.clinicar.backend.repository.UsuarioRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Slf4j
@Service
public class AtendimentoServicoExecutadoService {

    private static final String TIPO_INTERNO = "INTERNO";
    private static final String TIPO_TERCEIRO = "TERCEIRO";
    private static final String TIPO_MISTO = "MISTO";

    private static final String STATUS_EXECUTADO = "EXECUTADO";
    private static final String STATUS_CANCELADO = "CANCELADO";

    private static final Set<String> TIPOS_EXECUCAO_VALIDOS = Set.of(
            TIPO_INTERNO,
            TIPO_TERCEIRO,
            TIPO_MISTO
    );

    private static final Set<String> STATUS_VALIDOS = Set.of(
            "PENDENTE",
            "EM_EXECUCAO",
            STATUS_EXECUTADO,
            STATUS_CANCELADO
    );

    private static final Set<String> TIPOS_RESPONSAVEL_VALIDOS = Set.of(
            "COLABORADOR",
            "ADMINISTRADOR"
    );

    private final AtendimentoServicoExecutadoRepository atendimentoServicoRepository;
    private final AtendimentoRepository atendimentoRepository;
    private final ServicoRepository servicoRepository;
    private final UsuarioRepository usuarioRepository;
    private final FornecedorRepository fornecedorRepository;
    private final AtendimentoTotaisService atendimentoTotaisService;

    public AtendimentoServicoExecutadoService(
            AtendimentoServicoExecutadoRepository atendimentoServicoRepository,
            AtendimentoRepository atendimentoRepository,
            ServicoRepository servicoRepository,
            UsuarioRepository usuarioRepository,
            FornecedorRepository fornecedorRepository,
            AtendimentoTotaisService atendimentoTotaisService
    ) {
        this.atendimentoServicoRepository = atendimentoServicoRepository;
        this.atendimentoRepository = atendimentoRepository;
        this.servicoRepository = servicoRepository;
        this.usuarioRepository = usuarioRepository;
        this.fornecedorRepository = fornecedorRepository;
        this.atendimentoTotaisService = atendimentoTotaisService;
    }

    @Transactional(readOnly = true)
    public List<AtendimentoServicoExecutado> listarPorAtendimento(Long atendimentoId) {
        validarId(atendimentoId, "Atendimento");

        List<AtendimentoServicoExecutado> itens =
                atendimentoServicoRepository.buscarPorAtendimentoComRelacionamentos(atendimentoId);

        itens.forEach(this::inicializarRelacoesParaMapper);

        return itens;
    }

    @Transactional
    public AtendimentoServicoExecutado adicionar(
            Long atendimentoId,
            AtendimentoServicoExecutadoRequest request
    ) {
        validarRequest(request);

        Atendimento atendimento = buscarAtendimentoEditavel(atendimentoId);

        Servico servico = servicoRepository
                .findById(validarId(request.getIdServico(), "Serviço"))
                .orElseThrow(() -> new IllegalArgumentException("Serviço não encontrado."));

        AtendimentoServicoExecutado existente = buscarServicoAtivoExistente(
                atendimentoId,
                servico.getId()
        );

        if (existente != null) {
            log.info(
                    "[ATENDIMENTO-SERVICO] Serviço ID {} já estava vinculado ao atendimento ID {}. Reutilizando item ID {}.",
                    servico.getId(),
                    atendimentoId,
                    existente.getId()
            );

            inicializarRelacoesParaMapper(existente);
            return existente;
        }

        AtendimentoServicoExecutado item = new AtendimentoServicoExecutado();
        item.setAtendimento(atendimento);
        item.setServico(servico);

        preencherDadosProfissionais(item, request, atendimento, servico);

        AtendimentoServicoExecutado salvo = atendimentoServicoRepository.saveAndFlush(item);
        atendimentoTotaisService.recalcularTotais(atendimentoId);

        inicializarRelacoesParaMapper(salvo);

        return salvo;
    }

    @Transactional
    public AtendimentoServicoExecutado atualizar(
            Long atendimentoId,
            Long itemId,
            AtendimentoServicoExecutadoRequest request
    ) {
        validarRequest(request);

        Atendimento atendimento = buscarAtendimentoEditavel(atendimentoId);

        AtendimentoServicoExecutado item = atendimentoServicoRepository
                .findById(validarId(itemId, "Item de serviço"))
                .orElseThrow(() -> new IllegalArgumentException("Item de serviço não encontrado."));

        if (item.getAtendimento() == null || !Objects.equals(item.getAtendimento().getId(), atendimentoId)) {
            throw new IllegalArgumentException("Item de serviço não pertence ao atendimento informado.");
        }

        Servico servico = item.getServico();

        if (servico == null || servico.getId() == null) {
            throw new IllegalArgumentException("Item de serviço sem serviço vinculado.");
        }

        /*
         * Regra profissional:
         * no atendimento, o usuário altera a composição do atendimento, não os valores.
         * Portanto, atualização de serviço mantém quantidade 1, valores do cadastro e status EXECUTADO.
         */
        preencherDadosProfissionais(item, request, atendimento, servico);

        AtendimentoServicoExecutado salvo = atendimentoServicoRepository.saveAndFlush(item);
        atendimentoTotaisService.recalcularTotais(atendimentoId);

        inicializarRelacoesParaMapper(salvo);

        return salvo;
    }

    @Transactional
    public void remover(Long atendimentoId, Long itemId) {
        buscarAtendimentoEditavel(atendimentoId);

        AtendimentoServicoExecutado item = atendimentoServicoRepository
                .findById(validarId(itemId, "Item de serviço"))
                .orElseThrow(() -> new IllegalArgumentException("Item de serviço não encontrado."));

        if (item.getAtendimento() == null || !Objects.equals(item.getAtendimento().getId(), atendimentoId)) {
            throw new IllegalArgumentException("Item de serviço não pertence ao atendimento informado.");
        }

        atendimentoServicoRepository.delete(item);
        atendimentoServicoRepository.flush();

        atendimentoTotaisService.recalcularTotais(atendimentoId);
    }

    /**
     * Garante que o serviço principal do atendimento exista na tabela
     * atendimento_servico_executado.
     *
     * Este método é importante para atendimentos criados automaticamente a partir
     * de agendamento. Sem esse item, o AtendimentoTotaisService pode recalcular
     * somente as peças e deixar a mão de obra como R$ 0,00.
     */
    @Transactional
    public AtendimentoServicoExecutado garantirServicoPrincipalDoAtendimento(Long atendimentoId) {
        Atendimento atendimento = buscarAtendimentoEditavel(atendimentoId);
        return garantirServicoPrincipalDoAtendimento(atendimento);
    }

    /**
     * Sobrecarga para uso interno pelo AtendimentoService quando ele já possui a
     * entidade Atendimento carregada.
     *
     * Esta sobrecarga não chama buscarAtendimentoEditavel(...), pois pode ser usada
     * durante a criação automática do atendimento, antes do status ficar liberado
     * para edição operacional.
     */
    @Transactional
    public AtendimentoServicoExecutado garantirServicoPrincipalDoAtendimento(Atendimento atendimento) {
        if (atendimento == null || atendimento.getId() == null) {
            throw new IllegalArgumentException("Atendimento não informado para vincular serviço executado.");
        }

        if (atendimento.getServico() == null || atendimento.getServico().getId() == null) {
            throw new IllegalArgumentException("Atendimento sem serviço vinculado.");
        }

        Long atendimentoId = atendimento.getId();
        Long servicoId = atendimento.getServico().getId();

        AtendimentoServicoExecutado existente = buscarServicoAtivoExistente(
                atendimentoId,
                servicoId
        );

        if (existente != null) {
            log.info(
                    "[ATENDIMENTO-SERVICO] Serviço principal já existe para atendimento ID {}. itemId={}, servicoId={}",
                    atendimentoId,
                    existente.getId(),
                    servicoId
            );

            inicializarRelacoesParaMapper(existente);
            return existente;
        }

        AtendimentoServicoExecutado item = new AtendimentoServicoExecutado();
        item.setAtendimento(atendimento);
        item.setServico(atendimento.getServico());

        preencherDadosAutomaticos(item, atendimento, atendimento.getServico());

        AtendimentoServicoExecutado salvo = atendimentoServicoRepository.saveAndFlush(item);

        log.info(
                "[ATENDIMENTO-SERVICO] Serviço principal importado para atendimento ID {}. itemId={}, servicoId={}, valorMaoObra={}",
                atendimentoId,
                salvo.getId(),
                servicoId,
                salvo.getValorMaoObra()
        );

        atendimentoTotaisService.recalcularTotais(atendimentoId);

        inicializarRelacoesParaMapper(salvo);

        return salvo;
    }

    private void preencherDadosProfissionais(
            AtendimentoServicoExecutado item,
            AtendimentoServicoExecutadoRequest request,
            Atendimento atendimento,
            Servico servico
    ) {
        if (servico == null || servico.getId() == null) {
            throw new IllegalArgumentException("Serviço não informado.");
        }

        String tipoExecucao = normalizarComDefault(
                request.getTipoExecucao(),
                primeiroTextoValido(
                        atendimento != null ? atendimento.getTipoExecucao() : null,
                        item.getTipoExecucao(),
                        TIPO_INTERNO
                )
        );

        validarPertence(tipoExecucao, TIPOS_EXECUCAO_VALIDOS, "Tipo de execução inválido.");

        Usuario responsavel = resolverResponsavel(request, atendimento);
        Fornecedor fornecedor = resolverFornecedor(request, atendimento, servico, tipoExecucao);

        BigDecimal quantidade = BigDecimal.ONE.setScale(2, RoundingMode.HALF_UP);
        BigDecimal valorMaoObra = valorBaseServico(servico);
        BigDecimal valorTerceiro = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal desconto = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        BigDecimal valorTotal = calcularValorTotalItem(
                quantidade,
                valorMaoObra,
                valorTerceiro,
                desconto
        );

        item.setResponsavel(responsavel);
        item.setFornecedor(fornecedor);

        item.setTipoExecucao(tipoExecucao);
        item.setQuantidade(quantidade);

        item.setUnidadeCobranca(limparTextoOpcional(servico.getUnidadeCobranca()));
        item.setTempoExecucao(null);
        item.setUnidadeTempo(limparTextoOpcional(servico.getUnidadeDuracao()));

        item.setValorMaoObra(valorMaoObra);
        item.setValorTerceiro(valorTerceiro);
        item.setDesconto(desconto);
        item.setValorTotal(valorTotal);

        item.setStatusItem(STATUS_EXECUTADO);
        item.setObservacoes(limparTextoOpcional(request.getObservacoes()));
    }

    private void preencherDadosAutomaticos(
            AtendimentoServicoExecutado item,
            Atendimento atendimento,
            Servico servico
    ) {
        String tipoExecucao = normalizarComDefault(
                atendimento != null ? atendimento.getTipoExecucao() : null,
                TIPO_INTERNO
        );

        validarPertence(tipoExecucao, TIPOS_EXECUCAO_VALIDOS, "Tipo de execução inválido.");

        Fornecedor fornecedor = resolverFornecedorAutomatico(atendimento, servico, tipoExecucao);

        BigDecimal quantidade = BigDecimal.ONE.setScale(2, RoundingMode.HALF_UP);
        BigDecimal valorMaoObra = valorBaseServico(servico);
        BigDecimal valorTerceiro = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal desconto = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        BigDecimal valorTotal = calcularValorTotalItem(
                quantidade,
                valorMaoObra,
                valorTerceiro,
                desconto
        );

        item.setResponsavel(atendimento != null ? atendimento.getResponsavel() : null);
        item.setFornecedor(fornecedor);
        item.setTipoExecucao(tipoExecucao);

        item.setQuantidade(quantidade);
        item.setUnidadeCobranca(limparTextoOpcional(servico.getUnidadeCobranca()));

        item.setTempoExecucao(null);
        item.setUnidadeTempo(limparTextoOpcional(servico.getUnidadeDuracao()));

        item.setValorMaoObra(valorMaoObra);
        item.setValorTerceiro(valorTerceiro);
        item.setDesconto(desconto);
        item.setValorTotal(valorTotal);

        item.setStatusItem(STATUS_EXECUTADO);
        item.setObservacoes("Serviço principal importado automaticamente do agendamento.");
    }

    private AtendimentoServicoExecutado buscarServicoAtivoExistente(
            Long atendimentoId,
            Long servicoId
    ) {
        if (atendimentoId == null || servicoId == null) {
            return null;
        }

        List<AtendimentoServicoExecutado> servicosExistentes =
                atendimentoServicoRepository.buscarPorAtendimentoComRelacionamentos(atendimentoId);

        for (AtendimentoServicoExecutado existente : servicosExistentes) {
            Long idServicoExistente = existente.getServico() != null
                    ? existente.getServico().getId()
                    : null;

            if (Objects.equals(idServicoExistente, servicoId)
                    && !STATUS_CANCELADO.equalsIgnoreCase(existente.getStatusItem())) {
                return existente;
            }
        }

        return null;
    }

    private Usuario resolverResponsavel(
            AtendimentoServicoExecutadoRequest request,
            Atendimento atendimento
    ) {
        if (request != null && request.getIdResponsavel() != null) {
            Usuario responsavel = usuarioRepository
                    .findById(request.getIdResponsavel())
                    .orElseThrow(() -> new IllegalArgumentException("Responsável não encontrado."));

            validarUsuarioResponsavel(responsavel);

            return responsavel;
        }

        Usuario responsavelAtendimento = atendimento != null
                ? atendimento.getResponsavel()
                : null;

        if (responsavelAtendimento != null) {
            validarUsuarioResponsavel(responsavelAtendimento);
        }

        return responsavelAtendimento;
    }

    private Fornecedor resolverFornecedor(
            AtendimentoServicoExecutadoRequest request,
            Atendimento atendimento,
            Servico servico,
            String tipoExecucao
    ) {
        if (TIPO_INTERNO.equals(tipoExecucao)) {
            return null;
        }

        if (request != null && request.getIdFornecedor() != null) {
            return fornecedorRepository
                    .findById(request.getIdFornecedor())
                    .orElseThrow(() -> new IllegalArgumentException("Fornecedor não encontrado."));
        }

        Fornecedor fornecedor = resolverFornecedorAutomatico(atendimento, servico, tipoExecucao);

        if ((TIPO_TERCEIRO.equals(tipoExecucao) || TIPO_MISTO.equals(tipoExecucao)) && fornecedor == null) {
            throw new IllegalArgumentException(
                    "Fornecedor é obrigatório para serviço " + tipoExecucao.toLowerCase(Locale.ROOT) + "."
            );
        }

        return fornecedor;
    }

    private Fornecedor resolverFornecedorAutomatico(
            Atendimento atendimento,
            Servico servico,
            String tipoExecucao
    ) {
        if (TIPO_INTERNO.equals(tipoExecucao)) {
            return null;
        }

        if (atendimento != null && atendimento.getFornecedor() != null) {
            return atendimento.getFornecedor();
        }

        if (servico != null && servico.getFornecedor() != null) {
            return servico.getFornecedor();
        }

        Agendamento agendamento = atendimento != null
                ? atendimento.getAgendamento()
                : null;

        if (agendamento != null && agendamento.getFornecedor() != null) {
            return agendamento.getFornecedor();
        }

        return null;
    }

    private Atendimento buscarAtendimentoEditavel(Long atendimentoId) {
        Atendimento atendimento = atendimentoRepository
                .findById(validarId(atendimentoId, "Atendimento"))
                .orElseThrow(() -> new IllegalArgumentException("Atendimento não encontrado."));

        if (!"EM_EXECUCAO".equals(atendimento.getStatusAtendimento())) {
            throw new IllegalArgumentException(
                    "Peças e serviços só podem ser alterados após iniciar o atendimento e antes da aprovação."
            );
        }

        if (Boolean.TRUE.equals(atendimento.getAprovado())) {
            throw new IllegalArgumentException(
                    "Não é possível alterar peças ou serviços de atendimento já aprovado."
            );
        }

        if (Boolean.TRUE.equals(atendimento.getEstoqueBaixado())) {
            throw new IllegalArgumentException(
                    "Não é possível alterar peças ou serviços de atendimento com estoque já baixado."
            );
        }

        return atendimento;
    }

    private void validarUsuarioResponsavel(Usuario usuario) {
        String tipo = normalizarTipoAcessoUsuario(usuario);

        if (!TIPOS_RESPONSAVEL_VALIDOS.contains(tipo)) {
            throw new IllegalArgumentException(
                    "O responsável do serviço precisa possuir perfil COLABORADOR ou ADMINISTRADOR."
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

    private void validarRequest(AtendimentoServicoExecutadoRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dados do serviço executado não informados.");
        }
    }

    private Long validarId(Long id, String campo) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException(campo + " é obrigatório.");
        }

        return id;
    }

    private String normalizarComDefault(String valor, String padrao) {
        String base = valor;

        if (base == null || base.trim().isBlank()) {
            base = padrao;
        }

        if (base == null || base.trim().isBlank()) {
            return "";
        }

        return base.trim().toUpperCase(Locale.ROOT);
    }

    private void validarPertence(
            String valor,
            Set<String> permitidos,
            String mensagem
    ) {
        if (!permitidos.contains(valor)) {
            throw new IllegalArgumentException(mensagem);
        }
    }

    private BigDecimal calcularValorTotalItem(
            BigDecimal quantidade,
            BigDecimal valorMaoObra,
            BigDecimal valorTerceiro,
            BigDecimal desconto
    ) {
        BigDecimal qtd = valorOuZero(quantidade);
        BigDecimal maoObra = valorOuZero(valorMaoObra);
        BigDecimal terceiro = valorOuZero(valorTerceiro);
        BigDecimal desc = valorOuZero(desconto);

        BigDecimal total = maoObra
                .multiply(qtd)
                .add(terceiro)
                .subtract(desc)
                .setScale(2, RoundingMode.HALF_UP);

        if (total.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return total;
    }

    private BigDecimal valorBaseServico(Servico servico) {
        if (servico == null || servico.getValorBase() == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return servico.getValorBase().setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal valorOuZero(BigDecimal valor) {
        return valor == null
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : valor.setScale(2, RoundingMode.HALF_UP);
    }

    private String limparTextoOpcional(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        return valor.trim();
    }

    private String primeiroTextoValido(String... valores) {
        if (valores == null) {
            return null;
        }

        for (String valor : valores) {
            if (valor != null && !valor.trim().isBlank()) {
                return valor;
            }
        }

        return null;
    }

    private void inicializarRelacoesParaMapper(AtendimentoServicoExecutado item) {
        if (item == null) {
            return;
        }

        Atendimento atendimento = item.getAtendimento();
        if (atendimento != null) {
            atendimento.getId();
            atendimento.getCodigoAtendimento();
        }

        Servico servico = item.getServico();
        if (servico != null) {
            servico.getId();
            servico.getNome();
            servico.getCategoria();
        }

        Usuario responsavel = item.getResponsavel();
        if (responsavel != null) {
            responsavel.getId();
            responsavel.getNome();
        }

        Fornecedor fornecedor = item.getFornecedor();
        if (fornecedor != null) {
            fornecedor.getId();
            fornecedor.getRazaoSocial();
        }
    }
}
