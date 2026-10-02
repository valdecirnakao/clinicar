package com.clinicar.backend.service;

import com.clinicar.backend.dto.HistoricoVeicularResponse;
import com.clinicar.backend.dto.HistoricoVeicularResponse.*;
import org.junit.jupiter.api.Test;
import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.parser.PdfTextExtractor;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class HistoricoVeicularPdfTest {
    @Test void exportaHistoricoCompletoEmVariasPaginasSemPerderConteudo() throws Exception {
        List<Registro> registros = new ArrayList<>();
        for (int i = 0; i < 7; i++) registros.add(new Registro("ATENDIMENTO", (long) i + 1, "ATD-TESTE-" + i,
                LocalDateTime.of(2026, 9, 30, 9, 0).minusDays(i), "ENTREGUE", "ABC1234", "Toyota", "Corolla", "Preto", "2020/2021 Flex",
                true, 10000 + i * 100, 10020 + i * 100, "Cliente relata ruído ao frear.", "Diagnóstico técnico com acentuação. ".repeat(25),
                "Revisão do sistema de freios e troca do filtro de óleo.", "Retornar para revisão em 10.000 km.", new BigDecimal("150"), true,
                List.of(new Item("SERVICO", "Revisão preventiva", BigDecimal.ONE, "serviço", new BigDecimal("100")),
                        new Item("PECA", "Filtro de óleo", new BigDecimal("2"), "UN", new BigDecimal("50")))));
        var relatorio = new HistoricoVeicularResponse(new Cadastro(1L, "XYZ9999", "Toyota", "Yaris", "Branco", "2026 Flex"),
                null, null, "TODOS", LocalDateTime.of(2026, 10, 1, 10, 0), new Resumo(0, 7, 7, new BigDecimal("1050"), 10020), registros);
        byte[] pdf = new HistoricoVeicularPdfService().gerar(relatorio);
        PdfReader reader = new PdfReader(pdf);
        try {
            assertTrue(reader.getNumberOfPages() > 1);
            StringBuilder texto = new StringBuilder(); PdfTextExtractor extractor = new PdfTextExtractor(reader);
            for (int p = 1; p <= reader.getNumberOfPages(); p++) texto.append(extractor.getTextFromPage(p));
            assertTrue(texto.toString().contains("ATD-TESTE-6")); assertTrue(texto.toString().contains("Filtro de óleo"));
            assertTrue(texto.toString().contains("ABC1234")); assertTrue(texto.toString().contains("XYZ9999"));
        } finally { reader.close(); }
        if (Boolean.getBoolean("clinicar.test.exportar-amostra")) {
            Path pasta = Path.of("../tmp/pdfs"); Files.createDirectories(pasta);
            Files.write(pasta.resolve("historico-veicular-amostra.pdf"), pdf);
        }
    }
}
