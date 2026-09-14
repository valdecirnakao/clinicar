package com.clinicar.backend.service;

import com.clinicar.backend.dto.PecaRequest;
import com.clinicar.backend.mapper.PecaMapper;
import com.clinicar.backend.model.Peca;
import com.clinicar.backend.repository.PecaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

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

        if (request.getFabricante() == null || request.getFabricante().trim().isBlank()) {
            throw new IllegalArgumentException("Fabricante da peça é obrigatório.");
        }

        if (request.getTipo() == null || request.getTipo().trim().isBlank()) {
    throw new IllegalArgumentException(
        "Tipo da peça é obrigatório."
    );
}

        if (request.getUnidade() == null || request.getUnidade().trim().isBlank()) {
            throw new IllegalArgumentException("Unidade de medida da peça é obrigatória.");
        }

        if (ehOleoMotor(request.getTipo())
                && (request.getOrigemOleo() == null || request.getOrigemOleo().trim().isBlank())) {
            throw new IllegalArgumentException("Origem do óleo de motor é obrigatória. Informe MINERAL ou SINTETICO.");
        }
    }

    private boolean ehOleoMotor(String tipo) {
        if (tipo == null || tipo.isBlank()) {
            return false;
        }

        String normalizado = Normalizer
                .normalize(tipo, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();

        return "oleo de motor".equals(normalizado);
    }
}