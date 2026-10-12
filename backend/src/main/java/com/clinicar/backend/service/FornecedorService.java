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

    public boolean cnpjCadastrado(String cnpj, Long idIgnorado) {
        String documento = soDigitos(cnpj);
        if (documento == null || documento.length() != 14) {
            throw new IllegalArgumentException("CNPJ inválido.");
        }
        return fornecedorRepository.findByCnpj(documento)
                .map(fornecedor -> !fornecedor.getId().equals(idIgnorado))
                .orElse(false);
    }

    public Fornecedor criar(FornecedorRequest request) {
        validarEmailUnico(request.getEmail(), null);
        String cnpjNormalizado = soDigitos(request.getCnpj());
        if (cnpjNormalizado == null || cnpjNormalizado.length() != 14) {
            throw new IllegalArgumentException("CNPJ inválido.");
        }
        fornecedorRepository.findByCnpj(cnpjNormalizado).ifPresent(fornecedor -> {
            throw new IllegalArgumentException("CNPJ já cadastrado anteriormente.");
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
        validarEmailUnico(request.getEmail(), id);
        if (cnpjNormalizado == null || cnpjNormalizado.length() != 14) {
            throw new IllegalArgumentException("CNPJ inválido.");
        }
        fornecedorRepository.findByCnpj(cnpjNormalizado)
                .ifPresent(fornecedorEncontrado -> {
                    if (!fornecedorEncontrado.getId().equals(id)) {
                        throw new IllegalArgumentException("CNPJ já cadastrado anteriormente.");
                    }
                });
        preencherDados(fornecedor, request);
        return fornecedorRepository.save(fornecedor);
    }

    private void preencherDados(Fornecedor fornecedor, FornecedorRequest request) {
        if (request.getAtivo() != null) fornecedor.setAtivo(request.getAtivo());
        fornecedor.setCnpj(soDigitos(request.getCnpj()));
        fornecedor.setRazaoSocial(request.getRazaoSocial());
        fornecedor.setNomeFantasia(request.getNomeFantasia());
        fornecedor.setItemFornecido(request.getItemFornecido());
        fornecedor.setTelefone(request.getTelefone());
        fornecedor.setEmail(normalizarEmail(request.getEmail()));
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

    private String normalizarEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(java.util.Locale.ROOT);
    }

    public boolean emailCadastrado(String email, Long idIgnorado) {
        String normalizado = normalizarEmail(email);
        if (normalizado == null || normalizado.length() > 255
                || !normalizado.matches("^[^\\s@]+@[^\\s@.]+(?:\\.[^\\s@.]+)*\\.[^\\s@.]{2,}$")) {
            throw new IllegalArgumentException("Informe um e-mail válido.");
        }
        return fornecedorRepository.emailCadastrado(normalizado, idIgnorado);
    }

    private void validarEmailUnico(String email, Long idIgnorado) {
        if (email != null && !email.isBlank() && emailCadastrado(email, idIgnorado)) {
            throw new IllegalArgumentException("E-mail já cadastrado anteriormente.");
        }
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
