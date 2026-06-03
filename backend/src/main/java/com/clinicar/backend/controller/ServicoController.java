package com.clinicar.backend.controller;

import java.util.List;
import java.util.Optional;

import com.clinicar.backend.model.Servico;
import com.clinicar.backend.repository.ServicoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/servico")
@CrossOrigin(origins = "http://localhost:4200")
public class ServicoController {

  private final ServicoRepository servicoRepository;
  public ServicoController(ServicoRepository servicoRepository) {
    this.servicoRepository = servicoRepository;
  }
  
  @PostMapping
  public ResponseEntity<Servico> criar(@RequestBody Servico servico) {
    Servico salvo = servicoRepository.save(servico);
    return ResponseEntity.status(201).body(salvo);
  }
  
  @GetMapping("/descricao/{descricao}")
  public ResponseEntity<Servico> buscarPorDescricao(@PathVariable String descricao) {
    Optional<Servico> servico = servicoRepository.findByDescricao(descricao);
    return servico.map(ResponseEntity::ok).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
  }

  @GetMapping
  public ResponseEntity<List<Servico>> listarTodos() {
    List<Servico> servicos = servicoRepository.findAll();
    return ResponseEntity.ok(servicos);
  }

  @PutMapping("/{id}")
  public ResponseEntity<Servico> atualizarServico(@PathVariable Long id, @RequestBody Servico servicoAtualizado) {
    Optional<Servico> servicoOptional = servicoRepository.findById(id);
    if (servicoOptional.isPresent()) {
      Servico servico = servicoOptional.get();
      // Atualize todos os campos necessários
      servico.setDescricao(servicoAtualizado.getDescricao());
      servico.setTipoDoPrestador(servicoAtualizado.getTipoDoPrestador());
      servico.setDuracao(servicoAtualizado.getDuracao());
      servico.setUnidade(servicoAtualizado.getUnidade());
      servicoRepository.save(servico);
      return ResponseEntity.ok(servico);
    } else {
      return ResponseEntity.notFound().build();
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> removerServico(@PathVariable Long id) {
    if (!servicoRepository.existsById(id)) {
        return ResponseEntity.notFound().build();
    }
    servicoRepository.deleteById(id);
    return ResponseEntity.noContent().build();
  }
}
