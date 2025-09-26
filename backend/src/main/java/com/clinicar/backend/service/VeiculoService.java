package com.clinicar.backend.service;

import com.clinicar.backend.dto.VeiculoRequest;
import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.repository.VeiculoRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class VeiculoService {

  private final VeiculoRepository repo;

  public Veiculo criar(VeiculoRequest req) {
    
    Veiculo v = new Veiculo();
    v.setPlaca(normalizaPlaca(req.getPlaca()));
    v.setFabricante(req.getFabricante());
    v.setCor(req.getCor());
    v.setModelo(req.getModelo());
    v.setAnoModeloCombustivel(req.getAnoModeloCombustivel());
    v.setIdProprietario(req.getIdProprietario()); // <<< AQUI

    return repo.save(v);
  }

  private String normalizaPlaca(String p) {
    if (p == null) return null;
    return p.trim().toUpperCase().replaceAll("\s+", "");
  }


}
