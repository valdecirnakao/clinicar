package com.clinicar.backend.service;

import com.clinicar.backend.mapper.AtendimentoMapper;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.repository.AtendimentoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.parser.PdfTextExtractor;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrdemServicoHistoricoTest {
    @Mock OrdemServicoPdfService pdfService;
    @Mock EmailAnexoService emailService;
    @Mock AtendimentoRepository repository;
    @InjectMocks OrdemServicoEnvioService service;
    Atendimento atendimento;
    Veiculo veiculo;

    @BeforeEach
    void preparar() {
        veiculo = new Veiculo();
        veiculo.setId(7L);
        veiculo.setPlaca("ABC1234");
        veiculo.setFabricante("Toyota");
        veiculo.setModelo("Corolla");
        Usuario cliente = new Usuario();
        cliente.setNome("Cliente");
        cliente.setEmail("cliente@example.com");
        atendimento = new Atendimento();
        atendimento.setId(1L);
        atendimento.setCodigoAtendimento("AT-1");
        atendimento.setStatusAtendimento("CONCLUIDO");
        atendimento.setVeiculo(veiculo);
        atendimento.setCliente(cliente);
    }

    void prepararEnvio() {
        when(repository.save(atendimento)).thenReturn(atendimento);
        when(pdfService.gerarNomeArquivo(atendimento)).thenReturn("os.pdf");
    }

    @Test
    void atendimentoAbertoAcompanhaCadastroMasPreservadoNaoMuda() {
        AtendimentoMapper mapper = new AtendimentoMapper();
        veiculo.setPlaca("DEF5678");
        assertEquals("DEF5678", mapper.toResponse(atendimento).getPlacaVeiculo());
        atendimento.preservarDadosVeiculo();
        LocalDateTime preservadoEm = atendimento.getVeiculoPreservadoEm();
        veiculo.setPlaca("XYZ9999");
        veiculo.setModelo("Yaris");
        veiculo.setFabricante("Outro");
        atendimento.preservarDadosVeiculo();
        var response = mapper.toResponse(atendimento);
        assertEquals("DEF5678", response.getPlacaVeiculo());
        assertEquals("Corolla", response.getModeloVeiculo());
        assertEquals("Toyota", response.getFabricanteVeiculo());
        assertEquals(preservadoEm, atendimento.getVeiculoPreservadoEm());
    }

    @Test
    void pdfUsaVeiculoHistoricoAposAlteracaoDoCadastro() throws Exception {
        atendimento.preservarDadosVeiculo();
        veiculo.setPlaca("XYZ9999");
        veiculo.setModelo("Yaris");
        byte[] pdf = new OrdemServicoPdfService().gerarPdf(atendimento);
        PdfReader reader = new PdfReader(pdf);
        try {
            PdfTextExtractor extractor = new PdfTextExtractor(reader);
            StringBuilder text = new StringBuilder();
            for (int page = 1; page <= reader.getNumberOfPages(); page++) {
                text.append(extractor.getTextFromPage(page));
            }
            assertTrue(text.toString().contains("Corolla"));
            assertTrue(text.toString().contains("ABC-1234") || text.toString().contains("ABC1234"));
            assertFalse(text.toString().contains("XYZ9999"));
            assertFalse(text.toString().contains("Yaris"));
        } finally {
            reader.close();
        }
    }

    @Test
    void reenvioReutilizaPdfOriginalMesmoAposAlterarVeiculoECliente() {
        prepararEnvio();
        byte[] pdf = new byte[]{1, 2, 3};
        when(pdfService.gerarPdf(atendimento)).thenReturn(pdf);
        service.enviarOrdemServicoPorEmail(atendimento);
        LocalDateTime emissao = atendimento.getOsPdfGeradaEm();
        veiculo.setPlaca("XYZ9999");
        veiculo.setModelo("Yaris");
        atendimento.getCliente().setNome("Nome atualizado");
        service.enviarOrdemServicoPorEmail(atendimento);
        verify(pdfService, times(1)).gerarPdf(atendimento);
        verify(emailService, times(2)).enviarEmailComAnexo(anyString(), anyString(), anyString(), eq("os.pdf"), same(pdf));
        assertArrayEquals(pdf, atendimento.getOsPdfOriginal());
        assertEquals(emissao, atendimento.getOsPdfGeradaEm());
        assertEquals("ABC1234", atendimento.placaVeiculoDoAtendimento());
    }

    @Test
    void falhaDeEmailPreservaPdfParaNovaTentativa() {
        prepararEnvio();
        byte[] pdf = new byte[]{4, 5};
        when(pdfService.gerarPdf(atendimento)).thenReturn(pdf);
        doThrow(new IllegalStateException("Falha de e-mail")).doNothing()
                .when(emailService).enviarEmailComAnexo(anyString(), anyString(), anyString(), anyString(), any(byte[].class));
        service.enviarOrdemServicoPorEmail(atendimento);
        assertFalse(atendimento.getOsEnviadaEmail());
        assertArrayEquals(pdf, atendimento.getOsPdfOriginal());
        veiculo.setPlaca("XYZ9999");
        service.enviarOrdemServicoPorEmail(atendimento);
        assertTrue(atendimento.getOsEnviadaEmail());
        assertNull(atendimento.getOsUltimoErro());
        verify(pdfService, times(1)).gerarPdf(atendimento);
    }

    @Test
    void osAntigaSemPdfOriginalNaoEhRecriadaComCadastroAtual() {
        when(repository.save(atendimento)).thenReturn(atendimento);
        LocalDateTime emissao = LocalDateTime.of(2025, 1, 1, 10, 0);
        atendimento.setOsPdfGeradaEm(emissao);
        atendimento.setOsEnviadaEmail(true);
        service.enviarOrdemServicoPorEmail(atendimento);
        assertFalse(atendimento.getOsEnviadaEmail());
        assertTrue(atendimento.getOsUltimoErro().contains("documento original"));
        assertEquals(emissao, atendimento.getOsPdfGeradaEm());
        verifyNoInteractions(pdfService, emailService);
    }

    @Test
    void falhaAntesDaGeracaoNaoRegistraEmissaoInexistente() {
        when(repository.save(atendimento)).thenReturn(atendimento);
        atendimento.getCliente().setEmail(null);
        service.enviarOrdemServicoPorEmail(atendimento);
        assertNull(atendimento.getOsPdfGeradaEm());
        assertNull(atendimento.getOsPdfOriginal());
        verifyNoInteractions(pdfService, emailService);
    }
}
