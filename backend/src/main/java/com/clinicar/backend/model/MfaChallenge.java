package com.clinicar.backend.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mfa_challenge")
public class MfaChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token_hash", nullable = false, unique = true, length = 255)
    private String tokenHash;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    /*
     * Valores:
     * SETUP = primeiro cadastro do app autenticador
     * LOGIN = login normal usando app autenticador já configurado
     */
    @Column(nullable = false, length = 20)
    private String tipo;

    /*
     * Usado apenas no SETUP.
     * Guarda o segredo temporário criptografado até o usuário confirmar o código.
     */
    @Column(name = "secret_temporario", length = 1000)
    private String secretTemporario;

    @Column(name = "expira_em", nullable = false)
    private LocalDateTime expiraEm;

    @Column(nullable = false)
    private Boolean usado = false;

    @Column(nullable = false)
    private Integer tentativas = 0;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

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

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getSecretTemporario() {
        return secretTemporario;
    }

    public void setSecretTemporario(String secretTemporario) {
        this.secretTemporario = secretTemporario;
    }

    public LocalDateTime getExpiraEm() {
        return expiraEm;
    }

    public void setExpiraEm(LocalDateTime expiraEm) {
        this.expiraEm = expiraEm;
    }

    public Boolean getUsado() {
        return usado;
    }

    public void setUsado(Boolean usado) {
        this.usado = usado;
    }

    public Integer getTentativas() {
        return tentativas;
    }

    public void setTentativas(Integer tentativas) {
        this.tentativas = tentativas;
    }

    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(LocalDateTime criadoEm) {
        this.criadoEm = criadoEm;
    }
}