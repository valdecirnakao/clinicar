package com.clinicar.backend.service;

import com.clinicar.backend.dto.HistoricoVeicularResponse;
import com.clinicar.backend.dto.HistoricoVeicularResponse.Registro;
import org.openpdf.text.*;
import org.openpdf.text.pdf.*;
import org.springframework.stereotype.Service;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class HistoricoVeicularPdfService {
    private static final Color AZUL = new Color(53, 104, 155);
    private static final Color FUNDO = new Color(238, 246, 255);
    private static final Color BORDA = new Color(208, 226, 242);
    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public byte[] gerar(HistoricoVeicularResponse relatorio) {
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 42, 42, 42, 46);
            PdfWriter writer = PdfWriter.getInstance(document, output);
            writer.setPageEvent(new PdfPageEventHelper() {
                @Override public void onEndPage(PdfWriter w, Document d) {
                    ColumnText.showTextAligned(w.getDirectContent(), Element.ALIGN_CENTER,
                            new Phrase("CliniCar | Histórico veicular | Página " + w.getPageNumber(), fonte(8, false)),
                            (d.left() + d.right()) / 2, 24, 0);
                }
            });
            document.open();
            PdfPTable cabecalho = new PdfPTable(new float[]{1, 2.3f});
            cabecalho.setWidthPercentage(100);
            PdfPCell marca = new PdfPCell(); marca.setBorder(0);
            try (InputStream recurso = getClass().getResourceAsStream("/img/logo-clinicar.png")) {
                if (recurso != null) {
                    Image logo = Image.getInstance(recurso.readAllBytes()); logo.scaleToFit(128, 60); marca.addElement(logo);
                }
            }
            cabecalho.addCell(marca);
            PdfPCell titulo = new PdfPCell(); titulo.setBorder(0);
            titulo.addElement(new Paragraph("HISTÓRICO VEICULAR", fonte(17, true)));
            titulo.addElement(new Paragraph("Gerado em " + data(relatorio.geradoEm()), fonte(9, false)));
            cabecalho.addCell(titulo); cabecalho.setSpacingAfter(14); document.add(cabecalho);
            var v = relatorio.veiculo();
            PdfPTable cadastro = tabela("Cadastro atual do veículo");
            linha(cadastro, "Placa / identificação", texto(v.placa()) + " | " + texto(v.fabricante()) + " " + texto(v.modelo()));
            linha(cadastro, "Cor / ano / combustível", texto(v.cor()) + " | " + texto(v.anoModeloCombustivel()));
            linha(cadastro, "Período", (relatorio.inicio() == null ? "Sem limite inicial" : relatorio.inicio().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                    + " a " + (relatorio.fim() == null ? "Sem limite final" : relatorio.fim().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
            linha(cadastro, "Situação", rotulo(relatorio.situacao()));
            document.add(cadastro);
            PdfPTable resumo = tabela("Resumo do período");
            linha(resumo, "Agendamentos / atendimentos", relatorio.resumo().agendamentos() + " / " + relatorio.resumo().atendimentos());
            linha(resumo, "Atendimentos finalizados", String.valueOf(relatorio.resumo().finalizados()));
            linha(resumo, "Total dos finalizados", moeda(relatorio.resumo().valorFinalizados()));
            linha(resumo, "Última quilometragem registrada", relatorio.resumo().ultimaQuilometragem() == null ? "Não informada" : relatorio.resumo().ultimaQuilometragem() + " km");
            document.add(resumo);
            document.add(new Paragraph("O total considera apenas atendimentos concluídos ou entregues. Agendamentos têm valores estimados. "
                    + "As datas correspondem ao horário agendado ou à entrada do atendimento. Os nomes dos serviços e peças seguem os cadastros disponíveis na consulta.", fonte(9, false)));
            if (relatorio.registros().isEmpty()) document.add(new Paragraph("Nenhum registro encontrado para os filtros selecionados.", fonte(11, false)));
            for (Registro r : relatorio.registros()) {
                PdfPTable registro = tabela(rotulo(r.tipo()) + " | " + r.codigo());
                linha(registro, "Data / situação", data(r.data()) + " | " + rotulo(r.status()));
                linha(registro, "Veículo registrado", texto(r.placa()) + " | " + texto(r.fabricante()) + " " + texto(r.modelo()));
                linha(registro, "Cor / ano / combustível", texto(r.cor()) + " | " + texto(r.anoModeloCombustivel()));
                if (!r.veiculoPreservado()) linha(registro, "Origem dos dados", "Cadastro disponível. Este registro não possui dados históricos preservados.");
                linha(registro, "Quilometragem", "Entrada: " + texto(r.kmEntrada()) + " | Saída: " + texto(r.kmSaida()));
                if (r.queixa() != null) linha(registro, "Relato do cliente", r.queixa());
                if (r.diagnostico() != null) linha(registro, "Diagnóstico", r.diagnostico());
                if (r.execucao() != null) linha(registro, "Serviço realizado", r.execucao());
                if (r.recomendacoes() != null) linha(registro, "Recomendações", r.recomendacoes());
                for (var i : r.itens()) linha(registro, "PECA".equals(i.tipo()) ? "Peça registrada" : "Serviço registrado",
                        texto(i.descricao()) + " | Qtd.: " + texto(i.quantidade()) + " " + texto(i.unidade()) + " | " + moeda(i.valorTotal()));
                linha(registro, "AGENDAMENTO".equals(r.tipo()) ? "Valor estimado" : "Valor do atendimento", moeda(r.valor()));
                document.add(registro);
            }
document.close(); return output.toByteArray();
        } catch (Exception e) { throw new IllegalStateException("Não foi possível gerar o relatório de histórico veicular.", e); }
    }
    private static Font fonte(int tamanho, boolean negrito) { return FontFactory.getFont(FontFactory.HELVETICA, tamanho, negrito ? Font.BOLD : Font.NORMAL, AZUL); }
    private static PdfPTable tabela(String titulo) {
        PdfPTable t = new PdfPTable(new float[]{1, 2.5f}); t.setWidthPercentage(100); t.setSpacingBefore(14); t.setSpacingAfter(6);
        t.setSplitLate(false);
        PdfPCell c = new PdfPCell(new Phrase(titulo, fonte(11, true))); c.setColspan(2); c.setBackgroundColor(FUNDO);
        c.setPadding(8); c.setBorderColor(BORDA); t.addCell(c); t.setHeaderRows(1); return t;
    }
    private static void linha(PdfPTable tabela, String label, String valor) {
        for (int coluna = 0; coluna < 2; coluna++) {
            PdfPCell c = new PdfPCell(new Phrase(coluna == 0 ? label : texto(valor), fonte(9, coluna == 0)));
            c.setPadding(6); c.setBorderColor(BORDA); tabela.addCell(c);
        }
    }
    private static String texto(Object valor) { return valor == null || valor.toString().isBlank() ? "Não informado" : valor.toString(); }
    private static String data(LocalDateTime valor) { return valor == null ? "Não informada" : valor.format(DATA); }
    private static String moeda(BigDecimal valor) { return valor == null ? "Não informado" : NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR")).format(valor); }
    private static String rotulo(String valor) {
        return switch (valor) {
            case "TODOS" -> "Todas"; case "FINALIZADOS" -> "Finalizados"; case "EM_ABERTO" -> "Em aberto";
            case "CANCELADOS", "CANCELADO" -> "Cancelado"; case "CONCLUIDO" -> "Concluído"; case "ENTREGUE" -> "Entregue";
            case "AGENDAMENTO" -> "Agendamento"; case "ATENDIMENTO" -> "Atendimento";
            default -> valor.replace('_', ' ');
        };
    }
}
