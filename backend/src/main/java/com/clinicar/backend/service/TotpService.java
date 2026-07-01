package com.clinicar.backend.service;

import org.apache.commons.codec.binary.Base32;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.time.Instant;

@Service
public class TotpService {

    private static final int CODIGO_DIGITOS = 6;
    private static final int PERIODO_SEGUNDOS = 30;
    private static final int JANELA_TOLERANCIA = 1;

    public String gerarSecretBase32() {
        byte[] bytes = new byte[20];
        new SecureRandom().nextBytes(bytes);

        Base32 base32 = new Base32();

        return base32
                .encodeToString(bytes)
                .replace("=", "")
                .replace(" ", "");
    }

    public boolean validarCodigo(String secretBase32, String codigoInformado) {
        if (secretBase32 == null || secretBase32.isBlank()) {
            return false;
        }

        if (codigoInformado == null || !codigoInformado.matches("\\d{6}")) {
            return false;
        }

        long timeStepAtual = Instant.now().getEpochSecond() / PERIODO_SEGUNDOS;

        for (int i = -JANELA_TOLERANCIA; i <= JANELA_TOLERANCIA; i++) {
            String codigoEsperado = gerarCodigo(secretBase32, timeStepAtual + i);

            if (codigoInformado.equals(codigoEsperado)) {
                return true;
            }
        }

        return false;
    }

    private String gerarCodigo(String secretBase32, long timeStep) {
        try {
            Base32 base32 = new Base32();
            byte[] chave = base32.decode(secretBase32);

            byte[] data = new byte[8];
            long valor = timeStep;

            for (int i = 7; i >= 0; i--) {
                data[i] = (byte) (valor & 0xFF);
                valor >>= 8;
            }

            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(chave, "HmacSHA1"));

            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0x0F;

            int binary =
                    ((hash[offset] & 0x7F) << 24) |
                    ((hash[offset + 1] & 0xFF) << 16) |
                    ((hash[offset + 2] & 0xFF) << 8) |
                    (hash[offset + 3] & 0xFF);

            int otp = binary % 1_000_000;

            return String.format("%06d", otp);

        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar código TOTP.", e);
        }
    }
}