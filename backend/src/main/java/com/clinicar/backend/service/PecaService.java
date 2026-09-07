package com.clinicar.backend.service;

import com.clinicar.backend.dto.PecaRequest;
import com.clinicar.backend.mapper.PecaMapper;
import com.clinicar.backend.model.Peca;
import com.clinicar.backend.repository.PecaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PecaService {

    private final PecaRepository pecaRepository;
    private final PecaMapper pecaMapper;

    public PecaService(
            PecaRepository pecaRepository,
            PecaMapper pecaMapper
    ) {
        this.pecaRepository = pecaRepository;
        this.pecaMapper = pecaMapper;
    }

    @Transactional
    public Peca criar(PecaRequest request) {
        validarRequest(request);

        Peca peca = new Peca();

        pecaMapper.preencherEntidade(peca, request);

        return pecaRepository.save(peca);
    }

    public List<Peca> listarTodos() {
        return pecaRepository.findAll();
    }

    public Peca buscarPorId(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("Peça é obrigatória.");
        }

        return pecaRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Peça não encontrada."));
    }

    @Transactional
    public Peca atualizar(Long id, PecaRequest request) {
        validarRequest(request);

        Peca peca = buscarPorId(id);

        pecaMapper.preencherEntidade(peca, request);

        return pecaRepository.save(peca);
    }

    @Transactional
    public void excluir(Long id) {
        Peca peca = buscarPorId(id);
        pecaRepository.delete(peca);
    }

    private void validarRequest(PecaRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dados da peça não informados.");
        }

        if (request.getNome() == null || request.getNome().trim().isBlank()) {
            throw new IllegalArgumentException("Nome da peça é obrigatório.");
        }
    }
}