package com.clinicar.backend.service;

import com.clinicar.backend.dto.VeiculoRequest;
import com.clinicar.backend.event.VeiculoAtualizadoEvent;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.repository.UsuarioRepository;
import com.clinicar.backend.repository.VeiculoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class VeiculoService {

    private final VeiculoRepository repo;
    private final UsuarioRepository usuarioRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final WhatsAppService whatsAppService;

    @Transactional
    public Veiculo criar(VeiculoRequest req) {
        log.info(
                "VeiculoService.criar recebeu: fabricante={}, modelo={}, placa={}, anoModeloCombustivel={}, idProprietario={}",
                req != null ? req.getFabricante() : null,
                req != null ? req.getModelo() : null,
                req != null ? req.getPlaca() : null,
                req != null ? req.getAnoModeloCombustivel() : null,
                req != null ? req.getIdProprietario() : null
        );

        validarCadastroVeiculo(req);

        Veiculo veiculo = new Veiculo();

        veiculo.setPlaca(normalizaPlaca(req.getPlaca()));
        veiculo.setFabricante(limparTexto(req.getFabricante()));
        veiculo.setCor(limparTexto(req.getCor()));
        veiculo.setModelo(limparTexto(req.getModelo()));
        veiculo.setAnoModeloCombustivel(limparTexto(req.getAnoModeloCombustivel()));
        veiculo.setIdProprietario(req.getIdProprietario());

        Veiculo salvo = repo.save(veiculo);

        log.info(
                "Veículo salvo: id={}, fabricante={}, modelo={}, placa={}, anoModeloCombustivel={}, idProprietario={}",
                salvo.getId(),
                salvo.getFabricante(),
                salvo.getModelo(),
                salvo.getPlaca(),
                salvo.getAnoModeloCombustivel(),
                salvo.getIdProprietario()
        );

        enviarNotificacaoCadastroVeiculo(salvo);

        return salvo;
    }

    @Transactional
    public Veiculo atualizar(Long id, Veiculo veiculoAtualizado) {
        log.info("VeiculoService.atualizar iniciado para veículo ID {}.", id);

        if (id == null) {
            throw new IllegalArgumentException("ID do veículo não informado.");
        }

        validarAtualizacaoVeiculo(veiculoAtualizado);

        Veiculo veiculo = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Veículo não encontrado."));

        String assinaturaAntes = assinaturaDadosVeiculo(veiculo);

        log.info("Veículo ID {} antes da atualização: {}", id, assinaturaAntes);

        preencherDadosVeiculo(veiculo, veiculoAtualizado);

        String assinaturaDepois = assinaturaDadosVeiculo(veiculo);

        boolean houveAlteracao = !Objects.equals(assinaturaAntes, assinaturaDepois);

        log.info("Veículo ID {} depois da atualização: {}", id, assinaturaDepois);

        log.info(
                "Resultado da atualização do veículo ID {}: houveAlteracao={}, idProprietario={}",
                id,
                houveAlteracao,
                veiculo.getIdProprietario()
        );

        Veiculo salvo = repo.save(veiculo);

        if (houveAlteracao) {
            Usuario proprietario = buscarProprietario(salvo);
            String parametroVeiculo = descricaoVeiculoParaWhatsapp(salvo);

            log.info(
                    "Publicando VeiculoAtualizadoEvent para veículo {}. Proprietário={}, telefone={}, parametroVeiculo={}",
                    salvo.getId(),
                    proprietario != null ? nomePreferencial(proprietario) : null,
                    proprietario != null ? proprietario.getTelefone() : null,
                    parametroVeiculo
            );

            eventPublisher.publishEvent(
                    new VeiculoAtualizadoEvent(
                            salvo.getId(),
                            proprietario != null ? nomePreferencial(proprietario) : "usuário",
                            proprietario != null ? proprietario.getTelefone() : null,
                            parametroVeiculo
                    )
            );
        } else {
            log.info(
                    "Nenhuma alteração detectada para veículo {}. WhatsApp não será enviado.",
                    salvo.getId()
            );
        }

        return salvo;
    }

    private void enviarNotificacaoCadastroVeiculo(Veiculo veiculo) {
        Usuario proprietario = buscarProprietario(veiculo);

        if (proprietario == null) {
            log.warn(
                    "Cadastro do veículo ID {} concluído, mas a notificação WhatsApp não foi enviada porque o proprietário não foi localizado.",
                    veiculo.getId()
            );
            return;
        }

        String nome = nomePreferencial(proprietario);
        String telefone = proprietario.getTelefone();
        String fabricante = valorSeguro(veiculo.getFabricante());
        String modelo = valorSeguro(veiculo.getModelo());
        String placa = veiculo.getPlaca();
        String parametroVeiculo = descricaoVeiculoParaWhatsapp(veiculo);

        log.info(
                "Enviando alerta de cadastro de veículo. veiculoId={}, telefone={}, parametro1Nome={}, parametro2Veiculo={}",
                veiculo.getId(),
                telefone,
                nome,
                parametroVeiculo
        );

        try {
            whatsAppService.enviarMensagemCadastroVeiculo(
                    telefone,
                    nome,
                    fabricante,
                    modelo,
                    placa
            );

            log.info(
                    "Alerta de cadastro de veículo enviado com sucesso. veiculoId={}, parametro2Veiculo={}",
                    veiculo.getId(),
                    parametroVeiculo
            );

        } catch (Exception e) {
            log.error(
                    "Veículo ID {} foi cadastrado, mas houve falha ao enviar WhatsApp de cadastro.",
                    veiculo.getId(),
                    e
            );
        }
    }

    private void preencherDadosVeiculo(
            Veiculo veiculo,
            Veiculo veiculoAtualizado
    ) {
        veiculo.setPlaca(normalizaPlaca(veiculoAtualizado.getPlaca()));
        veiculo.setFabricante(limparTexto(veiculoAtualizado.getFabricante()));
        veiculo.setCor(limparTexto(veiculoAtualizado.getCor()));
        veiculo.setModelo(limparTexto(veiculoAtualizado.getModelo()));
        veiculo.setAnoModeloCombustivel(limparTexto(veiculoAtualizado.getAnoModeloCombustivel()));
        veiculo.setIdProprietario(veiculoAtualizado.getIdProprietario());
    }

    private Usuario buscarProprietario(Veiculo veiculo) {
        if (veiculo.getIdProprietario() == null) {
            log.warn("Veículo ID {} não possui idProprietario informado.", veiculo.getId());
            return null;
        }

        return usuarioRepository.findById(veiculo.getIdProprietario())
                .orElseGet(() -> {
                    log.warn(
                            "Proprietário ID {} não encontrado para o veículo ID {}.",
                            veiculo.getIdProprietario(),
                            veiculo.getId()
                    );

                    return null;
                });
    }

    private String assinaturaDadosVeiculo(Veiculo veiculo) {
        return String.join(
                "|",
                valorSeguro(veiculo.getPlaca()),
                valorSeguro(veiculo.getFabricante()),
                valorSeguro(veiculo.getModelo()),
                valorSeguro(veiculo.getCor()),
                valorSeguro(veiculo.getAnoModeloCombustivel()),
                valorSeguro(veiculo.getIdProprietario())
        );
    }

    private String descricaoVeiculoParaWhatsapp(Veiculo veiculo) {
        String fabricante = valorSeguro(veiculo.getFabricante());
        String modelo = valorSeguro(veiculo.getModelo());
        String placa = veiculo.getPlaca();

        String descricao = (fabricante + " " + modelo).trim();

        if (descricao.isBlank()) {
            descricao = "Veículo";
        }

        if (placa != null && !placa.isBlank()) {
            descricao += " - Placa " + placa;
        }

        return descricao;
    }

    private String nomePreferencial(Usuario usuario) {
        if (usuario.getNome_social() != null && !usuario.getNome_social().isBlank()) {
            return usuario.getNome_social().trim();
        }

        if (usuario.getNome() != null && !usuario.getNome().isBlank()) {
            return usuario.getNome().trim();
        }

        return "usuário";
    }

    private String valorSeguro(Object valor) {
        return valor == null ? "" : String.valueOf(valor).trim();
    }

    private String limparTexto(String valor) {
        if (valor == null) {
            return null;
        }

        return valor.trim();
    }

    private String normalizaPlaca(String placa) {
        if (placa == null) {
            return null;
        }

        return placa.trim()
                .toUpperCase()
                .replaceAll("\\s+", "");
    }

    private void validarCadastroVeiculo(VeiculoRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("Dados do veículo não informados.");
        }

        if (req.getPlaca() == null || req.getPlaca().isBlank()) {
            throw new IllegalArgumentException("Informe a placa do veículo.");
        }

        if (req.getFabricante() == null || req.getFabricante().isBlank()) {
            throw new IllegalArgumentException("Informe o fabricante do veículo.");
        }

        if (req.getModelo() == null || req.getModelo().isBlank()) {
            throw new IllegalArgumentException("Informe o modelo do veículo.");
        }

        if (req.getAnoModeloCombustivel() == null || req.getAnoModeloCombustivel().isBlank()) {
            throw new IllegalArgumentException("Informe o ano/modelo/combustível do veículo.");
        }

        if (req.getIdProprietario() == null) {
            throw new IllegalArgumentException("Selecione o proprietário do veículo.");
        }
    }

    private void validarAtualizacaoVeiculo(Veiculo veiculo) {
        if (veiculo == null) {
            throw new IllegalArgumentException("Dados do veículo não informados.");
        }

        if (veiculo.getPlaca() == null || veiculo.getPlaca().isBlank()) {
            throw new IllegalArgumentException("Informe a placa do veículo.");
        }

        if (veiculo.getFabricante() == null || veiculo.getFabricante().isBlank()) {
            throw new IllegalArgumentException("Informe o fabricante do veículo.");
        }

        if (veiculo.getModelo() == null || veiculo.getModelo().isBlank()) {
            throw new IllegalArgumentException("Informe o modelo do veículo.");
        }

        if (veiculo.getAnoModeloCombustivel() == null || veiculo.getAnoModeloCombustivel().isBlank()) {
            throw new IllegalArgumentException("Informe o ano/modelo/combustível do veículo.");
        }

        if (veiculo.getIdProprietario() == null) {
            throw new IllegalArgumentException("Selecione o proprietário do veículo.");
        }
    }
}