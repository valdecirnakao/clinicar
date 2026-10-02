package com.clinicar.backend.controller;
import com.clinicar.backend.dto.ErroResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.hibernate.exception.ConstraintViolationException;
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<ErroResponse> tratarStatus(org.springframework.web.server.ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(new ErroResponse(ex.getReason()));
    }
    @ExceptionHandler(com.clinicar.backend.service.TokenRedefinicaoUtilizadoException.class)
    public ResponseEntity<java.util.Map<String, Object>> tratarTokenUtilizado(
            com.clinicar.backend.service.TokenRedefinicaoUtilizadoException ex) {
        java.util.Map<String, Object> resposta = new java.util.LinkedHashMap<>();
        resposta.put("mensagem", ex.getMessage());
        resposta.put("codigo", "TOKEN_JA_UTILIZADO");
        if (ex.getUtilizadoEm() != null) resposta.put("dataHoraUtilizacao", ex.getUtilizadoEm().toString());
        return ResponseEntity.badRequest().cacheControl(org.springframework.http.CacheControl.noStore()).body(resposta);
    }
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErroResponse> tratarIllegalArgumentException(
            IllegalArgumentException ex
    ) {
        return ResponseEntity
                .badRequest()
                .body(new ErroResponse(ex.getMessage()));
    }

       @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErroResponse> tratarDataIntegrityViolationException(DataIntegrityViolationException ex) {
        String mensagem = "Não foi possível salvar o registro porque existe uma restrição no banco de dados.";

        Throwable causa = ex.getCause();

        while (causa != null) {
            if (causa instanceof ConstraintViolationException) {
                ConstraintViolationException constraintException = (ConstraintViolationException) causa;
                String constraintName = constraintException.getConstraintName();
                String detalhe = String.valueOf(constraintException.getSQLException().getMessage()).toLowerCase(java.util.Locale.ROOT);
                if (detalhe.contains("placa") && (detalhe.contains("duplicate") || detalhe.contains("unique"))) {
                    mensagem = "Placa já cadastrada anteriormente.";
                    break;
                }

                if (constraintName != null && ("uk_usuario_cpf".equalsIgnoreCase(constraintName)
                        || constraintName.toLowerCase(java.util.Locale.ROOT).endsWith(".uk_usuario_cpf"))) {
                    mensagem = "CPF já cadastrado anteriormente.";
                    break;
                }

                if (constraintName != null && ("uk_usuario_email".equalsIgnoreCase(constraintName)
                        || constraintName.toLowerCase(java.util.Locale.ROOT).endsWith(".uk_usuario_email"))) {
                    mensagem = "E-mail já cadastrado anteriormente.";
                    break;
                }
            }

            causa = causa.getCause();
        }

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(new ErroResponse(mensagem));
    }
}
