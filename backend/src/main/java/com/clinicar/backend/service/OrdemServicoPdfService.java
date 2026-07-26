package com.clinicar.backend.service;

import com.clinicar.backend.model.Agendamento;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.model.Veiculo;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class OrdemServicoPdfService {

    private static final Locale LOCALE_BR = Locale.forLanguageTag("pt-BR");

    private static final DateTimeFormatter DATA_HORA_BR =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public byte[] gerarPdf(Atendimento atendimento) {
        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, outputStream);

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
        Font tituloFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
        Font subtituloFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

        Paragraph titulo = new Paragraph("CliniCar - Ordem de Serviço Executada", tituloFont);
        titulo.setAlignment(Element.ALIGN_CENTER);
        document.add(titulo);

        Paragraph subtitulo = new Paragraph(
                "Documento gerado automaticamente pelo sistema CliniCar",
                subtituloFont
        );
        subtitulo.setAlignment(Element.ALIGN_CENTER);
        subtitulo.setSpacingAfter(12);
        document.add(subtitulo);

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
        Veiculo veiculo = atendimento.getVeiculo();

        adicionarLinha(tabela, "Cliente", cliente == null ? "—" : valor(cliente.getNome()));
        adicionarLinha(tabela, "CPF", cliente == null ? "—" : formatarCpf(cliente.getCpf()));
        adicionarLinha(tabela, "Telefone", cliente == null ? "—" : valor(cliente.getTelefone()));
        adicionarLinha(tabela, "E-mail", cliente == null ? "—" : valor(cliente.getEmail()));

        adicionarLinha(tabela, "Placa", veiculo == null ? "—" : formatarPlaca(veiculo.getPlaca()));
        adicionarLinha(tabela, "Fabricante", veiculo == null ? "—" : valor(veiculo.getFabricante()));
        adicionarLinha(tabela, "Modelo", veiculo == null ? "—" : valor(veiculo.getModelo()));
        adicionarLinha(tabela, "Km Entrada", valor(atendimento.getQuilometragemEntrada()));
        adicionarLinha(tabela, "Km Saída", valor(atendimento.getQuilometragemSaida()));

        document.add(tabela);
        adicionarEspaco(document);
    }

    private void adicionarDadosAtendimento(
            Document document,
            Atendimento atendimento
    ) throws DocumentException {
        adicionarSecao(document, "Dados do Atendimento");

        PdfPTable tabela = criarTabela(2);

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
        adicionarLinha(tabela, "Valor Total", formatarMoeda(atendimento.getValorTotal()));

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
        Font font = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 9);

        Paragraph p = new Paragraph(
                "Este documento representa a Ordem de Serviço executada no sistema CliniCar.",
                font
        );

        p.setAlignment(Element.ALIGN_CENTER);
        p.setSpacingBefore(12);

        document.add(p);
    }

    private PdfPTable criarTabela(int colunas) {
        PdfPTable tabela = new PdfPTable(colunas);
        tabela.setWidthPercentage(100);
        tabela.setSpacingBefore(4);
        tabela.setSpacingAfter(4);
        return tabela;
    }

    private void adicionarSecao(
            Document document,
            String texto
    ) throws DocumentException {
        Font font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13);

        Paragraph p = new Paragraph(texto, font);
        p.setSpacingBefore(8);
        p.setSpacingAfter(6);

        document.add(p);
    }

    private void adicionarLinha(
            PdfPTable tabela,
            String label,
            String valor
    ) {
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setPadding(6);
        labelCell.setBackgroundColor(new Color(238, 246, 255));

        PdfPCell valueCell = new PdfPCell(
                new Phrase(valor == null || valor.isBlank() ? "—" : valor, valueFont)
        );
        valueCell.setPadding(6);

        tabela.addCell(labelCell);
        tabela.addCell(valueCell);
    }

    private void adicionarTextoLongo(
            Document document,
            String titulo,
            String texto
    ) throws DocumentException {
        Font tituloFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
        Font textoFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

        Paragraph tituloParagrafo = new Paragraph(titulo + ":", tituloFont);
        tituloParagrafo.setSpacingBefore(6);
        document.add(tituloParagrafo);

        Paragraph textoParagrafo = new Paragraph(valor(texto), textoFont);
        textoParagrafo.setSpacingAfter(4);
        document.add(textoParagrafo);
    }

    private void adicionarEspaco(Document document) throws DocumentException {
        document.add(new Paragraph(" "));
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