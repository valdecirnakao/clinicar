package com.clinicar.backend.service;

import com.clinicar.backend.model.HistoricoQuilometragemVeiculo;
import com.clinicar.backend.repository.HistoricoQuilometragemVeiculoRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
public class MediaUsoVeiculoService {

    /*
     * Quantidade máxima de registros de quilometragem utilizados
     * para analisar o padrão recente de uso do veículo.
     */
    private static final int LIMITE_REGISTROS_ANALISE = 8;

    /*
     * Limite máximo considerado plausível de quilômetros rodados por dia.
     *
     * Essa regra evita que erros de digitação, por exemplo:
     * 20.000 km -> 90.000 km em poucos dias,
     * distorçam completamente a média.
     */
    private static final BigDecimal LIMITE_KM_POR_DIA =
            BigDecimal.valueOf(500);

    private final HistoricoQuilometragemVeiculoRepository historicoRepository;

    public MediaUsoVeiculoService(
            HistoricoQuilometragemVeiculoRepository historicoRepository
    ) {
        this.historicoRepository = historicoRepository;
    }

    public MediaUsoVeiculoResultado calcularMediaUsoVeiculo(Long veiculoId) {

        if (veiculoId == null || veiculoId <= 0) {
            throw new IllegalArgumentException(
                    "Veículo é obrigatório para calcular a média de uso."
            );
        }

        List<HistoricoQuilometragemVeiculo> registros =
                historicoRepository.buscarUltimosRegistrosValidos(
                        veiculoId,
                        LIMITE_REGISTROS_ANALISE
                );

        /*
         * São necessários pelo menos dois registros para existir
         * um intervalo de quilometragem e tempo.
         */
        if (registros == null || registros.size() < 2) {
            return resultadoSemMedia(
                    "Histórico insuficiente para calcular média de quilometragem por dia."
            );
        }

        /*
         * Mesmo que o repository já procure somente registros válidos,
         * esta validação adicional protege o cálculo contra dados
         * incompletos ou inconsistentes.
         *
         * Os registros são ordenados do mais antigo para o mais recente,
         * pois o cálculo depende da diferença entre registros consecutivos.
         */
        List<HistoricoQuilometragemVeiculo> ordenados = registros
                .stream()
                .filter(this::registroValido)
                .sorted(
                        Comparator.comparing(
                                HistoricoQuilometragemVeiculo::getDataRegistro
                        )
                )
                .toList();

        if (ordenados.size() < 2) {
            return resultadoSemMedia(
                    "Histórico insuficiente após remover registros inválidos."
            );
        }

        long totalDias = 0;
        long totalKm = 0;

        int intervalosValidos = 0;
        int intervalosIgnorados = 0;

        /*
         * Percorre os registros comparando cada leitura de quilometragem
         * com a leitura imediatamente anterior.
         */
        for (int i = 1; i < ordenados.size(); i++) {

            HistoricoQuilometragemVeiculo anterior =
                    ordenados.get(i - 1);

            HistoricoQuilometragemVeiculo atual =
                    ordenados.get(i);

            LocalDate dataAnterior =
                    anterior.getDataRegistro();

            LocalDate dataAtual =
                    atual.getDataRegistro();

            Integer kmAnterior =
                    anterior.getQuilometragem();

            Integer kmAtual =
                    atual.getQuilometragem();

            long dias =
                    ChronoUnit.DAYS.between(
                            dataAnterior,
                            dataAtual
                    );

            long kmPercorrido =
                    (long) kmAtual - kmAnterior;

            /*
             * Intervalos impossíveis ou excessivamente elevados
             * são descartados do cálculo.
             */
            if (!intervaloValido(dias, kmPercorrido)) {
                intervalosIgnorados++;
                continue;
            }

            totalDias += dias;
            totalKm += kmPercorrido;

            intervalosValidos++;
        }

        /*
         * Caso nenhum intervalo confiável tenha sido encontrado,
         * não existe base segura para gerar uma média.
         */
        if (intervalosValidos == 0
                || totalDias <= 0
                || totalKm <= 0) {

            log.warn(
                    "[MEDIA-USO-VEICULO] Não foi possível calcular média. "
                            + "veiculoId={}, registros={}, "
                            + "intervalosValidos={}, intervalosIgnorados={}",
                    veiculoId,
                    ordenados.size(),
                    intervalosValidos,
                    intervalosIgnorados
            );

            return resultadoSemMedia(
                    "Não foi possível calcular média de uso com os registros disponíveis."
            );
        }

        /*
         * Média ponderada pelo período total:
         *
         * total de quilômetros percorridos
         * ---------------------------------
         * total de dias transcorridos
         *
         * Esta abordagem é mais adequada do que simplesmente calcular
         * a média aritmética das médias individuais dos intervalos.
         */
        BigDecimal mediaKmDia =
                BigDecimal.valueOf(totalKm)
                        .divide(
                                BigDecimal.valueOf(totalDias),
                                2,
                                RoundingMode.HALF_UP
                        );

        String nivelConfianca =
                definirNivelConfianca(
                        intervalosValidos,
                        intervalosIgnorados
                );

        /*
         * Cada intervalo válido utiliza dois registros.
         *
         * Exemplo:
         * 2 registros -> 1 intervalo
         * 3 registros -> 2 intervalos
         * 4 registros -> 3 intervalos
         */
        int quantidadeRegistrosCalculo =
                intervalosValidos + 1;

        String observacao =
                montarObservacao(
                        quantidadeRegistrosCalculo,
                        intervalosValidos,
                        intervalosIgnorados,
                        totalKm,
                        totalDias,
                        mediaKmDia,
                        nivelConfianca
                );

        log.info(
                "[MEDIA-USO-VEICULO] "
                        + "veiculoId={}, registrosAnalisados={}, "
                        + "registrosCalculo={}, intervalosValidos={}, "
                        + "intervalosIgnorados={}, totalKm={}, "
                        + "totalDias={}, mediaKmDia={}, confianca={}",
                veiculoId,
                ordenados.size(),
                quantidadeRegistrosCalculo,
                intervalosValidos,
                intervalosIgnorados,
                totalKm,
                totalDias,
                mediaKmDia,
                nivelConfianca
        );

        return new MediaUsoVeiculoResultado(
                mediaKmDia,
                quantidadeRegistrosCalculo,
                nivelConfianca,
                observacao
        );
    }

    /**
     * Verifica se um registro possui as informações mínimas
     * necessárias para participar do cálculo.
     */
    private boolean registroValido(
            HistoricoQuilometragemVeiculo registro
    ) {

        if (registro == null) {
            return false;
        }

        if (registro.getDataRegistro() == null) {
            return false;
        }

        if (registro.getQuilometragem() == null
                || registro.getQuilometragem() < 0) {

            return false;
        }

        /*
         * Somente registros explicitamente marcados como inválidos
         * são descartados.
         *
         * Caso validoParaCalculo seja null, o registro continua
         * sendo aceito.
         */
        return !Boolean.FALSE.equals(
                registro.getValidoParaCalculo()
        );
    }

    /**
     * Verifica se o intervalo entre dois registros é plausível.
     */
    private boolean intervaloValido(
            long dias,
            long kmPercorrido
    ) {

        /*
         * Duas leituras realizadas no mesmo dia não são utilizadas,
         * pois não permitem calcular uma média diária confiável.
         */
        if (dias <= 0) {
            return false;
        }

        /*
         * A quilometragem deve aumentar.
         *
         * Uma redução pode indicar:
         * - erro de digitação;
         * - troca do hodômetro;
         * - alteração manual do histórico;
         * - inconsistência nos dados.
         */
        if (kmPercorrido <= 0) {
            return false;
        }

        BigDecimal kmPorDia =
                BigDecimal.valueOf(kmPercorrido)
                        .divide(
                                BigDecimal.valueOf(dias),
                                2,
                                RoundingMode.HALF_UP
                        );

        return kmPorDia.compareTo(
                LIMITE_KM_POR_DIA
        ) <= 0;
    }

    /**
     * Determina o grau de confiança da média calculada.
     */
    private String definirNivelConfianca(
            int intervalosValidos,
            int intervalosIgnorados
    ) {

        if (intervalosValidos <= 0) {
            return "BAIXA";
        }

        /*
         * Um ou dois intervalos ainda representam pouco histórico.
         */
        if (intervalosValidos <= 2) {
            return "MEDIA";
        }

        /*
         * Mesmo havendo vários intervalos válidos, uma quantidade
         * elevada de registros inconsistentes reduz a confiança
         * no histórico.
         */
        if (intervalosIgnorados > intervalosValidos) {
            return "MEDIA";
        }

        return "ALTA";
    }

    /**
     * Monta uma descrição textual explicando como a média foi obtida.
     */
    private String montarObservacao(
            int quantidadeRegistrosCalculo,
            int intervalosValidos,
            int intervalosIgnorados,
            long totalKm,
            long totalDias,
            BigDecimal mediaKmDia,
            String nivelConfianca
    ) {

        StringBuilder observacao =
                new StringBuilder();

        observacao
                .append("Média calculada utilizando ")
                .append(quantidadeRegistrosCalculo)
                .append(" registro(s), correspondentes a ")
                .append(intervalosValidos)
                .append(" intervalo(s) válido(s), totalizando ")
                .append(totalKm)
                .append(" km percorridos em ")
                .append(totalDias)
                .append(" dia(s). Média estimada: ")
                .append(mediaKmDia)
                .append(" km/dia. Nível de confiança: ")
                .append(nivelConfianca)
                .append(".");

        if (intervalosIgnorados > 0) {
            observacao
                    .append(" ")
                    .append(intervalosIgnorados)
                    .append(
                            " intervalo(s) foram ignorados por inconsistência nos dados."
                    );
        }

        return observacao.toString();
    }

    /**
     * Retorno padrão utilizado quando ainda não existe histórico
     * suficiente para determinar uma média confiável.
     */
    private MediaUsoVeiculoResultado resultadoSemMedia(
            String observacao
    ) {

        return new MediaUsoVeiculoResultado(
                BigDecimal.ZERO.setScale(
                        2,
                        RoundingMode.HALF_UP
                ),
                0,
                "BAIXA",
                observacao
        );
    }

    @Data
    @AllArgsConstructor
    public static class MediaUsoVeiculoResultado {

        /*
         * Média estimada de quilômetros percorridos por dia.
         */
        private BigDecimal mediaKmDia;

        /*
         * Quantidade de registros utilizados na composição
         * da média.
         */
        private Integer quantidadeRegistrosCalculo;

        /*
         * BAIXA, MEDIA ou ALTA.
         */
        private String nivelConfianca;

        /*
         * Explicação textual sobre o cálculo realizado.
         */
        private String observacao;
    }
}