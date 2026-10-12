package com.clinicar.backend.service;

import com.clinicar.backend.model.Agendamento;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.model.Usuario;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.Image;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.openpdf.text.pdf.PdfPageEventHelper;
import org.openpdf.text.pdf.ColumnText;
import org.openpdf.text.pdf.PdfContentByte;
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
public class OrdemServicoPdfService {
    private static final Color AZUL = new Color(53, 104, 155);
    private static final Color AZUL_CLARO = new Color(238, 246, 255);
    private static final Color BORDA = new Color(208, 226, 242);
    private static final Color CINZA = new Color(80, 103, 124);

    private static final Locale LOCALE_BR = Locale.forLanguageTag("pt-BR");

    private static final DateTimeFormatter DATA_HORA_BR =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public byte[] gerarPdf(Atendimento atendimento) {
        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            Document document = new Document(PageSize.A4, 42, 42, 48, 52);
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);
            writer.setPageEvent(new RodapePagina());

            document.open();

            adicionarCabecalho(document, atendimento);
            adicionarDadosClienteVeiculo(document, atendimento);
            adicionarDadosAtendimento(document, atendimento);
            adicionarDiagnosticoExecucao(document, atendimento);
            adicionarValores(document, atendimento);
            adicionarRodape(document);

            document.close();

            return outputStream.toByteArray();

        } catch (Exception e) {
            throw new IllegalStateException("Erro ao gerar PDF da Ordem de Serviço.", e);
        }
    }

    public String gerarNomeArquivo(Atendimento atendimento) {
        String codigo = atendimento.getCodigoAtendimento() == null
                ? "atendimento"
                : atendimento.getCodigoAtendimento();

        return "ordem-servico-" + codigo + ".pdf";
    }

    private void adicionarCabecalho(
            Document document,
            Atendimento atendimento
    ) throws DocumentException {
        PdfPTable faixa = new PdfPTable(new float[]{1.15f, 2.4f});
        faixa.setWidthPercentage(100);
        faixa.setSpacingAfter(18);
        PdfPCell marca = new PdfPCell();
        marca.setBorder(0);
        marca.setPadding(0);
        marca.setPaddingRight(12);
        try (InputStream recurso = getClass().getResourceAsStream("/img/logo-clinicar.png")) {
            if (recurso == null) throw new IllegalStateException("Logo CliniCar não encontrado no backend.");
            Image logo = Image.getInstance(recurso.readAllBytes());
            logo.scaleToFit(135, 65);
            marca.addElement(logo);
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Não foi possível carregar o logo CliniCar.", e);
        }
        faixa.addCell(marca);
        PdfPCell identificacao = new PdfPCell();
        identificacao.setBorder(0);
        identificacao.setVerticalAlignment(Element.ALIGN_MIDDLE);
        identificacao.setPaddingLeft(12);
        identificacao.setBorderColorLeft(BORDA);
        identificacao.setBorderWidthLeft(1);
        Paragraph titulo = new Paragraph("ORDEM DE SERVIÇO", fonte(FontFactory.HELVETICA_BOLD, 17, AZUL));
        titulo.setSpacingAfter(4);
        identificacao.addElement(titulo);
        identificacao.addElement(new Paragraph("Atendimento executado  |  CliniCar Mecânica Geral",
                fonte(FontFactory.HELVETICA, 9, CINZA)));
        faixa.addCell(identificacao);
        document.add(faixa);

        PdfPTable tabela = criarTabela(2);

        adicionarLinha(tabela, "Código do Atendimento", valor(atendimento.getCodigoAtendimento()));
        adicionarLinha(tabela, "Código do Agendamento", codigoAgendamento(atendimento));
        adicionarLinha(tabela, "Status", valor(atendimento.getStatusAtendimento()));
        adicionarLinha(tabela, "Tipo de Execução", valor(atendimento.getTipoExecucao()));
        adicionarLinha(tabela, "Data de Emissão", formatarData(LocalDateTime.now()));

        document.add(tabela);
        adicionarEspaco(document);
    }

    private void adicionarDadosClienteVeiculo(
            Document document,
            Atendimento atendimento
    ) throws DocumentException {
        adicionarSecao(document, "Dados do Cliente e Veículo");

        PdfPTable tabela = criarTabela(2);

        Usuario cliente = atendimento.getCliente();

        adicionarLinha(tabela, "Cliente", cliente == null ? "—" : valor(cliente.getNome()));
        adicionarLinha(tabela, "CPF", cliente == null ? "—" : formatarCpf(cliente.getCpf()));
        adicionarLinha(tabela, "Telefone", cliente == null ? "—" : valor(cliente.getTelefone()));
        adicionarLinha(tabela, "E-mail", cliente == null ? "—" : valor(cliente.getEmail()));

        adicionarLinha(tabela, "Placa", formatarPlaca(atendimento.placaVeiculoDoAtendimento()));
        adicionarLinha(tabela, "Fabricante", valor(atendimento.fabricanteVeiculoDoAtendimento()));
        adicionarLinha(tabela, "Modelo", valor(atendimento.modeloVeiculoDoAtendimento()));
        adicionarLinha(tabela, "Km Entrada", valor(atendimento.getQuilometragemEntrada()));
        adicionarLinha(tabela, "Km Saída", valor(atendimento.getQuilometragemSaida()));

        document.add(tabela);
        adicionarEspaco(document);
    }

    private void adicionarDadosAtendimento(
            Document document,
            Atendimento atendimento
    ) throws DocumentException {
        PdfPTable tabela = criarTabela(2);
        tabela.setSpacingBefore(10);
        // O titulo pertence a tabela e se repete nas paginas de continuacao.
        PdfPCell cabecalho = criarCelulaSecao("Dados do Atendimento");
        cabecalho.setColspan(2);
        tabela.addCell(cabecalho);
        tabela.setHeaderRows(1);

        adicionarLinha(tabela, "Serviço", nomeServico(atendimento));
        adicionarLinha(tabela, "Categoria", categoriaServico(atendimento));
        adicionarLinha(tabela, "Responsável", nomeResponsavel(atendimento));
        adicionarLinha(tabela, "Fornecedor Terceiro", nomeFornecedor(atendimento));

        adicionarLinha(tabela, "Data de Entrada", formatarData(atendimento.getDataEntrada()));
        adicionarLinha(tabela, "Início Real", formatarData(atendimento.getInicioReal()));
        adicionarLinha(tabela, "Fim Real", formatarData(atendimento.getFimReal()));
        adicionarLinha(tabela, "Data de Entrega", formatarData(atendimento.getDataEntrega()));

        adicionarLinha(
                tabela,
                "Garantia",
                atendimento.getGarantiaDias() == null
                        ? "0 dias"
                        : atendimento.getGarantiaDias() + " dias"
        );

        adicionarLinha(
                tabela,
                "Necessita Retorno",
                Boolean.TRUE.equals(atendimento.getNecessitaRetorno()) ? "Sim" : "Não"
        );

        adicionarLinha(
                tabela,
                "Data de Retorno Sugerida",
                formatarData(atendimento.getDataRetornoSugerida())
        );

        document.add(tabela);
        adicionarEspaco(document);
    }

    private void adicionarDiagnosticoExecucao(
            Document document,
            Atendimento atendimento
    ) throws DocumentException {
        adicionarSecao(document, "Diagnóstico e Execução");

        adicionarTextoLongo(document, "Relato do Cliente", atendimento.getRelatoCliente());
        adicionarTextoLongo(document, "Diagnóstico Técnico", atendimento.getDiagnosticoTecnico());
        adicionarTextoLongo(document, "Serviço Executado", atendimento.getServicoExecutado());
        adicionarTextoLongo(document, "Recomendações ao Cliente", atendimento.getRecomendacoesCliente());
        adicionarTextoLongo(document, "Observações Internas", atendimento.getObservacoesInternas());

        adicionarEspaco(document);
    }

    private void adicionarValores(
            Document document,
            Atendimento atendimento
    ) throws DocumentException {
        adicionarSecao(document, "Valores");

        PdfPTable tabela = criarTabela(2);

        adicionarLinha(tabela, "Mão de Obra", formatarMoeda(atendimento.getValorMaoObra()));
        adicionarLinha(tabela, "Peças", formatarMoeda(atendimento.getValorPecas()));
        adicionarLinha(tabela, "Terceiros", formatarMoeda(atendimento.getValorTerceiros()));
        adicionarLinha(tabela, "Desconto", formatarMoeda(atendimento.getDesconto()));
        adicionarLinhaTotal(tabela, "Valor Total", formatarMoeda(atendimento.getValorTotal()));

        adicionarLinha(
                tabela,
                "Aprovado",
                Boolean.TRUE.equals(atendimento.getAprovado()) ? "Sim" : "Não"
        );

        adicionarLinha(tabela, "Aprovado em", formatarData(atendimento.getAprovadoEm()));

        document.add(tabela);
        adicionarEspaco(document);
    }

    private void adicionarRodape(Document document) throws DocumentException {
        Font font = fonte(FontFactory.HELVETICA_OBLIQUE, 8, CINZA);

        Paragraph p = new Paragraph(
                "Este documento representa a Ordem de Serviço executada no sistema CliniCar.",
                font
        );

        p.setAlignment(Element.ALIGN_CENTER);
        p.setSpacingBefore(8);

        document.add(p);
    }

    private PdfPTable criarTabela(int colunas) throws DocumentException {
        PdfPTable tabela = new PdfPTable(new float[]{1.3f, 2.7f});
        tabela.setWidthPercentage(100);
        tabela.setSpacingBefore(4);
        tabela.setSpacingAfter(6);
        return tabela;
    }

    private void adicionarSecao(
            Document document,
            String texto
    ) throws DocumentException {
        PdfPTable faixa = new PdfPTable(1);
        faixa.setWidthPercentage(100);
        faixa.setSpacingBefore(10);
        faixa.setSpacingAfter(8);
        faixa.addCell(criarCelulaSecao(texto));
        document.add(faixa);
    }

    private PdfPCell criarCelulaSecao(String texto) {
        PdfPCell celula = new PdfPCell(new Phrase(texto.toUpperCase(LOCALE_BR),
                fonte(FontFactory.HELVETICA_BOLD, 10, AZUL)));
        celula.setPadding(9);
        celula.setBackgroundColor(AZUL_CLARO);
        celula.setBorder(0);
        celula.setBorderColorLeft(AZUL);
        celula.setBorderWidthLeft(3);
        return celula;
    }

    private void adicionarLinha(
            PdfPTable tabela,
            String label,
            String valor
    ) {
        Font labelFont = fonte(FontFactory.HELVETICA_BOLD, 8.5f, CINZA);
        Font valueFont = fonte(FontFactory.HELVETICA, 9, Color.BLACK);

        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setPadding(7);
        labelCell.setBackgroundColor(AZUL_CLARO);
        labelCell.setBorderColor(BORDA);

        PdfPCell valueCell = new PdfPCell(
                new Phrase(valor == null || valor.isBlank() ? "—" : valor, valueFont)
        );
        valueCell.setPadding(7);
        valueCell.setBorderColor(BORDA);

        tabela.addCell(labelCell);
        tabela.addCell(valueCell);
    }

    private void adicionarLinhaTotal(PdfPTable tabela, String label, String valor) {
        PdfPCell titulo = new PdfPCell(new Phrase(label,
                fonte(FontFactory.HELVETICA_BOLD, 10, Color.WHITE)));
        PdfPCell total = new PdfPCell(new Phrase(valor,
                fonte(FontFactory.HELVETICA_BOLD, 11, Color.WHITE)));
        for (PdfPCell celula : new PdfPCell[]{titulo, total}) {
            celula.setPadding(10);
            celula.setBackgroundColor(AZUL);
            celula.setBorderColor(AZUL);
            tabela.addCell(celula);
        }
    }

    private void adicionarTextoLongo(
            Document document,
            String titulo,
            String texto
    ) throws DocumentException {
        PdfPTable bloco = new PdfPTable(1);
        bloco.setWidthPercentage(100);
        bloco.setSpacingAfter(7);
        PdfPCell celula = new PdfPCell();
        celula.setPadding(9);
        celula.setBorderColor(BORDA);
        Paragraph cabecalho = new Paragraph(titulo,
                fonte(FontFactory.HELVETICA_BOLD, 9, AZUL));
        cabecalho.setSpacingAfter(4);
        celula.addElement(cabecalho);
        celula.addElement(new Paragraph(valor(texto),
                fonte(FontFactory.HELVETICA, 9, Color.BLACK)));
        bloco.addCell(celula);
        document.add(bloco);
    }

    private void adicionarEspaco(Document document) throws DocumentException {
        // O espaçamento entre blocos é controlado pelas próprias tabelas.
    }

    private Font fonte(String familia, float tamanho, Color cor) {
        return FontFactory.getFont(familia, tamanho, cor);
    }

    private static final class RodapePagina extends PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte canvas = writer.getDirectContent();
            canvas.setColorStroke(BORDA);
            canvas.moveTo(document.left(), 41);
            canvas.lineTo(document.right(), 41);
            canvas.stroke();
            Font font = FontFactory.getFont(FontFactory.HELVETICA, 8, CINZA);
            ColumnText.showTextAligned(canvas, Element.ALIGN_LEFT,
                    new Phrase("CliniCar  |  Mecânica Geral", font), document.left(), 28, 0);
            ColumnText.showTextAligned(canvas, Element.ALIGN_RIGHT,
                    new Phrase("Página " + writer.getPageNumber(), font), document.right(), 28, 0);
        }
    }

    private String codigoAgendamento(Atendimento atendimento) {
        Agendamento agendamento = atendimento.getAgendamento();

        if (agendamento == null) {
            return "—";
        }

        return valor(agendamento.getCodigoAgendamento());
    }

    private String nomeServico(Atendimento atendimento) {
        Servico servico = atendimento.getServico();

        if (servico == null) {
            return "—";
        }

        return valor(servico.getNome());
    }

    private String categoriaServico(Atendimento atendimento) {
        Servico servico = atendimento.getServico();

        if (servico == null) {
            return "—";
        }

        return valor(servico.getCategoria());
    }

    private String nomeResponsavel(Atendimento atendimento) {
        Usuario responsavel = atendimento.getResponsavel();

        if (responsavel == null) {
            return "—";
        }

        return valor(responsavel.getNome());
    }

    private String nomeFornecedor(Atendimento atendimento) {
        Fornecedor fornecedor = atendimento.getFornecedor();

        if (fornecedor == null) {
            return "—";
        }

        return valor(fornecedor.getRazaoSocial());
    }

    private String valor(Object valor) {
        if (valor == null) {
            return "—";
        }

        String texto = valor.toString().trim();

        return texto.isBlank() ? "—" : texto;
    }

    private String formatarData(LocalDateTime data) {
        if (data == null) {
            return "—";
        }

        return data.format(DATA_HORA_BR);
    }

    private String formatarMoeda(BigDecimal valor) {
        BigDecimal numero = valor == null ? BigDecimal.ZERO : valor;

        return NumberFormat
                .getCurrencyInstance(LOCALE_BR)
                .format(numero);
    }

    private String formatarCpf(String cpf) {
        if (cpf == null) {
            return "—";
        }

        String d = cpf.replaceAll("\\D", "");

        if (d.length() != 11) {
            return cpf;
        }

        return d.replaceAll(
                "(\\d{3})(\\d{3})(\\d{3})(\\d{2})",
                "$1.$2.$3-$4"
        );
    }

    private String formatarPlaca(String placa) {
        if (placa == null) {
            return "—";
        }

        String v = placa
                .toUpperCase()
                .replaceAll("[^A-Z0-9]", "");

        if (v.length() == 7 && v.matches("^[A-Z]{3}\\d{4}$")) {
            return v.substring(0, 3) + "-" + v.substring(3);
        }

        return v;
    }
}
