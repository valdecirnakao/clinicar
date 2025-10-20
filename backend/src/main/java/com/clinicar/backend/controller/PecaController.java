package com.clinicar.backend.controller;

import java.util.List;
import java.util.Optional;

import com.clinicar.backend.model.Peca;
import com.clinicar.backend.repository.PecaRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/peca")
@CrossOrigin(origins = "http://localhost:4200") // Libera requisições do Angular
public class PecaController {   
    
    private final PecaRepository pecaRepository;
    public PecaController(PecaRepository pecaRepository) {
        this.pecaRepository = pecaRepository;
    }

    @PostMapping
    public ResponseEntity<Peca> criarPeca(@RequestBody Peca peca) {
        Peca salvo = pecaRepository.save(peca);
        return ResponseEntity.status(201).body(salvo);
    }

    @GetMapping
    public ResponseEntity<List<Peca>> listarTodos() {
        List<Peca> pecas = pecaRepository.findAll();
        return ResponseEntity.ok(pecas);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Peca> buscarPorId(@PathVariable Long id) {
        Optional<Peca> peca = pecaRepository.findById(id);
        return peca.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Peca> atualizarPeca(@PathVariable Long id, @RequestBody Peca pecaAtualizada) {
        Optional<Peca> pecaOptional = pecaRepository.findById(id);
        if (pecaOptional.isPresent()) {
            Peca peca = pecaOptional.get();
            // Atualize todos os campos necessários
            peca.setNome(pecaAtualizada.getNome());
            peca.setTipo(pecaAtualizada.getTipo());
            peca.setEspecificacao(pecaAtualizada.getEspecificacao());
            peca.setFabricante(pecaAtualizada.getFabricante());
            peca.setModelo(pecaAtualizada.getModelo());
            peca.setNorma(pecaAtualizada.getNorma());
            peca.setUnidade(pecaAtualizada.getUnidade());
            pecaRepository.save(peca);
            return ResponseEntity.ok(peca);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removerPeca(@PathVariable Long id) {
        if (!pecaRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        pecaRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}