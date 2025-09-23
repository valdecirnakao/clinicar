package com.clinicar.backend.controller;

import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.repository.FornecedorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/fornecedores")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class FornecedorController {

    private final FornecedorRepository fornecedorRepository;

    // CREATE
    @PostMapping
    public ResponseEntity<Fornecedor> criarFornecedor(@RequestBody Fornecedor fornecedor) {
        // Se você armazena só dígitos no banco, normalize aqui:
        fornecedor.setCnpj(soDigitos(fornecedor.getCnpj()));
        fornecedor.setCep(soDigitos(fornecedor.getCep()));
        Fornecedor salvo = fornecedorRepository.save(fornecedor);
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    // READ - listar todos
    @GetMapping
    public ResponseEntity<List<Fornecedor>> listarTodos() {
        return ResponseEntity.ok(fornecedorRepository.findAll());
    }

    // READ - por ID
    @GetMapping("/{id}")
    public ResponseEntity<Fornecedor> buscarPorId(@PathVariable Long id) {
        return fornecedorRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // READ - por CNPJ (string de dígitos)
    @GetMapping("/cnpj/{cnpj}")
    public ResponseEntity<Fornecedor> buscarPorCnpj(@PathVariable String cnpj) {
        String cnpjLimpo = soDigitos(cnpj);
        Optional<Fornecedor> fornecedor = fornecedorRepository.findByCnpj(cnpjLimpo);
        return fornecedor.map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<Fornecedor> atualizarFornecedor(@PathVariable Long id,
                                                          @RequestBody Fornecedor dados) {
        return fornecedorRepository.findById(id)
                .map(fornecedor -> {
                    fornecedor.setCnpj(soDigitos(dados.getCnpj()));
                    fornecedor.setRazaoSocial(dados.getRazaoSocial());
                    fornecedor.setNomeFantasia(dados.getNomeFantasia());
                    fornecedor.setTelefone(dados.getTelefone());
                    fornecedor.setEmail(dados.getEmail());
                    fornecedor.setFundacao(dados.getFundacao());
                    fornecedor.setItemFornecido(dados.getItemFornecido());
                    fornecedor.setCep(soDigitos(dados.getCep()));
                    fornecedor.setLogradouro(dados.getLogradouro());
                    fornecedor.setNumeroEndereco(dados.getNumeroEndereco());
                    fornecedor.setComplementoEndereco(dados.getComplementoEndereco());
                    fornecedor.setBairro(dados.getBairro());
                    fornecedor.setCidade(dados.getCidade());
                    fornecedor.setEstado(dados.getEstado());
                    Fornecedor salvo = fornecedorRepository.save(fornecedor);
                    return ResponseEntity.ok(salvo);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removerFornecedor(@PathVariable Long id) {
        if (!fornecedorRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        fornecedorRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Utilitário: deixa só dígitos (para CNPJ/CEP)
    private String soDigitos(String v) {
        return v == null ? null : v.replaceAll("\\D", "");
    }
}
