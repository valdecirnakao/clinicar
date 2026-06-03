package com.clinicar.backend.service;

import com.clinicar.backend.dto.ServicoRequest;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.repository.ServicoRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ServicoService {

  private final ServicoRepository repo;

  public Servico criar(ServicoRequest req) {
    
    Servico s = new Servico();
    s.setDescricao(req.getDescricao());
    s.setTipoDoPrestador(req.getTipoDoPrestador());
    s.setDuracao(req.getDuracao());
    s.setUnidade(req.getUnidade());
    s.setIdFornecedor(req.getIdFornecedor()); // <<< AQUI

    return repo.save(s);
  }
}
