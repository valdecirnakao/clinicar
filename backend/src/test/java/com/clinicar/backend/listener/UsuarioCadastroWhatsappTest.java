package com.clinicar.backend.listener;

import com.clinicar.backend.event.UsuarioCadastradoEvent;
import com.clinicar.backend.service.WhatsAppService;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.*;

class UsuarioCadastroWhatsappTest {
    @Configuration
    @EnableTransactionManagement
    static class Config {}

    @Test
    void enviaSomenteAposCommitSemReenviarEmRollbackOuForaDeTransacao() {
        WhatsAppService whatsapp = mock(WhatsAppService.class);
        try (var contexto = new AnnotationConfigApplicationContext()) {
            contexto.register(Config.class);
            contexto.registerBean(UsuarioWhatsappNotificationListener.class,
                    () -> new UsuarioWhatsappNotificationListener(whatsapp));
            contexto.refresh();
            var tx = new TransactionTemplate(new DataSourceTransactionManager(
                    new DriverManagerDataSource("jdbc:h2:mem:cadastro-whatsapp", "sa", "")));
            var evento = new UsuarioCadastradoEvent(1L, "Cliente Teste", "11999991111");
            contexto.publishEvent(evento);
            verifyNoInteractions(whatsapp);
            tx.executeWithoutResult(status -> {
                contexto.publishEvent(evento);
                verifyNoInteractions(whatsapp);
                status.setRollbackOnly();
            });
            verifyNoInteractions(whatsapp);
            tx.executeWithoutResult(status -> {
                contexto.publishEvent(evento);
                verifyNoInteractions(whatsapp);
            });
            verify(whatsapp, times(1)).enviarMensagemCadastroUsuario("11999991111", "Cliente Teste");

            doThrow(new IllegalStateException("Falha simulada da API"))
                    .when(whatsapp).enviarMensagemCadastroUsuario("11999991111", "Cliente Teste");
            assertDoesNotThrow(() -> tx.executeWithoutResult(status -> contexto.publishEvent(evento)));
        }
    }
}
