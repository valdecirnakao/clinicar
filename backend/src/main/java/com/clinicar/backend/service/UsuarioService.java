package com.clinicar.backend.service;

import com.clinicar.backend.dto.UsuarioRequest;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository repo;
    private final PasswordEncoder passwordEncoder;

    public Usuario criar(UsuarioRequest req) {
        Usuario u = new Usuario();

        u.setCpf(soDigitos(req.getCpf()));
        u.setNome(req.getNome());
        u.setNome_social(req.getNome_social());
        u.setTelefone(req.getTelefone());
        u.setEmail(req.getEmail());
        u.setCep(soDigitos(req.getCep()));
        u.setLogradouro(req.getLogradouro());
        u.setBairro(req.getBairro());
        u.setCidade(req.getCidade());
        u.setEstado(req.getEstado());
        u.setComplemento_endereco(req.getComplemento_endereco());
        u.setNumero_endereco(req.getNumero_endereco());
        u.setTipo_do_acesso(req.getTipo_do_acesso());
        u.setStatus(req.getStatus());

        if (req.getNascimento() != null && !req.getNascimento().isBlank()) {
            try {
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                LocalDate data = LocalDate.parse(req.getNascimento(), fmt);
                u.setNascimento(data);
            } catch (DateTimeParseException e) {
                u.setNascimento(null);
            }
        }

        if (u.getStatus() == null || u.getStatus().isBlank()) {
            u.setStatus("ATIVO");
        }

        if (req.getSenha() != null && !req.getSenha().isBlank()) {
            u.setSenha(passwordEncoder.encode(req.getSenha()));
        }

        return repo.save(u);
    }

    public Optional<Usuario> autenticar(String email, String senhaDigitada) {
        if (email == null || email.isBlank() || senhaDigitada == null || senhaDigitada.isBlank()) {
            return Optional.empty();
        }

        Optional<Usuario> usuarioOpt = repo.findByEmail(email.trim());

        if (usuarioOpt.isEmpty()) {
            return Optional.empty();
        }

        Usuario usuario = usuarioOpt.get();
        String senhaSalva = usuario.getSenha();

        boolean senhaValida;

        if (senhaEstaCriptografadaComBCrypt(senhaSalva)) {
            senhaValida = passwordEncoder.matches(senhaDigitada, senhaSalva);
        } else {
            /*
             * Compatibilidade temporária com usuários antigos
             * que ainda estão com senha em texto puro no banco.
             */
            senhaValida = senhaDigitada.equals(senhaSalva);

            /*
             * Se a senha antiga em texto puro estiver correta,
             * converte automaticamente para BCrypt.
             */
            if (senhaValida) {
                usuario.setSenha(passwordEncoder.encode(senhaDigitada));
                repo.save(usuario);
            }
        }

        if (!senhaValida) {
            return Optional.empty();
        }

        return Optional.of(usuario);
    }

    private boolean senhaEstaCriptografadaComBCrypt(String senhaSalva) {
        return senhaSalva != null &&
                (
                        senhaSalva.startsWith("$2a$") ||
                        senhaSalva.startsWith("$2b$") ||
                        senhaSalva.startsWith("$2y$")
                );
    }

    private String soDigitos(String v) {
        return v == null ? null : v.replaceAll("\\D", "");
    }
}