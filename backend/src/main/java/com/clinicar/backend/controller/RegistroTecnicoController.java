package com.clinicar.backend.controller;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.AtendimentoChecklist;
import com.clinicar.backend.model.AtendimentoFoto;
import com.clinicar.backend.repository.AtendimentoChecklistRepository;
import com.clinicar.backend.repository.AtendimentoFotoRepository;
import com.clinicar.backend.repository.AtendimentoRepository;
import com.clinicar.backend.service.PermissaoColaboradorService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/colaborador/meus-atendimentos")
public class RegistroTecnicoController {
    private static final Set<String> ITENS = Set.of("IDENTIFICACAO_VEICULO", "NIVEIS_FLUIDOS", "FREIOS", "PNEUS", "TESTE_FINAL");
    private static final Set<String> SITUACOES = Set.of("OK", "ATENCAO", "NAO_APLICAVEL");
    private final AtendimentoRepository atendimentos;
    private final AtendimentoChecklistRepository checklist;
    private final AtendimentoFotoRepository fotos;
    private final PermissaoColaboradorService permissoes;

    public RegistroTecnicoController(AtendimentoRepository atendimentos, AtendimentoChecklistRepository checklist,
            AtendimentoFotoRepository fotos, PermissaoColaboradorService permissoes) {
        this.atendimentos = atendimentos; this.checklist = checklist; this.fotos = fotos; this.permissoes = permissoes;
    }

    public record Item(String item, String situacao, String observacao) {}
    public record FotoEntrada(String nomeArquivo, String tipoMime, String conteudoBase64) {}
    public record FotoResumo(Long id, String nomeArquivo, String tipoMime, Integer tamanhoBytes, Long autorId, LocalDateTime registradoEm) {}

    @GetMapping("/{id}/checklist")
    public List<AtendimentoChecklist> consultarChecklist(@PathVariable Long id,
            @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        autorizar(id, sessao, false);
        return checklist.findByAtendimentoIdOrderByItem(id);
    }

    @PutMapping("/{id}/checklist")
    @Transactional
    public List<AtendimentoChecklist> salvarChecklist(@PathVariable Long id, @RequestBody List<Item> itens,
            @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        autorizar(id, sessao, true);
        if (itens == null || itens.isEmpty() || itens.size() > ITENS.size())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione os itens do checklist.");
        var vistos = new HashSet<String>();
        for (var item : itens) {
            if (item == null || !ITENS.contains(item.item()) || !SITUACOES.contains(item.situacao())
                    || !vistos.add(item.item()) || item.observacao() != null && item.observacao().length() > 500)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Item de checklist inválido ou duplicado.");
            var registro = checklist.findByAtendimentoIdAndItem(id, item.item()).orElseGet(AtendimentoChecklist::new);
            registro.setAtendimentoId(id); registro.setAutorId(sessao.getId()); registro.setItem(item.item());
            registro.setSituacao(item.situacao()); registro.setObservacao(item.observacao() == null ? null : item.observacao().strip());
            checklist.save(registro);
        }
        checklist.flush();
        return checklist.findByAtendimentoIdOrderByItem(id);
    }

    @GetMapping("/{id}/fotos")
    public List<FotoResumo> listarFotos(@PathVariable Long id, @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        autorizar(id, sessao, false);
        return fotos.listarMetadados(id).stream().map(r -> new FotoResumo((Long) r[0], (String) r[1], (String) r[2],
                (Integer) r[3], (Long) r[4], (LocalDateTime) r[5])).toList();
    }

    @GetMapping("/{id}/fotos/{fotoId}")
    public ResponseEntity<byte[]> abrirFoto(@PathVariable Long id, @PathVariable Long fotoId,
            @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        autorizar(id, sessao, false);
        var foto = fotos.findByIdAndAtendimentoId(fotoId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto não encontrada."));
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(foto.getTipoMime()))
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(foto.getConteudo());
    }

    @PostMapping("/{id}/fotos")
    @Transactional
    public FotoResumo adicionarFoto(@PathVariable Long id, @RequestBody FotoEntrada entrada,
            @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        autorizar(id, sessao, true);
        if (fotos.countByAtendimentoId(id) >= 10) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Limite de dez fotos por atendimento.");
        if (entrada == null || entrada.nomeArquivo() == null || entrada.nomeArquivo().isBlank()
                || entrada.nomeArquivo().length() > 180 || entrada.conteudoBase64() == null
                || entrada.conteudoBase64().length() > 4_200_000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione uma foto de até 3 MB.");
        byte[] conteudo;
        try { conteudo = Base64.getDecoder().decode(entrada.conteudoBase64()); }
        catch (IllegalArgumentException erro) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo inválido."); }
        if (conteudo.length < 12 || conteudo.length > 3_000_000 || !imagemValida(entrada.tipoMime(), conteudo))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie uma imagem JPEG, PNG ou WebP válida de até 3 MB.");
        var foto = new AtendimentoFoto();
        foto.setAtendimentoId(id); foto.setAutorId(sessao.getId());
        foto.setNomeArquivo(entrada.nomeArquivo().replaceAll("[\\r\\n]", " ").strip());
        foto.setTipoMime(entrada.tipoMime()); foto.setTamanhoBytes(conteudo.length); foto.setConteudo(conteudo);
        foto = fotos.saveAndFlush(foto);
        return new FotoResumo(foto.getId(), foto.getNomeArquivo(), foto.getTipoMime(), foto.getTamanhoBytes(),
                foto.getAutorId(), foto.getRegistradoEm());
    }

    private boolean imagemValida(String mime, byte[] b) {
        if ("image/jpeg".equals(mime)) return (b[0] & 255) == 0xff && (b[1] & 255) == 0xd8 && (b[2] & 255) == 0xff;
        if ("image/png".equals(mime)) return (b[0] & 255) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
        if ("image/webp".equals(mime)) return b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
        return false;
    }

    private Atendimento autorizar(Long id, UsuarioResponse sessao, boolean alterar) {
        if (sessao == null || !"ATIVO".equalsIgnoreCase(sessao.getStatus()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sessão sem acesso ao atendimento.");
        var atendimento = atendimentos.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        boolean admin = "ADMINISTRADOR".equalsIgnoreCase(sessao.getTipo_do_acesso());
        boolean atribuido = "COLABORADOR".equalsIgnoreCase(sessao.getTipo_do_acesso())
                && atendimento.getResponsavel() != null && Objects.equals(atendimento.getResponsavel().getId(), sessao.getId())
                && permissoes.podeMecanica(sessao.getId());
        if (!admin && !atribuido) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Atendimento não atribuído a você.");
        if (alterar && Set.of("CANCELADO", "CONCLUIDO", "ENTREGUE").contains(atendimento.getStatusAtendimento()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O atendimento já foi encerrado.");
        return atendimento;
    }
}
