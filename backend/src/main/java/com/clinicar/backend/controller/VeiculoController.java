package com.clinicar.backend.controller;

import java.util.List;
import java.util.Optional;

import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.repository.VeiculoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/veiculo")
@CrossOrigin(origins = "http://localhost:4200")
public class VeiculoController {

  private final VeiculoRepository veiculoRepository;

  public VeiculoController(VeiculoRepository veiculoRepository) {
    this.veiculoRepository = veiculoRepository;
  }
  
  @PostMapping
  public ResponseEntity<Veiculo> criar(@RequestBody Veiculo veiculo) {
    Veiculo salvo = veiculoRepository.save(veiculo);
    return ResponseEntity.status(201).body(salvo);
  }
  
  @GetMapping("/placa/{placa}")
  public ResponseEntity<Veiculo> buscarPorPlaca(@PathVariable String placa) {
    Optional<Veiculo> veiculo = veiculoRepository.findByPlaca(placa);
    return veiculo.map(ResponseEntity::ok).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
  }

  @GetMapping
  public ResponseEntity<List<Veiculo>> listarTodos() {
    List<Veiculo> veiculos = veiculoRepository.findAll();
    return ResponseEntity.ok(veiculos);
  }
}
