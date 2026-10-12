package com.clinicar.backend.controller;

import com.clinicar.backend.dto.*;
import com.clinicar.backend.mapper.MovimentacaoEstoquePecaMapper;
import com.clinicar.backend.repository.AtendimentoRepository;
import com.clinicar.backend.repository.MovimentacaoEstoquePecaRepository;
import com.clinicar.backend.service.EstoquePecaService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/atendimento/{id}/devolucoes")
public class DevolucaoAtendimentoController {
    private final AtendimentoRepository atendimentos;
    private final MovimentacaoEstoquePecaRepository movimentos;
    private final MovimentacaoEstoquePecaMapper mapper;
    private final EstoquePecaService estoque;

    public DevolucaoAtendimentoController(AtendimentoRepository atendimentos, MovimentacaoEstoquePecaRepository movimentos,
                                         MovimentacaoEstoquePecaMapper mapper, EstoquePecaService estoque) {
        this.atendimentos = atendimentos; this.movimentos = movimentos; this.mapper = mapper; this.estoque = estoque;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<MovimentacaoEstoquePecaResponse> listar(@PathVariable Long id) {
        var atendimento = atendimentos.findById(id).orElseThrow(() -> new IllegalArgumentException("Atendimento não encontrado."));
        return movimentos.findByIdAtendimentoOrDocumentoReferenciaOrderByCriadoEmDesc(id, atendimento.getCodigoAtendimento())
                .stream().filter(m -> "ATENDIMENTO".equals(m.getOrigem()) || m.getIdAtendimento() != null)
                .map(m -> {
                    var response = mapper.toResponse(m);
                    BigDecimal devolvida = movimentos.quantidadeDevolvida(m.getId());
                    response.setQuantidadeDevolvida(devolvida == null ? BigDecimal.ZERO : devolvida);
                    response.setCustoMedioAtual(m.getEstoquePeca().getCustoMedio());
                    return response;
                }).toList();
    }

    @PostMapping
    @Transactional
    public void devolver(@PathVariable Long id, @RequestBody MovimentacaoEstoquePecaRequest request,
                         @RequestAttribute("usuarioLogado") UsuarioResponse ator) {
        var atendimento = atendimentos.findById(id).orElseThrow(() -> new IllegalArgumentException("Atendimento não encontrado."));
        if (request.getIdMovimentacaoOrigem() == null) throw new IllegalArgumentException("Selecione a saída original da peça devolvida.");
        var origem = movimentos.findById(request.getIdMovimentacaoOrigem())
                .orElseThrow(() -> new IllegalArgumentException("Saída original não encontrada."));
        estoque.registrarDevolucaoAtendimento(origem.getEstoquePeca().getId(), request, atendimento);
    }
}
