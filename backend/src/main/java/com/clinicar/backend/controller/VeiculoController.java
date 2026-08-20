package com.clinicar.backend.controller;
import com.clinicar.backend.dto.VeiculoRequest;
import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.repository.VeiculoRepository;
import com.clinicar.backend.service.VeiculoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/veiculo")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class VeiculoController {

    private static final Logger log = LoggerFactory.getLogger(VeiculoController.class);

    private final VeiculoRepository veiculoRepository;
    private final VeiculoService veiculoService;

    public VeiculoController(
            VeiculoRepository veiculoRepository,
            VeiculoService veiculoService) {
        this.veiculoRepository = veiculoRepository;
        this.veiculoService = veiculoService;
    }

    @PostMapping
    public ResponseEntity<Veiculo> criar(
            @RequestBody VeiculoRequest request) {
        log.info(
                "Controller recebeu cadastro de veículo. fabricante={}, modelo={}, placa={}, anoModeloCombustivel={}, idProprietario={}",
                request.getFabricante(),
                request.getModelo(),
                request.getPlaca(),
                request.getAnoModeloCombustivel(),
                request.getIdProprietario());

        Veiculo salvo = veiculoService.criar(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(salvo);
    }

    @GetMapping("/placa/{placa}")
    public ResponseEntity<Veiculo> buscarPorPlaca(
            @PathVariable String placa) {
        Optional<Veiculo> veiculo = veiculoRepository.findByPlaca(placa);

        return veiculo
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping
    public ResponseEntity<List<Veiculo>> listarTodos() {
        List<Veiculo> veiculos = veiculoRepository.findAll();

        return ResponseEntity.ok(veiculos);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Veiculo> atualizarVeiculo(
            @PathVariable Long id,
            @RequestBody Veiculo veiculoAtualizado) {
        log.info("Recebida solicitação para atualizar veículo ID {}.", id);

        if (!veiculoRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        /*
         * IMPORTANTE:
         *
         * Não atualizar direto pelo repository aqui.
         * A atualização precisa passar pelo VeiculoService.atualizar(...)
         * para detectar alterações e disparar a notificação WhatsApp.
         */
        Veiculo atualizado = veiculoService.atualizar(id, veiculoAtualizado);

        return ResponseEntity.ok(atualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removerVeiculo(
            @PathVariable Long id) {
        if (!veiculoRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        veiculoRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}