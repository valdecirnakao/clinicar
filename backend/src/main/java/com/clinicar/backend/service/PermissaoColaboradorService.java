package com.clinicar.backend.service;

import com.clinicar.backend.model.PermissaoColaborador;
import com.clinicar.backend.repository.PermissaoColaboradorRepository;
import com.clinicar.backend.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PermissaoColaboradorService {
    private final PermissaoColaboradorRepository repositorio;
    private final UsuarioRepository usuarios;
    public PermissaoColaboradorService(PermissaoColaboradorRepository repositorio, UsuarioRepository usuarios) {
        this.repositorio = repositorio; this.usuarios = usuarios;
    }
    public PermissaoColaborador consultar(Long id) {
        validarColaborador(id);
        return repositorio.findById(id).orElseGet(() -> { var p = new PermissaoColaborador(); p.setUsuarioId(id); return p; });
    }
    @Transactional
    public PermissaoColaborador salvar(Long id, boolean mecanica, boolean estoque) {
        validarColaborador(id);
        var p = repositorio.findById(id).orElseGet(PermissaoColaborador::new);
        p.setUsuarioId(id); p.setPodeMecanica(mecanica); p.setPodeEstoque(estoque);
        return repositorio.saveAndFlush(p);
    }
    public boolean podeMecanica(Long id) { return id != null && repositorio.findById(id).map(p -> Boolean.TRUE.equals(p.getPodeMecanica())).orElse(true); }
    public boolean podeEstoque(Long id) { return id != null && repositorio.findById(id).map(p -> Boolean.TRUE.equals(p.getPodeEstoque())).orElse(true); }
    private void validarColaborador(Long id) {
        var u = usuarios.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Colaborador não encontrado."));
        if (!"COLABORADOR".equalsIgnoreCase(u.getTipo_do_acesso()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione um usuário colaborador.");
    }
}
