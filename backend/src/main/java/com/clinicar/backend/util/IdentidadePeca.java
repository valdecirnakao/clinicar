package com.clinicar.backend.util;

import com.clinicar.backend.model.Peca;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.util.*;

/** Identifica o produto, preservando diferenças de fabricante, modelo e especificações. */
public final class IdentidadePeca {
    private IdentidadePeca() {}
    public static String chave(Peca p) {
        String[] campos = { p.getNome(), p.getFabricante(), p.getTipo(), p.getUnidade(), p.getModelo(),
            p.getOrigemOleo(), p.getViscosidadeSae() };
        StringBuilder texto = new StringBuilder();
        for (String campo : campos) {
            String normalizado = Normalizer.normalize(Objects.toString(campo, "").trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
            texto.append(normalizado.length()).append(':').append(normalizado);
        }
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(texto.toString().getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
