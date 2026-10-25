package com.clinicar.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;

import static org.junit.jupiter.api.Assertions.*;

class NotificacaoWorkerRecusaTest {
    private final NotificacaoWorker worker = new NotificacaoWorker(null, new ObjectMapper());

    @Test
    void preservaCodigoEMotivoSemExporTelefone() {
        var body = "{\"error\":{\"code\":132001,\"error_subcode\":2494073,"
            + "\"message\":\"Template unavailable for 5511900000000\"}}";
        var erro = new HttpClientErrorException(HttpStatus.BAD_REQUEST, "Bad Request",
            body.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);

        String detalhe = worker.detalharRecusa(erro);

        assertTrue(detalhe.contains("HTTP 400"));
        assertTrue(detalhe.contains("132001/2494073"));
        assertTrue(detalhe.contains("Template unavailable"));
        assertFalse(detalhe.contains("5511900000000"));
    }

    @Test
    void respostaNaoJsonMantemDiagnosticoSeguro() {
        var erro = new HttpClientErrorException(HttpStatus.BAD_REQUEST, "Bad Request",
            "unavailable".getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);

        assertEquals("Provedor recusou o envio (HTTP 400).", worker.detalharRecusa(erro));
    }
}
