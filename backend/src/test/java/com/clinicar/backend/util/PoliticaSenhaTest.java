package com.clinicar.backend.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;

class PoliticaSenhaTest {
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"        ", "Ab1!", "senhafraca", "SENHA123!", "senha123!", "SenhaForte!", "SenhaForte123"})
    void rejeitaSenhasQueNaoAtendemAPolitica(String senha) {
        assertThrows(IllegalArgumentException.class, () -> PoliticaSenha.validar(senha));
    }
    @Test void permiteSenhaForteERejeitaTamanhoExcessivo() {
        assertDoesNotThrow(() -> PoliticaSenha.validar("@Clinicar123"));
        assertThrows(IllegalArgumentException.class, () -> PoliticaSenha.validar("Aa1!" + "x".repeat(125)));
    }
}
