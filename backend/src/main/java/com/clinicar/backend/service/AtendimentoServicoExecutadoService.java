package com.clinicar.backend.service;

import com.clinicar.backend.dto.AtendimentoServicoExecutadoRequest;
import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class AtendimentoServicoExecutadoService {

    private static final Set<String> TIPOS_EXECUCAO_VALIDOS = Set.of(
            "INTERNO",
            "TERCEIRO",
            "MISTO"
    );

    private static final Set<String> STATUS_VALIDOS = Set.of(
            "PENDENTE",
            "EM_EXECUCAO",
            "EXECUTADO",
            "CANCELADO"
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

    public List<AtendimentoServicoExecutado> listarPorAtendimento(Long atendimentoId) {
        validarId(atendimentoId, "Atendimento");

        return atendimentoServicoRepository.findByAtendimento_IdOrderByCriadoEmAsc(atendimentoId);
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

        AtendimentoServicoExecutado item = new AtendimentoServicoExecutado();

        item.setAtendimento(atendimento);
        item.setServico(servico);

        preencherDados(item, request, servico);

        AtendimentoServicoExecutado salvo = atendimentoServicoRepository.save(item);

        atendimentoTotaisService.recalcularTotais(atendimentoId);

        return salvo;
    }

    @Transactional
    public AtendimentoServicoExecutado atualizar(
            Long atendimentoId,
            Long itemId,
            AtendimentoServicoExecutadoRequest request
    ) {
        validarRequest(request);

        buscarAtendimentoEditavel(atendimentoId);

        AtendimentoServicoExecutado item = atendimentoServicoRepository
                .findById(validarId(itemId, "Item de serviço"))
                .orElseThrow(() -> new IllegalArgumentException("Item de serviço não encontrado."));

        if (!item.getAtendimento().getId().equals(atendimentoId)) {
            throw new IllegalArgumentException("Item de serviço não pertence ao atendimento informado.");
        }

        Servico servico = item.getServico();

        preencherDados(item, request, servico);

        AtendimentoServicoExecutado salvo = atendimentoServicoRepository.save(item);

        atendimentoTotaisService.recalcularTotais(atendimentoId);

        return salvo;
    }

    @Transactional
    public void remover(Long atendimentoId, Long itemId) {
        buscarAtendimentoEditavel(atendimentoId);

        AtendimentoServicoExecutado item = atendimentoServicoRepository
                .findById(validarId(itemId, "Item de serviço"))
                .orElseThrow(() -> new IllegalArgumentException("Item de serviço não encontrado."));

        if (!item.getAtendimento().getId().equals(atendimentoId)) {
            throw new IllegalArgumentException("Item de serviço não pertence ao atendimento informado.");
        }

        atendimentoServicoRepository.delete(item);

        atendimentoTotaisService.recalcularTotais(atendimentoId);
    }

    private void preencherDados(
            AtendimentoServicoExecutado item,
            AtendimentoServicoExecutadoRequest request,
            Servico servico
    ) {
        String tipoExecucao = normalizarComDefault(
                request.getTipoExecucao(),
                item.getTipoExecucao() == null ? "INTERNO" : item.getTipoExecucao()
        );

        validarPertence(tipoExecucao, TIPOS_EXECUCAO_VALIDOS, "Tipo de execução inválido.");

        String statusItem = normalizarComDefault(
                request.getStatusItem(),
                item.getStatusItem() == null ? "EXECUTADO" : item.getStatusItem()
        );

        validarPertence(statusItem, STATUS_VALIDOS, "Status do item de serviço inválido.");

        Usuario responsavel = resolverResponsavel(request);
        Fornecedor fornecedor = resolverFornecedor(request, servico, tipoExecucao);

        BigDecimal quantidade = parseDecimalComDefault(
                request.getQuantidade(),
                item.getQuantidade() == null ? BigDecimal.ONE : item.getQuantidade(),
                "Quantidade"
        );

        if (quantidade.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("A quantidade do serviço deve ser maior que zero.");
        }

        BigDecimal tempoExecucao = parseDecimalOpcional(request.getTempoExecucao(), "Tempo de execução");

        BigDecimal valorMaoObra = parseMoedaComDefault(
                request.getValorMaoObra(),
                item.getValorMaoObra()
        );

        BigDecimal valorTerceiro = parseMoedaComDefault(
                request.getValorTerceiro(),
                item.getValorTerceiro()
        );

        BigDecimal desconto = parseMoedaComDefault(
                request.getDesconto(),
                item.getDesconto()
        );

        if ("TERCEIRO".equals(tipoExecucao) && fornecedor == null) {
            throw new IllegalArgumentException("Fornecedor é obrigatório para serviço terceirizado.");
        }

        if ("MISTO".equals(tipoExecucao) && fornecedor == null) {
            throw new IllegalArgumentException("Fornecedor é obrigatório para serviço misto.");
        }

        if ("INTERNO".equals(tipoExecucao)) {
            valorTerceiro = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        item.setResponsavel(responsavel);
        item.setFornecedor(fornecedor);

        item.setTipoExecucao(tipoExecucao);
        item.setQuantidade(quantidade);

        item.setUnidadeCobranca(limparTextoOpcional(
                request.getUnidadeCobranca() != null
                        ? request.getUnidadeCobranca()
                        : servico.getUnidadeCobranca()
        ));

        item.setTempoExecucao(tempoExecucao);

        item.setUnidadeTempo(limparTextoOpcional(
                request.getUnidadeTempo() != null
                        ? request.getUnidadeTempo()
                        : servico.getUnidadeDuracao()
        ));

        item.setValorMaoObra(valorMaoObra);
        item.setValorTerceiro(valorTerceiro);
        item.setDesconto(desconto);

        item.setStatusItem(statusItem);
        item.setObservacoes(limparTextoOpcional(request.getObservacoes()));
    }

    private Usuario resolverResponsavel(AtendimentoServicoExecutadoRequest request) {
        if (request.getIdResponsavel() == null) {
            return null;
        }

        Usuario responsavel = usuarioRepository
                .findById(request.getIdResponsavel())
                .orElseThrow(() -> new IllegalArgumentException("Responsável não encontrado."));

        String tipo = normalizarTipoAcessoUsuario(responsavel);

        if (!TIPOS_RESPONSAVEL_VALIDOS.contains(tipo)) {
            throw new IllegalArgumentException(
                    "O responsável do serviço precisa possuir perfil COLABORADOR ou ADMINISTRADOR."
            );
        }

        return responsavel;
    }

    private Fornecedor resolverFornecedor(
            AtendimentoServicoExecutadoRequest request,
            Servico servico,
            String tipoExecucao
    ) {
        if (request.getIdFornecedor() != null) {
            return fornecedorRepository
                    .findById(request.getIdFornecedor())
                    .orElseThrow(() -> new IllegalArgumentException("Fornecedor não encontrado."));
        }

        if (servico != null && servico.getFornecedor() != null) {
            return servico.getFornecedor();
        }

        if ("TERCEIRO".equals(tipoExecucao) || "MISTO".equals(tipoExecucao)) {
            return null;
        }

        return null;
    }

    private Atendimento buscarAtendimentoEditavel(Long atendimentoId) {
        Atendimento atendimento = atendimentoRepository
                .findById(validarId(atendimentoId, "Atendimento"))
                .orElseThrow(() -> new IllegalArgumentException("Atendimento não encontrado."));

        if ("CANCELADO".equals(atendimento.getStatusAtendimento())) {
            throw new IllegalArgumentException("Não é possível alterar serviços de atendimento cancelado.");
        }

        if ("ENTREGUE".equals(atendimento.getStatusAtendimento())) {
            throw new IllegalArgumentException("Não é possível alterar serviços de atendimento entregue.");
        }

        return atendimento;
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
        if (valor == null || valor.trim().isBlank()) {
            return padrao;
        }

        return valor.trim().toUpperCase(Locale.ROOT);
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

    private BigDecimal parseDecimalComDefault(
            String valor,
            BigDecimal padrao,
            String campo
    ) {
        if (valor == null || valor.trim().isBlank()) {
            return padrao == null
                    ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                    : padrao.setScale(2, RoundingMode.HALF_UP);
        }

        return parseDecimal(valor, campo);
    }

    private BigDecimal parseDecimalOpcional(String valor, String campo) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        return parseDecimal(valor, campo);
    }

    private BigDecimal parseMoedaComDefault(
            String valor,
            BigDecimal padrao
    ) {
        if (valor == null || valor.trim().isBlank()) {
            return padrao == null
                    ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                    : padrao.setScale(2, RoundingMode.HALF_UP);
        }

        return parseDecimal(valor, "Valor monetário");
    }

    private BigDecimal parseDecimal(String valor, String campo) {
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
            }

            return new BigDecimal(texto).setScale(2, RoundingMode.HALF_UP);

        } catch (Exception e) {
            throw new IllegalArgumentException(campo + " inválido.");
        }
    }

    private String limparTextoOpcional(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        return valor.trim();
    }
}