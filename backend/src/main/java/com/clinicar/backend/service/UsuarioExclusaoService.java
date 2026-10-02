package com.clinicar.backend.service;

import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.model.AuditoriaExclusaoUsuario;
import com.clinicar.backend.repository.AuditoriaExclusaoUsuarioRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UsuarioExclusaoService {
    private final EntityManager entityManager;
    private final AuditoriaExclusaoUsuarioRepository auditoriaRepository;
    private final ProtecaoAdministrativaService protecaoAdministrativa;

    // Uma consulta para toda a listagem; inclui referências históricas sem chave estrangeira.
    private static final String VINCULOS = """
        SELECT administrador_inicial_id AS usuario_id FROM configuracao_sistema
        UNION SELECT usuario_id FROM token_ativacao_usuario
        UNION SELECT usuario_id FROM mfa_challenge
        UNION SELECT usuario_id FROM auth_session
        UNION SELECT usuario_id FROM password_reset_token
        UNION SELECT id_proprietario FROM veiculo
        UNION SELECT id_usuario FROM movimentacao_estoque_peca
        UNION SELECT id_cliente FROM agendamento
        UNION SELECT id_responsavel FROM agendamento
        UNION SELECT id_cliente FROM atendimento
        UNION SELECT id_responsavel FROM atendimento
        UNION SELECT id_responsavel FROM atendimento_servico_executado
        UNION SELECT id_cliente FROM previsao_manutencao_veiculo
        UNION SELECT proprietario_id FROM envio_alerta_manutencao
        UNION SELECT usuario_id FROM auditoria_reset_mfa
        UNION SELECT administrador_id FROM auditoria_reset_mfa
        UNION SELECT usuario_id FROM auditoria_exclusao_usuario
        UNION SELECT administrador_id FROM auditoria_exclusao_usuario
        UNION SELECT usuario_id FROM solicitacao_acesso_usuario
        UNION SELECT administrador_id FROM solicitacao_acesso_usuario
        """;

    @Transactional(readOnly = true)
    public Set<Long> usuariosComVinculos() {
        Set<Long> ids = new HashSet<>();
        for (Object id : entityManager.createNativeQuery(VINCULOS).getResultList()) {
            if (id instanceof Number numero) ids.add(numero.longValue());
        }
        return ids;
    }

    public boolean podeExcluir(Usuario usuario, Long solicitanteId, Set<Long> vinculados) {
        return usuario.getId() != null && !usuario.getId().equals(solicitanteId)
                && !vinculados.contains(usuario.getId())
                && !Boolean.TRUE.equals(usuario.getMfaAtivo())
                && (usuario.getMfaSecret() == null || usuario.getMfaSecret().isBlank());
    }

    @Transactional
    public void excluir(Long id, Long administradorId, String justificativa) {
        String motivo = justificativa == null ? "" : justificativa.strip();
        if (motivo.length() < 10 || motivo.length() > 1000) {
            throw new IllegalArgumentException("Informe uma justificativa de 10 a 1000 caracteres para excluir o usuário.");
        }
        protecaoAdministrativa.bloquearEValidarAdministrador(administradorId);
        Usuario administrador = entityManager.find(Usuario.class, administradorId, LockModeType.PESSIMISTIC_WRITE);
        if (administrador == null || !"ATIVO".equalsIgnoreCase(administrador.getStatus())
                || !"ADMINISTRADOR".equalsIgnoreCase(administrador.getTipo_do_acesso())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Somente administradores ativos podem excluir usuários.");
        }
        if (administradorId.equals(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Você não pode excluir seu próprio usuário.");
        }
        Usuario usuario = entityManager.find(Usuario.class, id, LockModeType.PESSIMISTIC_WRITE);
        if (usuario == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado.");
        boolean temVinculos = !entityManager.createNativeQuery(
                "SELECT usuario_id FROM (" + VINCULOS + ") vinculos WHERE usuario_id = :id")
                .setParameter("id", id).getResultList().isEmpty();
        if (!podeExcluir(usuario, administradorId, temVinculos ? Set.of(id) : Set.of())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Este usuário possui vínculos e não pode ser excluído. Utilize a opção Inativar usuário.");
        }
        var auditoria = new AuditoriaExclusaoUsuario();
        auditoria.setUsuarioId(id);
        auditoria.setUsuarioNome(nome(usuario));
        auditoria.setAdministradorId(administradorId);
        auditoria.setAdministradorNome(nome(administrador));
        auditoria.setJustificativa(motivo);
        auditoria.setRealizadoEm(Instant.now());
        auditoriaRepository.saveAndFlush(auditoria);
        try {
            entityManager.remove(usuario);
            entityManager.flush();
        } catch (DataIntegrityViolationException | jakarta.persistence.PersistenceException ex) {
            // A transação reverte também a auditoria se outro processo criar um vínculo.
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Não foi possível excluir o usuário. Atualize a lista e verifique seus vínculos.", ex);
        }
    }

    private String nome(Usuario usuario) {
        return usuario.getNome() == null || usuario.getNome().isBlank() ? "Usuário" : usuario.getNome();
    }
}
