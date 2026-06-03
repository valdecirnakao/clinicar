package com.clinicar.backend.service;

import com.clinicar.backend.dto.FornecimentoPecasRequest;
import com.clinicar.backend.model.FornecimentoPecas;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.Peca;
import com.clinicar.backend.repository.FornecimentoPecasRepository;
import com.clinicar.backend.repository.FornecedorRepository;
import com.clinicar.backend.repository.PecaRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.NoSuchElementException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FornecimentoPecasService {

    private final FornecimentoPecasRepository repo;
    private final FornecedorRepository fornecedorRepository;
    private final PecaRepository pecaRepository;

    // CREATE
    public FornecimentoPecas criar(FornecimentoPecasRequest req) {

        Fornecedor fornecedor = fornecedorRepository
                .findById(req.getIdFornecedor())
                .orElseThrow(() ->
                    new NoSuchElementException("Fornecedor não encontrado"));

        Peca peca = pecaRepository
                .findById(req.getIdPeca())
                .orElseThrow(() ->
                    new NoSuchElementException("Peça não encontrada"));

        FornecimentoPecas f = new FornecimentoPecas();

        preencherDados(f, req, fornecedor, peca);

        return repo.save(f);
    }

    // READ - LISTAR TODOS
    public List<FornecimentoPecas> listarTodos() {
        return repo.findAll();
    }

    // READ - POR ID
    public FornecimentoPecas buscarPorId(Long id) {
        return repo.findById(id).orElse(null);
    }

    // UPDATE
// UPDATE
public FornecimentoPecas atualizar(
        Long id,
        FornecimentoPecasRequest req) {

    FornecimentoPecas existente = repo.findById(id)
                .orElseThrow(() ->
                    new NoSuchElementException(
                        "Fornecimento não encontrado. Id: " + id));

    Fornecedor fornecedor = fornecedorRepository
            .findById(req.getIdFornecedor())
                .orElseThrow(() ->
                    new NoSuchElementException(
                        "Fornecedor não encontrado. Id: "
                            + req.getIdFornecedor()));

    Peca peca = pecaRepository
            .findById(req.getIdPeca())
                .orElseThrow(() ->
                    new NoSuchElementException(
                        "Peça não encontrada. Id: "
                            + req.getIdPeca()));

    preencherDados(existente, req, fornecedor, peca);

    return repo.save(existente);
}

    // DELETE
    public boolean remover(Long id) {

        if (!repo.existsById(id)) {
            return false;
        }

        repo.deleteById(id);

        return true;
    }

    // MÉTODO AUXILIAR
    private void preencherDados(
            FornecimentoPecas f,
            FornecimentoPecasRequest req,
            Fornecedor fornecedor,
            Peca peca) {

        f.setFornecedor(fornecedor);

        f.setPeca(peca);

        f.setValorCusto(
                converterValorCusto(req.getValorCusto())
        );

        f.setPrazoEntregaDias(
                converterInteger(req.getPrazoEntregaDias())
        );

        f.setQuantidadeMinima(
                converterInteger(req.getQuantidadeMinima())
        );

        f.setAtivo(
                converterBoolean(req.getAtivo())
        );

        f.setDataCadastro(
                converterData(req.getDataCadastro())
        );
    }

    // CONVERSÃO BIGDECIMAL
    private BigDecimal converterValorCusto(String valor) {
        if (valor == null || valor.isBlank()) {
            return BigDecimal.ZERO;
        }

        valor = valor.trim().replace("R$", "").replace(" ", "");
        // brasileiro
        if (valor.matches(".*\\d+,\\d+.*")) {
            valor = valor.replace(".", "");
            valor = valor.replace(",", ".");
        }
        try {
            return new BigDecimal(valor);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(
                "Valor de custo inválido: " + valor
            );
        }
    }

    // CONVERSÃO INTEGER
    private Integer converterInteger(String valor) {

        if (valor == null || valor.isBlank()) {
            return 0;
        }

        valor = valor.trim().replaceAll("\\D", "");

        if (valor.isBlank()) {
            return 0;
        }

        return Integer.parseInt(valor);
    }

    // CONVERSÃO BOOLEAN
    private Boolean converterBoolean(String valor) {

        if (valor == null || valor.isBlank()) {
            return false;
        }

        valor = valor.trim().toLowerCase();

        return valor.equals("true")
                || valor.equals("sim")
                || valor.equals("ativo")
                || valor.equals("1");
    }

    // CONVERSÃO DATA
    private LocalDate converterData(String data) {

        if (data == null || data.isBlank()) {
            return LocalDate.now();
        }

        try {

            data = data.trim();

            // yyyy-MM-dd
            if (data.contains("-")) {
                return LocalDate.parse(data);
            }

            // dd/MM/yyyy
            DateTimeFormatter formatter =
                    DateTimeFormatter.ofPattern("dd/MM/yyyy");

            return LocalDate.parse(data, formatter);

        } catch (Exception e) {

            throw new IllegalArgumentException(
                "Data inválida: " + data
            );
        }
    }
}