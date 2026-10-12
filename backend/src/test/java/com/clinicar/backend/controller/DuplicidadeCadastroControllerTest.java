package com.clinicar.backend.controller;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class DuplicidadeCadastroControllerTest {
    @Test void consultaPecaUsaSeteAtributosNormalizaSaeEIgnoraIdEditado() {
        var jdbc = new JdbcTemplate(new DriverManagerDataSource("jdbc:h2:mem:duplicidadepeca;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE", "sa", ""));
        jdbc.execute("CREATE TABLE IF NOT EXISTS peca(id BIGINT PRIMARY KEY, nome VARCHAR(200), fabricante VARCHAR(200), tipo VARCHAR(100), unidade VARCHAR(50), modelo VARCHAR(200), origem_oleo VARCHAR(30), viscosidade_sae VARCHAR(30))");
        jdbc.update("MERGE INTO peca KEY(id) VALUES (7,'Óleo','Marca','Óleo de motor','Litro','Linha','SINTETICO','5W-30')");
        var controller = new DuplicidadeCadastroController(jdbc);
        var valores = new java.util.HashMap<>(Map.of("nome","Óleo","fabricante","Marca","tipo","Óleo de motor","unidade","Litro","modelo","Linha","origemOleo","Sintético","viscosidadeSae","5w30","classificacaoApi","SP"));
        assertTrue(controller.verificar("peca",valores).duplicado());
        valores.put("idIgnorado","7"); assertFalse(controller.verificar("peca",valores).duplicado());
        valores.remove("idIgnorado"); valores.put("viscosidadeSae","10W40"); assertFalse(controller.verificar("peca",valores).duplicado());
    }
    @Test void consultaCombinaNomeCategoriaEIgnoraProprioId() {
        var jdbc = new JdbcTemplate(new DriverManagerDataSource("jdbc:h2:mem:duplicidade;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE", "sa", ""));
        jdbc.execute("CREATE TABLE IF NOT EXISTS servico(id BIGINT PRIMARY KEY, nome VARCHAR(200), categoria VARCHAR(100))");
        jdbc.update("MERGE INTO servico KEY(id) VALUES (7,'Balanceamento','Rodas')");
        var controller = new DuplicidadeCadastroController(jdbc);
        assertTrue(controller.verificar("servico",Map.of("nome","balanceamento","categoria","Rodas")).duplicado());
        assertFalse(controller.verificar("servico",Map.of("nome","Balanceamento","categoria","Motor")).duplicado());
        assertFalse(controller.verificar("servico",Map.of("nome","Balanceamento","categoria","Rodas","idIgnorado","7")).duplicado());
        assertThrows(IllegalArgumentException.class, () -> controller.verificar("tabela_injetada",Map.of()));
        assertThrows(IllegalArgumentException.class, () -> controller.verificar("servico",Map.of("nome","x","categoria","y","idIgnorado","-1")));
    }
}
