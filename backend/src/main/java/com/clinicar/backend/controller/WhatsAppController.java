package com.clinicar.backend.controller;

import com.clinicar.backend.dto.WhatsAppCadastroUsuarioDTO;
import com.clinicar.backend.dto.WhatsAppCadastroVeiculoRequest;
import com.clinicar.backend.service.WhatsAppService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/whatsapp")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class WhatsAppController {

    private final WhatsAppService whatsAppService;

    public WhatsAppController(WhatsAppService whatsAppService) {
        this.whatsAppService = whatsAppService;
    }

    @PostMapping("/cadastro-veiculo")
    public ResponseEntity<String> enviarMensagemCadastroVeiculo(
            @RequestBody WhatsAppCadastroVeiculoRequest request
    ) {
        /*
         * O template e o idioma NÃO devem vir do frontend.
         *
         * O frontend deve enviar apenas:
         * - telefone
         * - nome
         * - fabricante
         * - modelo
         * - placa
         *
         * O backend monta o parâmetro {{2}} no formato:
         * fabricante modelo - Placa placa
         */
        String nome = "";
        try {
            java.lang.reflect.Method getNomeMethod = request.getClass().getMethod("getNome");
            Object nomeObj = getNomeMethod.invoke(request);
            if (nomeObj != null) {
                nome = String.valueOf(nomeObj);
            }
        } catch (NoSuchMethodException | IllegalAccessException | java.lang.reflect.InvocationTargetException ignored) {
            // Alguns payloads de cadastro de veículo podem não expor o campo nome diretamente.
        }

        String fabricante = "";
        try {
            java.lang.reflect.Method getFabricanteMethod = request.getClass().getMethod("getFabricante");
            Object fabricanteObj = getFabricanteMethod.invoke(request);
            if (fabricanteObj != null) {
                fabricante = String.valueOf(fabricanteObj);
            }
        } catch (NoSuchMethodException | IllegalAccessException | java.lang.reflect.InvocationTargetException ignored) {
            try {
                java.lang.reflect.Method getMarcaMethod = request.getClass().getMethod("getMarca");
                Object marcaObj = getMarcaMethod.invoke(request);
                if (marcaObj != null) {
                    fabricante = String.valueOf(marcaObj);
                }
            } catch (NoSuchMethodException | IllegalAccessException | java.lang.reflect.InvocationTargetException ignoredToo) {
                // Alguns payloads podem usar nomenclaturas diferentes para fabricante/marca.
            }
        }

        String modelo = "";
        try {
            java.lang.reflect.Method getModeloMethod = request.getClass().getMethod("getModelo");
            Object modeloObj = getModeloMethod.invoke(request);
            if (modeloObj != null) {
                modelo = String.valueOf(modeloObj);
            }
        } catch (NoSuchMethodException | IllegalAccessException | java.lang.reflect.InvocationTargetException ignored) {
            try {
                java.lang.reflect.Method getModelMethod = request.getClass().getMethod("getModel");
                Object modelObj = getModelMethod.invoke(request);
                if (modelObj != null) {
                    modelo = String.valueOf(modelObj);
                }
            } catch (NoSuchMethodException | IllegalAccessException | java.lang.reflect.InvocationTargetException ignoredToo) {
                // Alguns payloads podem usar nomenclaturas diferentes para modelo.
            }
        }

        String placa = "";
        try {
            java.lang.reflect.Method getPlacaMethod = request.getClass().getMethod("getPlaca");
            Object placaObj = getPlacaMethod.invoke(request);
            if (placaObj != null) {
                placa = String.valueOf(placaObj);
            }
        } catch (NoSuchMethodException | IllegalAccessException | java.lang.reflect.InvocationTargetException ignored) {
            try {
                java.lang.reflect.Method getPlateMethod = request.getClass().getMethod("getPlate");
                Object plateObj = getPlateMethod.invoke(request);
                if (plateObj != null) {
                    placa = String.valueOf(plateObj);
                }
            } catch (NoSuchMethodException | IllegalAccessException | java.lang.reflect.InvocationTargetException ignoredToo) {
                // Alguns payloads podem usar nomenclaturas diferentes para placa.
            }
        }

        String resposta = whatsAppService.enviarMensagemCadastroVeiculo(
                request.getTelefone(),
                nome,
                fabricante,
                modelo,
                placa
        );

        return ResponseEntity.ok(resposta);
    }

    @PostMapping("/cadastro-usuario")
    public ResponseEntity<String> enviarMensagemCadastroUsuario(
            @RequestBody WhatsAppCadastroUsuarioDTO request
    ) {
        String resposta = whatsAppService.enviarMensagemCadastroUsuario(
                request.getTelefone(),
                request.getNome()
        );

        return ResponseEntity.ok(resposta);
    }
}