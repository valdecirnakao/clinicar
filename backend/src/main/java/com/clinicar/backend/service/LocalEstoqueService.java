package com.clinicar.backend.service;

import com.clinicar.backend.dto.LocalEstoqueRequest;
import com.clinicar.backend.model.LocalEstoque;
import com.clinicar.backend.repository.LocalEstoqueRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LocalEstoqueService {

    private final LocalEstoqueRepository localEstoqueRepository;

    public LocalEstoqueService(LocalEstoqueRepository localEstoqueRepository) {
        this.localEstoqueRepository = localEstoqueRepository;
    }

    public LocalEstoque criar(LocalEstoqueRequest request) {
        validarRequest(request);

        String nome = limparTextoObrigatorio(request.getNome(), "Nome");

        localEstoqueRepository.findByNomeIgnoreCase(nome).ifPresent(local -> {
            throw new IllegalArgumentException("Já existe um local de estoque com este nome.");
        });

        LocalEstoque local = new LocalEstoque();

        preencher(local, request);

        return localEstoqueRepository.save(local);
    }

    public LocalEstoque atualizar(Long id, LocalEstoqueRequest request) {
        validarRequest(request);

        LocalEstoque local = buscarPorId(id);

        String nome = limparTextoObrigatorio(request.getNome(), "Nome");

        localEstoqueRepository.findByNomeIgnoreCase(nome).ifPresent(localEncontrado -> {
            if (!localEncontrado.getId().equals(id)) {
                throw new IllegalArgumentException("Já existe outro local de estoque com este nome.");
            }
        });

        preencher(local, request);

        return localEstoqueRepository.save(local);
    }

    public List<LocalEstoque> listarTodos() {
        return localEstoqueRepository.findAll();
    }

    public List<LocalEstoque> listarAtivos() {
        return localEstoqueRepository.findByAtivoTrue();
    }

    public LocalEstoque buscarPorId(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID do local de estoque não informado.");
        }

        return localEstoqueRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Local de estoque não encontrado."));
    }

    private void preencher(LocalEstoque local, LocalEstoqueRequest request) {
        local.setNome(limparTextoObrigatorio(request.getNome(), "Nome"));
        local.setDescricao(limparTextoOpcional(request.getDescricao()));
        local.setAtivo(request.getAtivo() == null ? true : request.getAtivo());
    }

    private void validarRequest(LocalEstoqueRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dados do local de estoque não informados.");
        }
    }

    private String limparTextoObrigatorio(String valor, String nomeCampo) {
        if (valor == null || valor.trim().isBlank()) {
            throw new IllegalArgumentException(nomeCampo + " é obrigatório.");
        }

        return valor.trim();
    }

    private String limparTextoOpcional(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        return valor.trim();
    }
}