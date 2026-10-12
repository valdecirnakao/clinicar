package com.clinicar.backend.listener;

import com.clinicar.backend.dto.VeiculoExclusaoResponse;
import com.clinicar.backend.event.VeiculoExcluidoEvent;
import com.clinicar.backend.service.WhatsAppService;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VeiculoExclusaoWhatsappTest {
    @Configuration @EnableTransactionManagement static class Config {}
    @Test void respeitaCommitRollbackAusenciaDeTelefoneEFalhaDaApi() {
        var whatsapp = mock(WhatsAppService.class);
        try (var contexto = new AnnotationConfigApplicationContext()) {
            contexto.register(Config.class);
            contexto.registerBean(VeiculoWhatsappNotificationListener.class, () -> new VeiculoWhatsappNotificationListener(whatsapp));
            contexto.refresh();
            var tx = new TransactionTemplate(new DataSourceTransactionManager(
                    new DriverManagerDataSource("jdbc:h2:mem:exclusao-whatsapp", "sa", "")));
            var resposta = new VeiculoExclusaoResponse();
            var evento = new VeiculoExcluidoEvent(42L, 1L, "Nome social", "11999991111", "Toyota Corolla - Placa ABC-1234", resposta);
            contexto.publishEvent(evento); verifyNoInteractions(whatsapp);
            tx.executeWithoutResult(status -> { contexto.publishEvent(evento); status.setRollbackOnly(); });
            verifyNoInteractions(whatsapp);
            tx.executeWithoutResult(status -> { contexto.publishEvent(evento); verifyNoInteractions(whatsapp); });
            verify(whatsapp).enviarAlertaExclusaoVeiculo("11999991111", "Nome social", "Toyota Corolla - Placa ABC-1234");
            assertEquals("ENVIADA", resposta.getNotificacaoWhatsapp());
            doThrow(new IllegalStateException("Erro simulado da API")).when(whatsapp).enviarAlertaExclusaoVeiculo(anyString(), anyString(), anyString());
            assertDoesNotThrow(() -> tx.executeWithoutResult(status -> contexto.publishEvent(evento)));
            assertEquals("NAO_ENVIADA", resposta.getNotificacaoWhatsapp());
            clearInvocations(whatsapp);
            tx.executeWithoutResult(status -> contexto.publishEvent(new VeiculoExcluidoEvent(42L, 1L, "Nome", null, "Veículo", resposta)));
            verifyNoInteractions(whatsapp); assertEquals("NAO_ENVIADA", resposta.getNotificacaoWhatsapp());
        }
    }
}
