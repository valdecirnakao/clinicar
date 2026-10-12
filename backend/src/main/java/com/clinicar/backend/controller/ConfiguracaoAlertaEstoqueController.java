package com.clinicar.backend.controller;

import com.clinicar.backend.model.ConfiguracaoAlertaEstoque;
import com.clinicar.backend.service.ConfiguracaoAlertaEstoqueService;
import com.clinicar.backend.service.ProcessamentoAlertaEstoqueService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/configuracao-alerta-estoque")
public class ConfiguracaoAlertaEstoqueController {
    private final ConfiguracaoAlertaEstoqueService configuracoes;
    private final ProcessamentoAlertaEstoqueService processamento;
    private final boolean whatsappHabilitado;
    public ConfiguracaoAlertaEstoqueController(ConfiguracaoAlertaEstoqueService configuracoes,
            ProcessamentoAlertaEstoqueService processamento, @Value("${clinicar.whatsapp.enabled:false}") boolean whatsappHabilitado) {
        this.configuracoes = configuracoes; this.processamento = processamento; this.whatsappHabilitado = whatsappHabilitado;
    }
    public record ConfiguracaoResponse(Long versao, Boolean ativo, Long idResponsavel, String nomeResponsavel,
            String telefoneAdministrador, Integer reenviarAlertaAposHoras) {
        public static ConfiguracaoResponse de(ConfiguracaoAlertaEstoque c) {
            return new ConfiguracaoResponse(c.getVersao(), c.getAtivo(), c.getIdResponsavel(), c.getNomeResponsavel(),
                    c.getTelefoneAdministrador(), c.getReenviarAlertaAposHoras());
        }
    }
    public record ConfiguracaoRequest(Long versao, Boolean ativo, Long idResponsavel, Integer reenviarAlertaAposHoras) {}
    public record Consulta(ConfiguracaoResponse configuracao, boolean whatsappHabilitado) {}
    @GetMapping public Consulta consultar() { return new Consulta(ConfiguracaoResponse.de(configuracoes.consultar()), whatsappHabilitado); }
    @PutMapping public ConfiguracaoResponse salvar(@RequestBody ConfiguracaoRequest request) {
        var entrada = new ConfiguracaoAlertaEstoque();
        entrada.setVersao(request.versao()); entrada.setAtivo(request.ativo()); entrada.setIdResponsavel(request.idResponsavel());
        entrada.setReenviarAlertaAposHoras(request.reenviarAlertaAposHoras());
        return ConfiguracaoResponse.de(configuracoes.salvar(entrada));
    }
    @PostMapping("/reenviar-pendentes") public ProcessamentoAlertaEstoqueService.Resultado reenviar() { return processamento.processar(true); }
}
