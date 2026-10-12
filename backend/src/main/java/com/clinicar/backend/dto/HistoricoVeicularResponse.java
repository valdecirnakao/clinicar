package com.clinicar.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record HistoricoVeicularResponse(
        Cadastro veiculo, LocalDate inicio, LocalDate fim, String situacao,
        LocalDateTime geradoEm, Resumo resumo, List<Registro> registros) {
    public record Cadastro(Long id, String placa, String fabricante, String modelo, String cor, String anoModeloCombustivel) {}
    public record Resumo(int agendamentos, int atendimentos, int finalizados, BigDecimal valorFinalizados, Integer ultimaQuilometragem) {}
    public record Item(String tipo, String descricao, BigDecimal quantidade, String unidade, BigDecimal valorTotal) {}
    public record Registro(String tipo, Long id, String codigo, LocalDateTime data, String status,
            String placa, String fabricante, String modelo, String cor, String anoModeloCombustivel,
            boolean veiculoPreservado, Integer kmEntrada, Integer kmSaida, String queixa,
            String diagnostico, String execucao, String recomendacoes, BigDecimal valor,
            boolean finalizado, List<Item> itens) {}
}
