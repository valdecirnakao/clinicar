package com.clinicar.backend.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;

class TotpServiceTest {

    private final TotpService service = new TotpService();

    @Test
    void gerarSecretBase32RetornaValorValidoSemPadding() {
        String secret = service.gerarSecretBase32();

        assertNotNull(secret);
        assertTrue(secret.matches("^[A-Z2-7]+$"));
        assertFalse(secret.contains("="));
    }

    @Test
    void validarCodigoRetornaVerdadeiroParaCodigoGeradoNoTimeStepAtual() throws Exception {
        String secret = service.gerarSecretBase32();
        long timeStepAtual = java.time.Instant.now().getEpochSecond() / 30;
        String codigoAtual = gerarCodigoViaReflexao(secret, timeStepAtual);

        boolean valido = service.validarCodigo(secret, codigoAtual);

        assertTrue(valido);
    }

    @Test
    void validarCodigoRetornaFalsoParaEntradasInvalidas() {
        assertFalse(service.validarCodigo(null, "123456"));
        assertFalse(service.validarCodigo("   ", "123456"));
        assertFalse(service.validarCodigo("JBSWY3DPEHPK3PXP", null));
        assertFalse(service.validarCodigo("JBSWY3DPEHPK3PXP", "12A456"));
        assertFalse(service.validarCodigo("JBSWY3DPEHPK3PXP", "12345"));
    }

    @Test
    void validarCodigoRetornaFalsoParaCodigoIncorreto() {
        String secret = service.gerarSecretBase32();

        assertFalse(service.validarCodigo(secret, "000000"));
    }

    private String gerarCodigoViaReflexao(String secret, long timeStep) throws Exception {
        Method metodo = TotpService.class.getDeclaredMethod("gerarCodigo", String.class, long.class);
        metodo.setAccessible(true);
        return (String) metodo.invoke(service, secret, timeStep);
    }
}
