package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "servico")
@Getter @Setter
public class Servico {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 200)
  private String descricao;

  @Column(name = "tipo_do_prestador", nullable = false)
  private String tipoDoPrestador;

  @Column(nullable = false)
  private Number duracao;

  @Column(nullable = false)
  private String unidade;

  @Column(name = "id_fornecedor", nullable = false)
  private Long idFornecedor;
}

