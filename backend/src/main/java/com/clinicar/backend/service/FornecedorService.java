package com.clinicar.backend.service;
import com.clinicar.backend.dto.FornecedorRequest;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.repository.FornecedorRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
@Service
public class FornecedorService {
    private final FornecedorRepository fornecedorRepository;
    public FornecedorService(FornecedorRepository fornecedorRepository) {
        this.fornecedorRepository = fornecedorRepository;
    }

    public Fornecedor criar(FornecedorRequest request) {
        String cnpjNormalizado = soDigitos(request.getCnpj());
        if (cnpjNormalizado == null || cnpjNormalizado.length() != 14) {
            throw new IllegalArgumentException("CNPJ inválido.");
        }
        fornecedorRepository.findByCnpj(cnpjNormalizado).ifPresent(fornecedor -> {
            throw new IllegalArgumentException("Já existe um fornecedor cadastrado com este CNPJ.");
        });
        Fornecedor fornecedor = new Fornecedor();
        preencherDados(fornecedor, request);
        return fornecedorRepository.save(fornecedor);
    }

    public Fornecedor atualizar(Long id, FornecedorRequest request) {
        Fornecedor fornecedor = fornecedorRepository
            .findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Fornecedor não encontrado."));
        String cnpjNormalizado = soDigitos(request.getCnpj());
        if (cnpjNormalizado == null || cnpjNormalizado.length() != 14) {
            throw new IllegalArgumentException("CNPJ inválido.");
        }
        fornecedorRepository.findByCnpj(cnpjNormalizado)
                .ifPresent(fornecedorEncontrado -> {
                    if (!fornecedorEncontrado.getId().equals(id)) {
                        throw new IllegalArgumentException("Já existe outro fornecedor cadastrado com este CNPJ.");
                    }
                });
        preencherDados(fornecedor, request);
        return fornecedorRepository.save(fornecedor);
    }

    private void preencherDados(Fornecedor fornecedor, FornecedorRequest request) {
        fornecedor.setCnpj(soDigitos(request.getCnpj()));
        fornecedor.setRazaoSocial(request.getRazaoSocial());
        fornecedor.setNomeFantasia(request.getNomeFantasia());
        fornecedor.setItemFornecido(request.getItemFornecido());
        fornecedor.setTelefone(request.getTelefone());
        fornecedor.setEmail(request.getEmail());
        fornecedor.setFundacao(parseFundacao(request.getFundacao()));
        fornecedor.setCep(soDigitos(request.getCep()));
        fornecedor.setLogradouro(request.getLogradouro());
        fornecedor.setBairro(request.getBairro());
        fornecedor.setCidade(request.getCidade());
        fornecedor.setEstado(request.getEstado());
        fornecedor.setComplementoEndereco(request.getComplementoEndereco());
        fornecedor.setNumeroEndereco(request.getNumeroEndereco());
    }

    private String soDigitos(String valor) {
        return valor == null ? null : valor.replaceAll("\\D", "");
    }

    private LocalDate parseFundacao(String fundacao) {
        if (fundacao == null || fundacao.isBlank()) {
            return null;
        }
        String valor = fundacao.trim();
        try {
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            return LocalDate.parse(valor, fmt);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}