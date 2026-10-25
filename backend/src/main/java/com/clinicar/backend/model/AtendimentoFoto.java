package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity @Table(name = "atendimento_foto")
@Getter @Setter
public class AtendimentoFoto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "atendimento_id", nullable = false) private Long atendimentoId;
    @Column(name = "autor_id", nullable = false) private Long autorId;
    @Column(name = "nome_arquivo", nullable = false, length = 180) private String nomeArquivo;
    @Column(name = "tipo_mime", nullable = false, length = 30) private String tipoMime;
    @Column(name = "tamanho_bytes", nullable = false) private Integer tamanhoBytes;
    @Lob @Column(nullable = false, columnDefinition = "MEDIUMBLOB") private byte[] conteudo;
    @Column(name = "registrado_em", nullable = false) private LocalDateTime registradoEm;
    @PrePersist void criar() { registradoEm = LocalDateTime.now(); }
}
