// FornecedorService.java
package com.clinicar.backend.service;

import com.clinicar.backend.dto.UsuarioRequest;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository repo;

    public Usuario criar(UsuarioRequest req) {
        Usuario u = new Usuario();
        u.setCpf(soDigitos(req.getCpf()));
        u.setNome(req.getNome());
        u.setNome_social(req.getNome_social());
        u.setSenha(req.getSenha());
        u.setTelefone(req.getTelefone());
        u.setWhatsappapikey(req.getWhatsappapikey());
        u.setEmail(req.getEmail());
        u.setCep(soDigitos(req.getCep()));
        u.setLogradouro(req.getLogradouro());
        u.setBairro(req.getBairro());
        u.setCidade(req.getCidade());
        u.setEstado(req.getEstado());
        u.setComplemento_endereco(req.getComplemento_endereco());
        u.setNumero_endereco(req.getNumero_endereco());
        u.setTipo_do_acesso(req.getTipo_do_acesso());

        // fundacao: front manda "dd/MM/yyyy"
        if (req.getNascimento() != null && !req.getNascimento().isBlank()) {
            try {
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                LocalDate data = LocalDate.parse(req.getNascimento(), fmt);
                u.setNascimento(data);
            } catch (DateTimeParseException e) {
                // trate como quiser (400 Bad Request, por exemplo)
                // aqui vou só deixar null
                u.setNascimento(null);
            }
        }

        return repo.save(u);
    }

    private String soDigitos(String v) {
        return v == null ? null : v.replaceAll("\\D", "");
    }
}
