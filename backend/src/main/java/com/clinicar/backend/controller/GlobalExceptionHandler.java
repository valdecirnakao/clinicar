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

                if ("uk_usuario_email".equalsIgnoreCase(constraintName)) {
                    mensagem = "Já existe um usuário cadastrado com este e-mail.";
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