package com.clinicar.backend.mapper;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.model.Usuario;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class UsuarioMapper {

    public UsuarioResponse toResponse(Usuario usuario) {
        if (usuario == null) {
            return null;
        }

        UsuarioResponse response = new UsuarioResponse();

        response.setId(usuario.getId());
        response.setNome(usuario.getNome());
        response.setNome_social(usuario.getNome_social());
        response.setEmail(usuario.getEmail());
        response.setCpf(usuario.getCpf());
        response.setNascimento(usuario.getNascimento());
        response.setTelefone(usuario.getTelefone());
        response.setCep(usuario.getCep());
        response.setLogradouro(usuario.getLogradouro());
        response.setBairro(usuario.getBairro());
        response.setCidade(usuario.getCidade());
        response.setEstado(usuario.getEstado());
        response.setComplemento_endereco(usuario.getComplemento_endereco());
        response.setNumero_endereco(usuario.getNumero_endereco());
        response.setTipo_do_acesso(usuario.getTipo_do_acesso());
        response.setStatus(usuario.getStatus());

        response.setMfaAtivo(usuario.getMfaAtivo());
        response.setMfaTipo(usuario.getMfaTipo());

        return response;
    }

    public List<UsuarioResponse> toResponseList(List<Usuario> usuarios) {
        return usuarios
                .stream()
                .map(this::toResponse)
                .toList();
    }
}