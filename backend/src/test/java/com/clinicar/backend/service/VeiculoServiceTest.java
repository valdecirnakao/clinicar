package com.clinicar.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.clinicar.backend.dto.VeiculoRequest;
import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.repository.VeiculoRepository;
import com.clinicar.backend.repository.AgendamentoRepository;
import com.clinicar.backend.repository.AtendimentoRepository;
import org.springframework.web.server.ResponseStatusException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VeiculoServiceTest {

    @Mock
    private VeiculoRepository repo;

    @Mock
    private com.clinicar.backend.repository.UsuarioRepository usuarioRepository;

    @Mock
    private WhatsAppService whatsAppService;

    @Mock private AgendamentoRepository agendamentos;
    @Mock private AtendimentoRepository atendimentos;

    @InjectMocks
    private VeiculoService service;

    @Test
    void criarNormalizaPlacaEMapeiaCampos() {
        VeiculoRequest req = new VeiculoRequest();
        req.setPlaca(" ab c 1234 ");
        req.setFabricante("Toyota");
        req.setCor("Preto");
        req.setModelo("Corolla");
        req.setAnoModeloCombustivel("2025/2026 Flex");
        req.setIdProprietario(42L);

        when(repo.saveAndFlush(any(Veiculo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var dono = new com.clinicar.backend.model.Usuario(); dono.setId(42L); dono.setStatus("ATIVO");
        when(usuarioRepository.findById(42L)).thenReturn(java.util.Optional.of(dono));
        Veiculo salvo = service.criar(req);

        ArgumentCaptor<Veiculo> captor = ArgumentCaptor.forClass(Veiculo.class);
        verify(repo).saveAndFlush(captor.capture());

        Veiculo veiculo = captor.getValue();
        assertEquals("ABC1234", veiculo.getPlaca());
        assertEquals("Toyota", veiculo.getFabricante());
        assertEquals("Preto", veiculo.getCor());
        assertEquals("Corolla", veiculo.getModelo());
        assertEquals("2025/2026 Flex", veiculo.getAnoModeloCombustivel());
        assertEquals(42L, veiculo.getIdProprietario());
        assertEquals(veiculo, salvo);
    }

    @Test
    void criarRejeitaPlacaNula() {
        VeiculoRequest req = new VeiculoRequest(); req.setIdProprietario(1L);
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class, () -> service.criar(req));
        org.mockito.Mockito.verify(repo, org.mockito.Mockito.never()).saveAndFlush(any(Veiculo.class));
    }

    @Test
    void clienteNaoAlteraIdentificacaoComHistorico() {
        Veiculo atual = new Veiculo(); atual.setId(7L); atual.setIdProprietario(4L);
        atual.setPlaca("ABC1234"); atual.setFabricante("Ford"); atual.setModelo("Ka");
        atual.setAnoModeloCombustivel("2020 Flex"); atual.setCor("Azul");
        Veiculo alteracao = new Veiculo(); alteracao.setPlaca("ABC1234");
        alteracao.setFabricante("Ford"); alteracao.setModelo("Fiesta");
        alteracao.setAnoModeloCombustivel("2020 Flex"); alteracao.setCor("Vermelho");
        when(repo.buscarParaExclusao(7L)).thenReturn(java.util.Optional.of(atual));
        when(agendamentos.existsByVeiculo_Id(7L)).thenReturn(true);

        ResponseStatusException erro = assertThrows(ResponseStatusException.class,
                () -> service.atualizarPorProprietario(7L, 4L, alteracao));
        assertEquals(409, erro.getStatusCode().value());
        org.mockito.Mockito.verify(repo, org.mockito.Mockito.never()).saveAndFlush(any(Veiculo.class));
    }

    @Test
    void clienteNaoAlteraVeiculoDeOutroProprietario() {
        Veiculo atual = new Veiculo(); atual.setIdProprietario(9L);
        when(repo.buscarParaExclusao(7L)).thenReturn(java.util.Optional.of(atual));
        ResponseStatusException erro = assertThrows(ResponseStatusException.class,
                () -> service.atualizarPorProprietario(7L, 4L, new Veiculo()));
        assertEquals(403, erro.getStatusCode().value());
    }
}
