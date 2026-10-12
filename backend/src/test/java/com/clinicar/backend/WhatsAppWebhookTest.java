package com.clinicar.backend;
import com.clinicar.backend.controller.WhatsAppWebhookController;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class WhatsAppWebhookTest {
    @Test void verificaBytesExatosERecusaAusenciaDeConfiguracao() throws Exception {
        byte[] body="{\"status\":\"delivered\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        var mac=javax.crypto.Mac.getInstance("HmacSHA256"); mac.init(new javax.crypto.spec.SecretKeySpec("segredo-teste".getBytes(),"HmacSHA256"));
        String signature="sha256="+java.util.HexFormat.of().formatHex(mac.doFinal(body));
        assertTrue(WhatsAppWebhookController.assinaturaValida("segredo-teste",body,signature));
        assertFalse(WhatsAppWebhookController.assinaturaValida("segredo-teste","alterado".getBytes(),signature));
        assertFalse(WhatsAppWebhookController.assinaturaValida("",body,signature));
        assertFalse(WhatsAppWebhookController.assinaturaValida("segredo-teste",body,"sha256=invalido"));
    }
}
