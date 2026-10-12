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

        if (textoVazio(request.getNome())) {
            throw new IllegalArgumentException("Nome da peça é obrigatório.");
        }

        if (textoVazio(request.getFabricante())) {
            throw new IllegalArgumentException("Fabricante da peça é obrigatório.");
        }

        if (textoVazio(request.getTipo())) {
            throw new IllegalArgumentException("Tipo da peça é obrigatório.");
        }

        if (textoVazio(request.getUnidade())) {
            throw new IllegalArgumentException("Unidade de medida da peça é obrigatória.");
        }

        if (ehOleoMotor(request.getTipo())) {
            if (textoVazio(request.getOrigemOleo())) {
                throw new IllegalArgumentException(
                        "Origem do óleo de motor é obrigatória. Informe MINERAL, SEMISSINTETICO ou SINTETICO."
                );
            }

            if (textoVazio(request.getViscosidadeSae())) {
                throw new IllegalArgumentException("Viscosidade SAE do óleo de motor é obrigatória.");
            }

            if (!possuiEspecificacaoTecnica(request)) {
                throw new IllegalArgumentException(
                        "Informe ao menos uma especificação técnica do óleo: classificação API, classificação ACEA ou norma/aprovação OEM."
                );
            }
        }
    }

    private boolean possuiEspecificacaoTecnica(PecaRequest request) {
        return !textoVazio(request.getClassificacaoApi())
                || !textoVazio(request.getClassificacaoAcea())
                || !textoVazio(request.getNormaOem());
    }

    private boolean textoVazio(String valor) {
        return valor == null || valor.trim().isBlank();
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