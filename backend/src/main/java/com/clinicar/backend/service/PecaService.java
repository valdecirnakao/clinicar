// FornecedorService.java
package com.clinicar.backend.service;

import com.clinicar.backend.dto.PecaRequest;
import com.clinicar.backend.model.Peca;
import com.clinicar.backend.repository.PecaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PecaService {

    private final PecaRepository repo;

    public Peca criar(PecaRequest req) {
        Peca p = new Peca();
        p.setNome(req.getNome());
        p.setTipo(req.getTipo());
        p.setEspecificacao(req.getEspecificacao());
        p.setFabricante(req.getFabricante());
        p.setModelo(req.getModelo());
        p.setNorma(req.getNorma());
        p.setUnidade(req.getUnidade());

        return repo.save(p);
    }
}
