package com.clinicar.backend.service;

import com.clinicar.backend.model.SolicitacaoCorrecaoVeiculo;
import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.repository.SolicitacaoCorrecaoVeiculoRepository;
import com.clinicar.backend.repository.VeiculoRepository;
import com.clinicar.backend.repository.AgendamentoRepository;
import com.clinicar.backend.repository.AtendimentoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CorrecaoVeiculoService {
    private final VeiculoRepository veiculos;
    private final SolicitacaoCorrecaoVeiculoRepository solicitacoes;
    private final VeiculoService veiculoService;
    private final AgendamentoRepository agendamentos;
    private final AtendimentoRepository atendimentos;

    public record DadosSolicitados(String placa, String fabricante, String modelo,
            String anoModeloCombustivel, String justificativa) {}
    public record Decisao(String decisao, String justificativa) {}
    public record Edicao(Long veiculoId, boolean possuiHistorico, SolicitacaoCorrecaoVeiculo pendente,
            SolicitacaoCorrecaoVeiculo ultimaSolicitacao) {}

    @Transactional(readOnly = true)
    public List<Edicao> edicaoDoCliente(Long clienteId) {
        return veiculos.findByIdProprietarioOrderByIdDesc(clienteId).stream()
                .map(v -> new Edicao(v.getId(), veiculoService.possuiHistorico(v.getId()),
                        solicitacoes.findByPendenciaVeiculoId(v.getId()).orElse(null),
                        solicitacoes.findFirstByVeiculoIdAndClienteIdOrderBySolicitadoEmDesc(v.getId(), clienteId).orElse(null))).toList();
    }

    @Transactional
    public SolicitacaoCorrecaoVeiculo solicitar(Long clienteId, Long veiculoId, DadosSolicitados dados) {
        Veiculo veiculo = veiculos.buscarParaExclusao(veiculoId)
                .orElseThrow(() -> erro(HttpStatus.NOT_FOUND, "Veículo não encontrado."));
        if (!Objects.equals(veiculo.getIdProprietario(), clienteId))
            throw erro(HttpStatus.FORBIDDEN, "Este veículo não pertence à sua conta.");
        if (!veiculoService.possuiHistorico(veiculoId))
            throw erro(HttpStatus.CONFLICT, "Este veículo ainda não possui histórico; edite os dados diretamente.");
        if (solicitacoes.findByPendenciaVeiculoId(veiculoId).isPresent())
            throw erro(HttpStatus.CONFLICT, "Já existe uma correção pendente para este veículo.");
        if (dados == null) throw erro(HttpStatus.BAD_REQUEST, "Informe os dados a corrigir.");
        String placa = placa(dados.placa());
        String fabricante = texto(dados.fabricante(), 255, "fabricante");
        String modelo = texto(dados.modelo(), 255, "modelo");
        String ano = texto(dados.anoModeloCombustivel(), 255, "ano-modelo e combustível");
        String justificativa = texto(dados.justificativa(), 1000, "justificativa");
        if (justificativa.length() < 10) throw erro(HttpStatus.BAD_REQUEST, "Descreva a correção em pelo menos 10 caracteres.");
        if (placa.equals(placa(veiculo.getPlaca())) && fabricante.equals(veiculo.getFabricante())
                && modelo.equals(veiculo.getModelo()) && ano.equals(veiculo.getAnoModeloCombustivel()))
            throw erro(HttpStatus.BAD_REQUEST, "Altere ao menos um dado de identificação.");
        if (!placa.equals(placa(veiculo.getPlaca())) && veiculoService.verificarPlacaCadastrada(placa, veiculoId))
            throw erro(HttpStatus.CONFLICT, "Esta placa já está cadastrada em outro veículo.");

        var pedido = new SolicitacaoCorrecaoVeiculo();
        pedido.setVeiculoId(veiculoId); pedido.setClienteId(clienteId); pedido.setPendenciaVeiculoId(veiculoId);
        pedido.setPlacaAnterior(veiculo.getPlaca()); pedido.setFabricanteAnterior(veiculo.getFabricante());
        pedido.setModeloAnterior(veiculo.getModelo()); pedido.setAnoModeloCombustivelAnterior(veiculo.getAnoModeloCombustivel());
        pedido.setPlacaSolicitada(placa); pedido.setFabricanteSolicitado(fabricante);
        pedido.setModeloSolicitado(modelo); pedido.setAnoModeloCombustivelSolicitado(ano);
        pedido.setJustificativa(justificativa); pedido.setStatus("PENDENTE"); pedido.setSolicitadoEm(Instant.now());
        return solicitacoes.saveAndFlush(pedido);
    }

    @Transactional(readOnly = true)
    public Page<SolicitacaoCorrecaoVeiculo> listar(int pagina, int tamanho) {
        if (pagina < 0 || tamanho < 1 || tamanho > 50)
            throw erro(HttpStatus.BAD_REQUEST, "Paginação inválida.");
        return solicitacoes.findByStatusOrderBySolicitadoEmDesc("PENDENTE", PageRequest.of(pagina, tamanho));
    }

    @Transactional
    public SolicitacaoCorrecaoVeiculo decidir(Long id, Long administradorId, Decisao decisao) {
        if (decisao == null || !java.util.Set.of("APROVAR", "RECUSAR").contains(decisao.decisao()))
            throw erro(HttpStatus.BAD_REQUEST, "Selecione aprovar ou recusar.");
        String motivo = texto(decisao.justificativa(), 1000, "justificativa da decisão");
        var pedido = solicitacoes.buscarParaDecisao(id)
                .orElseThrow(() -> erro(HttpStatus.NOT_FOUND, "Solicitação não encontrada."));
        if (!"PENDENTE".equals(pedido.getStatus()))
            throw erro(HttpStatus.CONFLICT, "Esta solicitação já foi analisada.");
        if ("APROVAR".equals(decisao.decisao())) {
            Veiculo atual = veiculos.buscarParaExclusao(pedido.getVeiculoId())
                    .orElseThrow(() -> erro(HttpStatus.CONFLICT, "O veículo não está mais cadastrado."));
            if (!Objects.equals(atual.getIdProprietario(), pedido.getClienteId())
                    || !Objects.equals(atual.getPlaca(), pedido.getPlacaAnterior())
                    || !Objects.equals(atual.getFabricante(), pedido.getFabricanteAnterior())
                    || !Objects.equals(atual.getModelo(), pedido.getModeloAnterior())
                    || !Objects.equals(atual.getAnoModeloCombustivel(), pedido.getAnoModeloCombustivelAnterior()))
                throw erro(HttpStatus.CONFLICT, "Os dados ou o proprietário mudaram desde a solicitação. Recuse-a e peça uma nova correção.");
            var alteracao = new Veiculo();
            alteracao.setPlaca(pedido.getPlacaSolicitada()); alteracao.setFabricante(pedido.getFabricanteSolicitado());
            alteracao.setModelo(pedido.getModeloSolicitado()); alteracao.setAnoModeloCombustivel(pedido.getAnoModeloCombustivelSolicitado());
            alteracao.setCor(atual.getCor()); alteracao.setIdProprietario(atual.getIdProprietario());
            agendamentos.findByVeiculo_IdOrderByDataHoraInicioDesc(atual.getId())
                    .forEach(a -> a.preservarDadosVeiculo());
            atendimentos.findByVeiculo_IdOrderByCriadoEmDesc(atual.getId())
                    .forEach(a -> a.preservarDadosVeiculo());
            veiculoService.atualizar(atual.getId(), alteracao);
            pedido.setStatus("APROVADA");
        } else pedido.setStatus("RECUSADA");
        pedido.setPendenciaVeiculoId(null); pedido.setAdministradorId(administradorId);
        pedido.setMotivoDecisao(motivo); pedido.setDecididoEm(Instant.now());
        return solicitacoes.saveAndFlush(pedido);
    }

    private String placa(String valor) {
        String normal = valor == null ? "" : valor.replaceAll("[^A-Za-z0-9]", "").toUpperCase(java.util.Locale.ROOT);
        if (!normal.matches("[A-Z]{3}[0-9][A-Z0-9][0-9]{2}"))
            throw erro(HttpStatus.BAD_REQUEST, "Informe uma placa válida.");
        return normal;
    }
    private String texto(String valor, int maximo, String campo) {
        String limpo = valor == null ? "" : valor.trim();
        if (limpo.isBlank() || limpo.length() > maximo)
            throw erro(HttpStatus.BAD_REQUEST, "Informe " + campo + " com até " + maximo + " caracteres.");
        return limpo;
    }
    private ResponseStatusException erro(HttpStatus status, String mensagem) {
        return new ResponseStatusException(status, mensagem);
    }
}
