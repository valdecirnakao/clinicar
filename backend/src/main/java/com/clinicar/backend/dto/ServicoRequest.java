package com.clinicar.backend.dto;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class ServicoRequest {

  @NotBlank
  private String descricao;

  @NotBlank
  @JsonProperty("tipo_do_prestador")          // chave “oficial” esperada no JSON
  private String tipoDoPrestador;

  @NotBlank
  private Number duracao;

  @NotBlank
  private String unidade;

  @NotNull
  @JsonProperty("id_fornecedor")          // chave “oficial” esperada no JSON
  private Long idFornecedor;
}
