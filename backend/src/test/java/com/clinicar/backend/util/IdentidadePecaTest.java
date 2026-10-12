package com.clinicar.backend.util;
import com.clinicar.backend.model.Peca;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class IdentidadePecaTest {
    @Test void especificacoesComplementaresNaoCriamOutroProduto() {
        var a = new Peca(); a.setNome("Óleo"); a.setFabricante("Marca"); a.setTipo("Óleo de motor"); a.setUnidade("Litro");
        a.setModelo("Linha"); a.setOrigemOleo("SINTETICO"); a.setViscosidadeSae("5W-30");
        var chave = IdentidadePeca.chave(a);
        a.setClassificacaoApi("SP"); a.setClassificacaoAcea("C3"); a.setNormaOem("OEM"); a.setEspecificacao("Texto"); a.setNorma("Outra norma");
        assertEquals(chave, IdentidadePeca.chave(a));
        a.setOrigemOleo("MINERAL"); assertNotEquals(chave, IdentidadePeca.chave(a));
    }
    @Test void identidadePreservaVariantesEIgnoraCaixaAcentosEspacos() {
        var a = new Peca(); a.setNome("Óleo Teste"); a.setFabricante("Marca"); a.setModelo("Linha A"); a.setViscosidadeSae("5W-30");
        var b = new Peca(); b.setNome("  oleo teste "); b.setFabricante("MARCA"); b.setModelo("Linha A"); b.setViscosidadeSae("5w-30");
        assertEquals(IdentidadePeca.chave(a), IdentidadePeca.chave(b));
        b.setViscosidadeSae("10W-40"); assertNotEquals(IdentidadePeca.chave(a), IdentidadePeca.chave(b));
        b.setViscosidadeSae("5W-30"); b.setFabricante("Outra marca"); assertNotEquals(IdentidadePeca.chave(a), IdentidadePeca.chave(b));
    }
}
