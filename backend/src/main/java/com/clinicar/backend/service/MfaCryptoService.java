package com.clinicar.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class MfaCryptoService {

    private static final String ALGORITMO = "AES";
    private static final String TRANSFORMACAO = "AES/GCM/NoPadding";
    private static final int TAMANHO_IV = 12;
    private static final int TAMANHO_TAG_BITS = 128;

    private final byte[] chave;

    public MfaCryptoService(
            @Value("${clinicar.mfa.encryption-key}") String chaveBase64
    ) {
        if (chaveBase64 == null || chaveBase64.isBlank()) {
            throw new IllegalArgumentException("A chave MFA_ENCRYPTION_KEY não foi configurada.");
        }

        this.chave = Base64.getDecoder().decode(chaveBase64);

        if (this.chave.length != 32) {
            throw new IllegalArgumentException("A chave MFA_ENCRYPTION_KEY deve ter 32 bytes em Base64.");
        }
    }

    public String criptografar(String textoPuro) {
        try {
            byte[] iv = new byte[TAMANHO_IV];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMACAO);
            SecretKeySpec keySpec = new SecretKeySpec(chave, ALGORITMO);
            GCMParameterSpec gcmSpec = new GCMParameterSpec(TAMANHO_TAG_BITS, iv);

            cipher.init(Cipher.ENCRYPT_MODE, keySpec, gcmSpec);

            byte[] cifrado = cipher.doFinal(textoPuro.getBytes());

            return Base64.getEncoder().encodeToString(iv)
                    + "."
                    + Base64.getEncoder().encodeToString(cifrado);

        } catch (Exception e) {
            throw new RuntimeException("Erro ao criptografar segredo MFA.", e);
        }
    }

    public String descriptografar(String valorCriptografado) {
        try {
            String[] partes = valorCriptografado.split("\\.");

            if (partes.length != 2) {
                throw new IllegalArgumentException("Formato inválido do segredo MFA.");
            }

            byte[] iv = Base64.getDecoder().decode(partes[0]);
            byte[] cifrado = Base64.getDecoder().decode(partes[1]);

            Cipher cipher = Cipher.getInstance(TRANSFORMACAO);
            SecretKeySpec keySpec = new SecretKeySpec(chave, ALGORITMO);
            GCMParameterSpec gcmSpec = new GCMParameterSpec(TAMANHO_TAG_BITS, iv);

            cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmSpec);

            byte[] textoPuro = cipher.doFinal(cifrado);

            return new String(textoPuro);

        } catch (Exception e) {
            throw new RuntimeException("Erro ao descriptografar segredo MFA.", e);
        }
    }
}