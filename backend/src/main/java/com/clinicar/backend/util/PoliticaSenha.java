package com.clinicar.backend.util;

/** A mesma regra é aplicada a toda gravação de senha, inclusive fora da interface. */
public final class PoliticaSenha {
    private PoliticaSenha() { }

    public static void validar(String senha) {
        if (senha == null || senha.isBlank()) throw new IllegalArgumentException("Informe a nova senha.");
        if (senha.length() < 8 || senha.length() > 128)
            throw new IllegalArgumentException("A senha deve ter de 8 a 128 caracteres.");
        if (!senha.chars().anyMatch(Character::isUpperCase)
                || !senha.chars().anyMatch(Character::isLowerCase)
                || !senha.chars().anyMatch(Character::isDigit)
                || !senha.chars().anyMatch(c -> !Character.isLetterOrDigit(c) && !Character.isWhitespace(c)))
            throw new IllegalArgumentException("A senha deve conter letra maiúscula, letra minúscula, número e caractere especial.");
    }
}
