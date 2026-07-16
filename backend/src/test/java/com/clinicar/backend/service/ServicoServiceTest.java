package com.clinicar.backend.service;

import com.clinicar.backend.dto.ServicoRequest;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.repository.FornecedorRepository;
import com.clinicar.backend.repository.ServicoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ServicoServiceTest {

    @Mock
    private ServicoRepository servicoRepository;

    @Mock
    private FornecedorRepository fornecedorRepository;

    @InjectMocks
    private ServicoService servicoService;

    @Test
    void criarServicoComDadosValidosSemFornecedor() {
        ServicoRequest req = new ServicoRequest();

        req.setNome("Troca de Óleo");
        req.setDescricao("Serviço de troca de óleo do motor.");
        req.setCategoria("Manutenção Preventiva");
        req.setTipoDoPrestador("Mecânico");

        req.setDuracaoEstimada("40");
        req.setUnidadeDuracao("MINUTO");

        req.setValorBase("80.00");
        req.setUnidadeCobranca("SERVICO");

        req.setGarantiaDias(30);
        req.setNecessitaPecas(true);
        req.setAtivo(true);
        req.setObservacoes("Não inclui óleo e filtro.");
        req.setIdFornecedor(null);

        when(servicoRepository.existsByNomeIgnoreCaseAndCategoriaIgnoreCase(
                "Troca de Óleo",
                "Manutenção Preventiva"
        )).thenReturn(false);

        when(servicoRepository.save(any(Servico.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Servico salvo = servicoService.criar(req);

        ArgumentCaptor<Servico> captor = ArgumentCaptor.forClass(Servico.class);
        verify(servicoRepository).save(captor.capture());

        Servico servico = captor.getValue();

        assertEquals("Troca de Óleo", servico.getNome());
        assertEquals("Serviço de troca de óleo do motor.", servico.getDescricao());
        assertEquals("Manutenção Preventiva", servico.getCategoria());
        assertEquals("Mecânico", servico.getTipoDoPrestador());

        assertEquals(0, new BigDecimal("40").compareTo(servico.getDuracaoEstimada()));
        assertEquals("MINUTO", servico.getUnidadeDuracao());

        assertEquals(0, new BigDecimal("80.00").compareTo(servico.getValorBase()));
        assertEquals("SERVICO", servico.getUnidadeCobranca());

        assertEquals(30, servico.getGarantiaDias());
        assertTrue(servico.getNecessitaPecas());
        assertTrue(servico.getAtivo());
        assertEquals("Não inclui óleo e filtro.", servico.getObservacoes());

        assertNull(servico.getFornecedor());

        assertSame(servico, salvo);
    }

    @Test
    void criarServicoComFornecedorValido() {
        ServicoRequest req = new ServicoRequest();

        req.setNome("Guincho");
        req.setDescricao("Serviço terceirizado de guincho.");
        req.setCategoria("Assistência");
        req.setTipoDoPrestador("Fornecedor Externo");

        req.setDuracaoEstimada("1");
        req.setUnidadeDuracao("HORA");

        req.setValorBase("250,50");
        req.setUnidadeCobranca("SERVICO");

        req.setGarantiaDias(0);
        req.setNecessitaPecas(false);
        req.setAtivo(true);
        req.setObservacoes("Serviço executado por parceiro externo.");
        req.setIdFornecedor(1L);

        Fornecedor fornecedor = new Fornecedor();
        fornecedor.setId(1L);
        fornecedor.setRazaoSocial("Fornecedor Teste");

        when(servicoRepository.existsByNomeIgnoreCaseAndCategoriaIgnoreCase(
                "Guincho",
                "Assistência"
        )).thenReturn(false);

        when(fornecedorRepository.findById(1L))
                .thenReturn(Optional.of(fornecedor));

        when(servicoRepository.save(any(Servico.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Servico salvo = servicoService.criar(req);

        assertEquals("Guincho", salvo.getNome());
        assertEquals("Assistência", salvo.getCategoria());
        assertEquals("Fornecedor Externo", salvo.getTipoDoPrestador());

        assertEquals(0, new BigDecimal("1").compareTo(salvo.getDuracaoEstimada()));
        assertEquals("HORA", salvo.getUnidadeDuracao());

        assertEquals(0, new BigDecimal("250.50").compareTo(salvo.getValorBase()));
        assertEquals("SERVICO", salvo.getUnidadeCobranca());

        assertNotNull(salvo.getFornecedor());
        assertEquals(1L, salvo.getFornecedor().getId());
        assertEquals("Fornecedor Teste", salvo.getFornecedor().getRazaoSocial());

        verify(fornecedorRepository).findById(1L);
        verify(servicoRepository).save(any(Servico.class));
    }

    @Test
    void criarServicoComNomeECategoriaDuplicadosDeveLancarErro() {
        ServicoRequest req = new ServicoRequest();

        req.setNome("Troca de Óleo");
        req.setDescricao("Serviço de troca de óleo.");
        req.setCategoria("Manutenção Preventiva");
        req.setTipoDoPrestador("Mecânico");

        req.setDuracaoEstimada("40");
        req.setUnidadeDuracao("MINUTO");

        req.setValorBase("80.00");
        req.setUnidadeCobranca("SERVICO");

        req.setGarantiaDias(30);
        req.setNecessitaPecas(true);
        req.setAtivo(true);
        req.setIdFornecedor(null);

        when(servicoRepository.existsByNomeIgnoreCaseAndCategoriaIgnoreCase(
                "Troca de Óleo",
                "Manutenção Preventiva"
        )).thenReturn(true);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> servicoService.criar(req)
        );

        assertEquals(
                "Já existe um serviço cadastrado com este nome nesta categoria.",
                ex.getMessage()
        );

        verify(servicoRepository, never()).save(any(Servico.class));
    }

    @Test
    void criarServicoComValorBaseInvalidoDeveLancarErro() {
        ServicoRequest req = new ServicoRequest();

        req.setNome("Alinhamento");
        req.setDescricao("Serviço de alinhamento.");
        req.setCategoria("Pneus");
        req.setTipoDoPrestador("Mecânico");

        req.setDuracaoEstimada("30");
        req.setUnidadeDuracao("MINUTO");

        req.setValorBase("valor-invalido");
        req.setUnidadeCobranca("SERVICO");

        req.setGarantiaDias(0);
        req.setNecessitaPecas(false);
        req.setAtivo(true);

        when(servicoRepository.existsByNomeIgnoreCaseAndCategoriaIgnoreCase(
                "Alinhamento",
                "Pneus"
        )).thenReturn(false);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> servicoService.criar(req)
        );

        assertEquals("Valor base inválido.", ex.getMessage());

        verify(servicoRepository, never()).save(any(Servico.class));
    }

    @Test
    void criarServicoComDuracaoMenorOuIgualAZeroDeveLancarErro() {
        ServicoRequest req = new ServicoRequest();

        req.setNome("Diagnóstico Eletrônico");
        req.setDescricao("Diagnóstico com scanner automotivo.");
        req.setCategoria("Diagnóstico");
        req.setTipoDoPrestador("Técnico Especializado");

        req.setDuracaoEstimada("0");
        req.setUnidadeDuracao("MINUTO");

        req.setValorBase("120.00");
        req.setUnidadeCobranca("SERVICO");

        req.setGarantiaDias(0);
        req.setNecessitaPecas(false);
        req.setAtivo(true);

        when(servicoRepository.existsByNomeIgnoreCaseAndCategoriaIgnoreCase(
                "Diagnóstico Eletrônico",
                "Diagnóstico"
        )).thenReturn(false);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> servicoService.criar(req)
        );

        assertEquals("A duração estimada deve ser maior que zero.", ex.getMessage());

        verify(servicoRepository, never()).save(any(Servico.class));
    }
}