package com.clinicar.backend.config;

import org.junit.jupiter.api.Test;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;

class AuthRateLimitFilterTest {
    @Test void aceitaEnderecoInformadoSomentePeloProxyConfigurado() {
        var filter=new AuthRateLimitFilter(Clock.fixed(Instant.EPOCH,ZoneOffset.UTC));
        var request=new org.springframework.mock.web.MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");request.addHeader("X-Real-IP","203.0.113.7");
        assertEquals("127.0.0.1",filter.enderecoCliente(request));
        org.springframework.test.util.ReflectionTestUtils.setField(filter,"trustedProxyName","127.0.0.1");
        assertEquals("203.0.113.7",filter.enderecoCliente(request));
        request.setRemoteAddr("203.0.113.8");
        assertEquals("203.0.113.8",filter.enderecoCliente(request));
    }
    @Test void limitaTentativasESeparaClientes() {
        var filter = new AuthRateLimitFilter(Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
        assertTrue(filter.permitir("cliente-a", 2));
        assertTrue(filter.permitir("cliente-a", 2));
        assertFalse(filter.permitir("cliente-a", 2));
        assertTrue(filter.permitir("cliente-b", 2));
    }
    @Test void janelaExpiradaPermiteNovamente() {
        class Relogio extends Clock {
            Instant instante = Instant.EPOCH;
            public ZoneId getZone() { return ZoneOffset.UTC; }
            public Clock withZone(ZoneId zone) { return this; }
            public Instant instant() { return instante; }
        }
        var clock = new Relogio(); var filter = new AuthRateLimitFilter(clock);
        assertTrue(filter.permitir("cliente", 1));
        assertFalse(filter.permitir("cliente", 1));
        clock.instante = Instant.EPOCH.plusSeconds(60);
        assertTrue(filter.permitir("cliente", 1));
    }
}
