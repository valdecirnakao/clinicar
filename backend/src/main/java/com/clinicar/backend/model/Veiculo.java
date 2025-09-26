package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "veiculo")
@Getter @Setter
public class Veiculo {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 10)
  private String placa;

  @Column(nullable = false)
  private String fabricante;

  @Column(nullable = false)
  private String cor;

  @Column(nullable = false)
  private String modelo;

  @Column(name = "ano_modelo_combustivel", nullable = false)
  private String anoModeloCombustivel;

  @Column(name = "id_proprietario", nullable = false)
  private Long idProprietario;
}

