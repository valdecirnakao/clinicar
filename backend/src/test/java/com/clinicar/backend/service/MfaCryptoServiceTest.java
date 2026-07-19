package com.clinicar.backend.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class MfaCryptoServiceTest {

    @Test
    void construtorLancaErroQuandoChaveNaoFoiConfigurada() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> new MfaCryptoService(" ")
        );

        assertEquals("A chave MFA_ENCRYPTION_KEY não foi configurada.", ex.getMessage());
    }

    @Test
    void construtorLancaErroQuandoChaveNaoTem32Bytes() {
        String chaveInvalida = Base64.getEncoder().encodeToString(new byte[16]);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> new MfaCryptoService(chaveInvalida)
        );

        assertEquals("A chave MFA_ENCRYPTION_KEY deve ter 32 bytes em Base64.", ex.getMessage());
    }

    @Test
    void criptografarEDescriptografarRetornamTextoOriginal() {
        MfaCryptoService service = new MfaCryptoService(chaveValidaBase64());
        String texto = "segredo-mfa-usuario-123";

        String criptografado = service.criptografar(texto);
        String descriptografado = service.descriptografar(criptografado);

        assertNotEquals(texto, criptografado);
        assertEquals(texto, descriptografado);
        assertTrue(criptografado.contains("."));
    }

    @Test
    void descriptografarLancaErroParaFormatoInvalido() {
        MfaCryptoService service = new MfaCryptoService(chaveValidaBase64());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.descriptografar("valor-sem-separador")
        );

        assertEquals(
                "Não foi possível validar a autenticação em duas etapas. " +
                        "Solicite ao administrador o reset do 2FA e configure o aplicativo autenticador novamente.",
                ex.getMessage()
        );
    }

    @Test
    void descriptografarLancaErroQuandoValorFoiAdulterado() {
        MfaCryptoService service = new MfaCryptoService(chaveValidaBase64());
        String criptografado = service.criptografar("segredo");
        String adulterado = criptografado.substring(0, criptografado.length() - 1) + "A";

        assertDoesNotThrow(() -> service.descriptografar(criptografado));

        assertThrows(IllegalArgumentException.class, () -> service.descriptografar(adulterado));
    }

    private String chaveValidaBase64() {
        byte[] chave = new byte[32];
        for (int i = 0; i < chave.length; i++) {
            chave[i] = (byte) (i + 1);
        }
        return Base64.getEncoder().encodeToString(chave);
    }
}
