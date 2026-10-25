package com.clinicar.backend.controller;
import com.clinicar.backend.dto.VeiculoRequest;
import com.clinicar.backend.dto.VeiculoExclusaoResponse;
import com.clinicar.backend.dto.UsuarioResponse;
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
            @RequestBody VeiculoRequest request,
            @RequestAttribute(name = "usuarioLogado", required = false) UsuarioResponse solicitante) {
        if (!recepcaoOuAdministrador(solicitante)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
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

    @GetMapping("/verificar-placa")
    public ResponseEntity<java.util.Map<String, Boolean>> verificarPlaca(@RequestParam String placa,
            @RequestParam(required = false) Long ignorarId,
            @RequestAttribute(name = "usuarioLogado", required = false) UsuarioResponse solicitante) {
        if (!recepcaoOuAdministrador(solicitante)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore())
                .body(java.util.Map.of("cadastrada", veiculoService.verificarPlacaCadastrada(placa, ignorarId)));
    }

    private boolean recepcaoOuAdministrador(UsuarioResponse usuario) {
        return usuario != null && "ATIVO".equalsIgnoreCase(usuario.getStatus())
                && usuario.getTipo_do_acesso() != null
                && java.util.Set.of("ADMINISTRADOR", "COLABORADOR").contains(usuario.getTipo_do_acesso().toUpperCase(java.util.Locale.ROOT));
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

    @GetMapping("/{id}")
    public ResponseEntity<Veiculo> buscarPorId(@PathVariable Long id,
            @RequestAttribute(name = "usuarioLogado", required = false) UsuarioResponse solicitante) {
        if (!recepcaoOuAdministrador(solicitante)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return veiculoRepository.findById(id)
                .map(veiculo -> ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore()).body(veiculo))
                .orElseGet(() -> ResponseEntity.notFound().build());
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
    public ResponseEntity<VeiculoExclusaoResponse> removerVeiculo(
            @PathVariable Long id, @RequestAttribute("usuarioLogado") UsuarioResponse administrador) {
        return ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore())
                .body(veiculoService.excluir(id, administrador.getId()));
    }
}
