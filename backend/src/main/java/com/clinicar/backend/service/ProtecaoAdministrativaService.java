package com.clinicar.backend.service;

import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProtecaoAdministrativaService {
    private final UsuarioRepository usuarios;

    /** Ordem estável de bloqueio impede duas alterações simultâneas de removerem os últimos acessos. */
    public List<Usuario> bloquearEValidarAdministrador(Long administradorId) {
        var administradores = usuarios.bloquearAdministradores();
        boolean autorizado = administradores.stream().anyMatch(u -> u.getId().equals(administradorId)
                && "ATIVO".equalsIgnoreCase(u.getStatus()));
        if (!autorizado) throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Somente administradores ativos podem alterar usuários.");
        return administradores;
    }

    public static String motivoBloqueio(Usuario usuario, Long administradorId, List<Usuario> usuarios) {
        if (usuario.getId().equals(administradorId)) {
            return "Você não pode inativar seu próprio usuário. Solicite a outro administrador a inativação da sua conta.";
        }
        if ("ADMINISTRADOR".equalsIgnoreCase(usuario.getTipo_do_acesso())
                && usuarios.stream().noneMatch(u -> !u.getId().equals(usuario.getId()) && aptoParaAcesso(u))) {
            return "Não é possível inativar ou remover o perfil do último administrador com acesso configurado. "
                    + "Mantenha outro administrador ativo, com senha e autenticação em duas etapas configuradas.";
        }
        return null;
    }

    public static boolean aptoParaAcesso(Usuario usuario) {
        return "ADMINISTRADOR".equalsIgnoreCase(usuario.getTipo_do_acesso())
                && "ATIVO".equalsIgnoreCase(usuario.getStatus())
                && usuario.getSenha() != null && !usuario.getSenha().isBlank()
                && Boolean.TRUE.equals(usuario.getMfaAtivo())
                && "TOTP".equalsIgnoreCase(usuario.getMfaTipo())
                && usuario.getMfaSecret() != null && !usuario.getMfaSecret().isBlank();
    }

    public void validarAlteracao(Usuario usuario, String status, String perfil, Long administradorId, List<Usuario> administradores) {
        if ("INATIVO".equalsIgnoreCase(status)) {
            String motivo = motivoBloqueio(usuario, administradorId, administradores);
            if (motivo != null) throw new ResponseStatusException(HttpStatus.CONFLICT, motivo);
        }
        if ("ADMINISTRADOR".equalsIgnoreCase(usuario.getTipo_do_acesso())
                && !"ADMINISTRADOR".equalsIgnoreCase(perfil)
                && administradores.stream().noneMatch(u -> !u.getId().equals(usuario.getId()) && aptoParaAcesso(u))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Não é possível remover o perfil do último administrador com acesso configurado. "
                    + "Configure outro administrador ativo antes de alterar este perfil.");
        }
    }
}
