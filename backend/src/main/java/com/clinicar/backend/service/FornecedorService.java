// FornecedorService.java
package com.clinicar.backend.service;

import com.clinicar.backend.dto.FornecedorRequest;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.repository.FornecedorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@Service
@RequiredArgsConstructor
public class FornecedorService {

    private final FornecedorRepository repo;

    public Fornecedor criar(FornecedorRequest req) {
        Fornecedor f = new Fornecedor();
        f.setCnpj(soDigitos(req.getCnpj()));
        f.setRazaoSocial(req.getRazaoSocial());
        f.setNomeFantasia(req.getNomeFantasia());
        f.setItemFornecido(req.getItemFornecido());
        f.setTelefone(req.getTelefone());
        f.setEmail(req.getEmail());
        f.setCep(soDigitos(req.getCep()));
        f.setLogradouro(req.getLogradouro());
        f.setBairro(req.getBairro());
        f.setCidade(req.getCidade());
        f.setEstado(req.getEstado());
        f.setComplementoEndereco(req.getComplementoEndereco());
        f.setNumeroEndereco(req.getNumeroEndereco());

        // fundacao: front manda "dd/MM/yyyy"
        if (req.getFundacao() != null && !req.getFundacao().isBlank()) {
            try {
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                LocalDate data = LocalDate.parse(req.getFundacao(), fmt);
                f.setFundacao(data);
            } catch (DateTimeParseException e) {
                // trate como quiser (400 Bad Request, por exemplo)
                // aqui vou só deixar null
                f.setFundacao(null);
            }
        }

        return repo.save(f);
    }

    private String soDigitos(String v) {
        return v == null ? null : v.replaceAll("\\D", "");
    }
}
