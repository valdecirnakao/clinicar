package com.clinicar.backend.controller;

import com.clinicar.backend.dto.ErroResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

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
}