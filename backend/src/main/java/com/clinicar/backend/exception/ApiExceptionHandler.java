// package com.clinicar.backend.exception;

// import jakarta.servlet.http.HttpServletRequest;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.http.HttpStatus;
// import org.springframework.http.ResponseEntity;
// import org.springframework.web.bind.annotation.ExceptionHandler;
// import org.springframework.web.bind.annotation.RestControllerAdvice;

// import java.util.Map;

// @Slf4j
// @RestControllerAdvice
// public class ApiExceptionHandler {

//     @ExceptionHandler(IllegalArgumentException.class)
//     public ResponseEntity<Map<String, String>> tratarIllegalArgumentException(
//             IllegalArgumentException exception,
//             HttpServletRequest request
//     ) {
//         log.warn(
//                 "[API] Erro de regra de negócio em {} {}: {}",
//                 request.getMethod(),
//                 request.getRequestURI(),
//                 exception.getMessage()
//         );

//         return ResponseEntity
//                 .status(HttpStatus.BAD_REQUEST)
//                 .body(Map.of("mensagem", exception.getMessage()));
//     }

//     @ExceptionHandler(Exception.class)
//     public ResponseEntity<Map<String, String>> tratarException(
//             Exception exception,
//             HttpServletRequest request
//     ) {
//         log.error(
//                 "[API] Erro interno em {} {}",
//                 request.getMethod(),
//                 request.getRequestURI(),
//                 exception
//         );

//         return ResponseEntity
//                 .status(HttpStatus.INTERNAL_SERVER_ERROR)
//                 .body(Map.of(
//                         "mensagem",
//                         "Erro interno no servidor. Verifique o log do backend para mais detalhes."
//                 ));
//     }
// }


package com.clinicar.backend.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@Slf4j
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> tratarIllegalArgumentException(
            IllegalArgumentException exception,
            HttpServletRequest request
    ) {
        log.warn(
                "[API] Regra de negócio em {} {}: {}",
                request.getMethod(),
                request.getRequestURI(),
                exception.getMessage()
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("mensagem", exception.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> tratarDataIntegrity(
            DataIntegrityViolationException exception,
            HttpServletRequest request
    ) {
        log.error(
                "[API] Erro de integridade no banco em {} {}",
                request.getMethod(),
                request.getRequestURI(),
                exception
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "mensagem",
                        "Erro de integridade no banco: " + mensagemRaiz(exception)
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> tratarException(
            Exception exception,
            HttpServletRequest request
    ) {
        log.error(
                "[API] Erro interno em {} {}",
                request.getMethod(),
                request.getRequestURI(),
                exception
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                        "mensagem",
                        "Erro interno no servidor: " + exception.getClass().getSimpleName()
                                + " - " + mensagemRaiz(exception)
                ));
    }

    private String mensagemRaiz(Throwable throwable) {
        Throwable causa = throwable;

        while (causa.getCause() != null) {
            causa = causa.getCause();
        }

        return causa.getMessage() != null
                ? causa.getMessage()
                : "sem detalhe informado";
    }
}