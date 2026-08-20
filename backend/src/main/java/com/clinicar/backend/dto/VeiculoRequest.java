package com.clinicar.backend.dto;


import com.fasterxml.jackson.annotation.JsonAlias;
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
  @JsonAlias({
            "ano_modelo_combustivel",
            "anoModelo",
            "ano_modelo",
            "anoCombustivel"
    })
    private String anoModeloCombustivel;

  @NotNull
    @JsonAlias({
            "id_proprietario",
            "proprietarioId",
            "idCliente",
            "clienteId",
            "idUsuario",
            "usuarioId"
    })
    private Long idProprietario;
}
