package com.clinicar.backend.dto;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class VeiculoRequest {

  @NotBlank
  private String placa;

  @NotBlank
  private String fabricante;

  @NotBlank
  private String cor;

  @NotBlank
  private String modelo;

  @NotBlank
  @JsonProperty("ano_modelo_combustivel")   // chave “oficial” esperada no JSON
  private String anoModeloCombustivel;

  @NotNull
  @JsonProperty("id_proprietario")          // chave “oficial” esperada no JSON
  private Long idProprietario;
}
