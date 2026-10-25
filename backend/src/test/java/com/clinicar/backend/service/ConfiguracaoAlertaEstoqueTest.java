package com.clinicar.backend.service;

import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ConfiguracaoAlertaEstoqueTest {
    final ConfiguracaoAlertaEstoqueRepository configs = mock(ConfiguracaoAlertaEstoqueRepository.class);
    final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    final ConfiguracaoAlertaEstoqueService service = new ConfiguracaoAlertaEstoqueService(configs, usuarios, new com.clinicar.backend.config.TemplateAlertaEstoqueConfig("alerta_estoque_peca", "pt_BR"));
    final ConfiguracaoAlertaEstoque atual = new ConfiguracaoAlertaEstoque();
    final Usuario usuario = new Usuario();
    final Usuario administrador = new Usuario();
    ConfiguracaoAlertaEstoqueTest() {
        atual.setId(1L); atual.setVersao(0L); when(configs.bloquear()).thenReturn(Optional.of(atual));
        when(configs.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        usuario.setId(2L); usuario.setNome("Responsável"); usuario.setStatus("ATIVO"); usuario.setTipo_do_acesso("COLABORADOR"); usuario.setTelefone("+55 (11) 99999-9999");
        when(usuarios.findById(2L)).thenReturn(Optional.of(usuario));
        administrador.setId(3L); administrador.setNome("Administrador"); administrador.setStatus("ATIVO"); administrador.setTipo_do_acesso("ADMINISTRADOR"); administrador.setTelefone("+55 (11) 98888-8888");
        when(usuarios.findById(3L)).thenReturn(Optional.of(administrador));
    }
    ConfiguracaoAlertaEstoque entrada() {
        var c = new ConfiguracaoAlertaEstoque(); c.setVersao(0L); c.setIdResponsavel(2L); c.setIdAdministradorCritico(3L); return c;
    }
    @Test void semConfiguracaoConsultaDesativada() { assertFalse(service.consultar().getAtivo()); }
    @Test void recriaRegistroPadraoQuandoBancoLimpoERespeitaDestinatariosEscolhidos() {
        when(configs.bloquear()).thenReturn(Optional.empty(), Optional.of(atual));
        var c = entrada(); c.setVersao(null); c.setAtivo(false);
        var salvo = service.salvar(c);
        verify(configs).criarPadraoSeAusente();
        assertEquals(2L, salvo.getIdResponsavel());
        assertEquals(3L, salvo.getIdAdministradorCritico());
        assertEquals("5511999999999", salvo.getTelefoneAdministrador());
    }
    @Test void usaIdentidadeETelefoneDoUsuarioSemConfiarNoCorpoDaRequisicao() {
        var c = entrada(); c.setNomeResponsavel("Nome adulterado"); c.setTelefoneAdministrador("000");
        c.setNomeAdministradorCritico("Outro nome"); c.setTelefoneAdministradorCritico("000");
        var salvo = service.salvar(c); assertEquals("Responsável", salvo.getNomeResponsavel()); assertEquals("5511999999999", salvo.getTelefoneAdministrador());
        assertEquals("Administrador", salvo.getNomeAdministradorCritico()); assertEquals("5511988888888", salvo.getTelefoneAdministradorCritico());
    }
    @Test void rejeitaResponsavelInativoClienteOuSemTelefone() {
        usuario.setStatus("INATIVO"); assertThrows(IllegalArgumentException.class, () -> service.salvar(entrada()));
        usuario.setStatus("ATIVO"); usuario.setTipo_do_acesso("CLIENTE"); assertThrows(IllegalArgumentException.class, () -> service.salvar(entrada()));
        usuario.setTipo_do_acesso("ADMINISTRADOR"); usuario.setTelefone(""); assertThrows(IllegalArgumentException.class, () -> service.salvar(entrada()));
        usuario.setTipo_do_acesso("COLABORADOR"); usuario.setTelefone("+55 (11) 99999-9999");
        administrador.setStatus("INATIVO"); assertThrows(IllegalArgumentException.class, () -> service.salvar(entrada()));
        administrador.setStatus("ATIVO"); administrador.setTipo_do_acesso("COLABORADOR"); assertThrows(IllegalArgumentException.class, () -> service.salvar(entrada()));
        administrador.setTipo_do_acesso("ADMINISTRADOR"); administrador.setTelefone(""); assertThrows(IllegalArgumentException.class, () -> service.salvar(entrada()));
        verify(configs, never()).saveAndFlush(any());
    }
    @Test void rejeitaIntervaloInvalidoEAlteracaoConcorrente() {
        var c = entrada(); c.setReenviarAlertaAposHoras(0); assertThrows(IllegalArgumentException.class, () -> service.salvar(c));
        c.setReenviarAlertaAposHoras(24); c.setVersao(99L); assertThrows(IllegalArgumentException.class, () -> service.salvar(c));
        verify(configs, never()).saveAndFlush(any());
    }
    @Test void ignoraTemplateEIdiomaEnviadosPeloUsuario() {
        var c = entrada(); c.setTemplateWhatsapp("template_adulterado"); c.setIdiomaTemplate("en_US");
        var salvo = service.salvar(c);
        assertEquals("alerta_estoque_peca", salvo.getTemplateWhatsapp()); assertEquals("pt_BR", salvo.getIdiomaTemplate());
    }
    @Test void permitePausarEnviosQuandoResponsavelFicouInativo() {
        usuario.setStatus("INATIVO"); var c = entrada(); c.setAtivo(false); assertFalse(service.salvar(c).getAtivo());
    }
}
