package com.clinicar.backend.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class QrCodeServiceTest {

    private final QrCodeService service = new QrCodeService();

    @Test
    void gerarQrCodeDataUrlRetornaImagemPngEmBase64() {
        String dataUrl = service.gerarQrCodeDataUrl("otpauth://totp/Clinicar:teste?secret=ABC123");

        assertTrue(dataUrl.startsWith("data:image/png;base64,"));

        String base64 = dataUrl.substring("data:image/png;base64,".length());
        byte[] bytes = Base64.getDecoder().decode(base64);

        assertFalse(base64.isBlank());
        assertTrue(bytes.length > 0);
    }
}
