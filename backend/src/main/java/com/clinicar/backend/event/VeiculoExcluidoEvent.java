package com.clinicar.backend.event;

import com.clinicar.backend.dto.VeiculoExclusaoResponse;

/** Dados capturados antes da remoção; não depende de reler o veículo excluído. */
public record VeiculoExcluidoEvent(Long veiculoId, Long administradorId, String nome,
                                  String telefone, String veiculo, VeiculoExclusaoResponse resultado) {}
