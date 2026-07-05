package com.clinicar.backend.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity
@Table(name = "auth_session")
public class AuthSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "token_hash", nullable = false, unique = true, length = 255)
    private String tokenHash;
    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;
    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();
    @Column(name = "ultimo_uso_em")
    private LocalDateTime ultimoUsoEm;
    @Column(name = "expira_em", nullable = false)
    private LocalDateTime expiraEm;
    @Column(nullable = false)
    private Boolean revogado = false;
    public Long getId() {
        return id;
    }
    public String getTokenHash() {
        return tokenHash;
    }
    public void setTokenHash(String tokenHash) {
        this.tokenHash = tokenHash;
    }
    public Long getUsuarioId() {
        return usuarioId;
    }
    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }
    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }
    public void setCriadoEm(LocalDateTime criadoEm) {
        this.criadoEm = criadoEm;
    }
    public LocalDateTime getUltimoUsoEm() {
        return ultimoUsoEm;
    }
    public void setUltimoUsoEm(LocalDateTime ultimoUsoEm) {
        this.ultimoUsoEm = ultimoUsoEm;
    }
    public LocalDateTime getExpiraEm() {
        return expiraEm;
    }
    public void setExpiraEm(LocalDateTime expiraEm) {
        this.expiraEm = expiraEm;
    }
    public Boolean getRevogado() {
        return revogado;
    }
    public void setRevogado(Boolean revogado) {
        this.revogado = revogado;
    }
}