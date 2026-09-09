package com.clinicar.backend.service;

import com.clinicar.backend.dto.setup.AdministradorInicialRequest;
import com.clinicar.backend.dto.setup.DefinirSenhaInicialRequest;
import com.clinicar.backend.dto.setup.MensagemResponse;
import com.clinicar.backend.dto.setup.SetupStatusResponse;
import com.clinicar.backend.dto.setup.ValidarTokenResponse;
import com.clinicar.backend.event.AtivacaoAdministradorSolicitadaEvent;
import com.clinicar.backend.model.ConfiguracaoSistema;
import com.clinicar.backend.model.TokenAtivacaoUsuario;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.model.enums.EstadoSetup;
import com.clinicar.backend.repository.ConfiguracaoSistemaRepository;
import com.clinicar.backend.repository.TokenAtivacaoUsuarioRepository;
import com.clinicar.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PrimeiroAcessoService {

    private static final Long CONFIGURACAO_ID = 1L;

    private static final String TIPO_TOKEN_ATIVACAO_INICIAL =
            "ATIVACAO_INICIAL";

    private static final String TIPO_ACESSO_ADMINISTRADOR =
            "ADMINISTRADOR";

    private static final String STATUS_PENDENTE_ATIVACAO =
            "PENDENTE_ATIVACAO";

    private static final String STATUS_ATIVO =
            "ATIVO";

    private final UsuarioRepository usuarioRepository;

    private final ConfiguracaoSistemaRepository
            configuracaoSistemaRepository;

    private final TokenAtivacaoUsuarioRepository
            tokenAtivacaoUsuarioRepository;

    private final TokenUsuarioService tokenUsuarioService;

    private final PasswordEncoder passwordEncoder;

    private final ApplicationEventPublisher eventPublisher;

    /**
     * Tempo de validade do link de ativação.
     *
     * application.properties:
     *
     * clinicar.setup.token-validade-minutos=
     *     ${SETUP_TOKEN_MINUTES:60}
     */
    @Value("${clinicar.setup.token-validade-minutos:60}")
    private long tokenValidadeMinutos;

    // =========================================================
    // CONSULTAR ESTADO DO SETUP
    // =========================================================

    /**
     * Consulta o estado atual da configuração inicial.
     *
     * Este método é somente leitura e, portanto,
     * não precisa utilizar lock pessimista.
     */
    @Transactional(readOnly = true)
    public SetupStatusResponse consultarStatus() {

        ConfiguracaoSistema configuracao =
                configuracaoSistemaRepository
                        .findById(CONFIGURACAO_ID)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Configuração inicial do sistema não encontrada."
                                )
                        );

        EstadoSetup estado = configuracao.getEstadoSetup();

        if (estado == EstadoSetup.NAO_INICIADO) {

            return new SetupStatusResponse(
                    true,
                    estado.name(),
                    "O CliniCar ainda precisa realizar a configuração inicial."
            );
        }

        if (estado == EstadoSetup.AGUARDANDO_ATIVACAO) {

            return new SetupStatusResponse(
                    false,
                    estado.name(),
                    "O administrador inicial já foi cadastrado e aguarda ativação da conta."
            );
        }

        return new SetupStatusResponse(
                false,
                EstadoSetup.CONCLUIDO.name(),
                "A configuração inicial do CliniCar já foi concluída."
        );
    }

    // =========================================================
    // CADASTRAR ADMINISTRADOR INICIAL
    // =========================================================

    /**
     * Cria o primeiro administrador do sistema.
     *
     * O usuário é criado sem senha e com o status
     * PENDENTE_ATIVACAO.
     *
     * O lock pessimista impede a criação simultânea
     * de dois administradores iniciais.
     */
    @Transactional
    public MensagemResponse cadastrarAdministrador(
            AdministradorInicialRequest request
    ) {

        validarCadastroAdministrador(request);
        validarValidadeConfigurada();

        /*
         * Obtém o registro global de configuração usando
         * PESSIMISTIC_WRITE.
         *
         * Enquanto esta transação estiver ativa, outra
         * tentativa de iniciar o setup aguardará.
         */
        ConfiguracaoSistema configuracao =
                configuracaoSistemaRepository
                        .buscarParaAtualizacao()
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Configuração inicial do sistema não encontrada."
                                )
                        );

        if (configuracao.getEstadoSetup()
                != EstadoSetup.NAO_INICIADO) {

            throw new IllegalStateException(
                    "A configuração inicial do CliniCar já foi iniciada."
            );
        }

        String emailNormalizado =
                normalizarEmail(request.getEmail());

        /*
         * O UsuarioRepository atual do CliniCar já utiliza
         * existsByEmailIgnoreCase no gerenciamento normal
         * de usuários.
         */
        if (usuarioRepository
                .existsByEmailIgnoreCase(emailNormalizado)) {

            throw new IllegalArgumentException(
                    "Já existe um usuário cadastrado com este e-mail."
            );
        }

        Usuario administrador = new Usuario();

        preencherDadosAdministrador(
                administrador,
                request,
                emailNormalizado
        );

        /*
         * Estes atributos NÃO são fornecidos pelo frontend.
         *
         * O backend é o responsável por determinar
         * o perfil e o estado inicial.
         */
        administrador.setTipo_do_acesso(
                TIPO_ACESSO_ADMINISTRADOR
        );

        administrador.setStatus(
                STATUS_PENDENTE_ATIVACAO
        );

        /*
         * A senha será definida posteriormente
         * através do link enviado por e-mail.
         */
        administrador.setSenha(null);

        /*
         * MFA ainda não está configurado.
         *
         * Ele será configurado no primeiro login,
         * utilizando o fluxo já existente no CliniCar.
         */
        administrador.setMfaAtivo(false);
        administrador.setMfaSecret(null);
        administrador.setMfaTipo(null);

        Usuario administradorSalvo =
                usuarioRepository.saveAndFlush(administrador);

        LocalDateTime agora = LocalDateTime.now();

        String tokenPuro =
                tokenUsuarioService.gerarToken();

        String tokenHash =
                tokenUsuarioService.gerarHash(tokenPuro);

        LocalDateTime expiraEm =
                agora.plusMinutes(tokenValidadeMinutos);

        TokenAtivacaoUsuario token =
                new TokenAtivacaoUsuario();

        token.setUsuario(administradorSalvo);

        token.setTokenHash(tokenHash);

        token.setTipo(
                TIPO_TOKEN_ATIVACAO_INICIAL
        );

        token.setCriadoEm(agora);

        token.setExpiraEm(expiraEm);

        token.setUsadoEm(null);

        token.setRevogado(false);

        tokenAtivacaoUsuarioRepository.save(token);

        /*
         * Atualiza o estado global da instalação.
         */
        configuracao.setAdministradorInicial(
                administradorSalvo
        );

        configuracao.setEstadoSetup(
                EstadoSetup.AGUARDANDO_ATIVACAO
        );

        configuracao.setSetupIniciadoEm(agora);

        configuracao.setSetupConcluidoEm(null);

        configuracaoSistemaRepository.save(configuracao);

        /*
         * Publicamos o evento ainda dentro da transação.
         *
         * O listener de e-mail utiliza:
         *
         * @TransactionalEventListener(
         *     phase = TransactionPhase.AFTER_COMMIT
         * )
         *
         * Assim o e-mail só será enviado se a transação
         * tiver sido confirmada com sucesso.
         */
        eventPublisher.publishEvent(
                new AtivacaoAdministradorSolicitadaEvent(
                        administradorSalvo.getId(),
                        administradorSalvo.getNome(),
                        administradorSalvo.getEmail(),
                        tokenPuro,
                        expiraEm
                )
        );

        /*
         * Não registrar tokenPuro em log.
         */
        log.info(
                "Administrador inicial criado com sucesso. usuarioId={}, estadoSetup={}.",
                administradorSalvo.getId(),
                configuracao.getEstadoSetup()
        );

        return new MensagemResponse(
                "Administrador inicial cadastrado. Consulte o e-mail de ativação para definir sua senha."
        );
    }

    // =========================================================
    // VALIDAR TOKEN
    // =========================================================

    /**
     * Valida o token recebido através do link de ativação.
     *
     * Este método NÃO altera o token.
     *
     * Apenas informa ao frontend se o link ainda pode
     * ser utilizado.
     */
    @Transactional(readOnly = true)
    public ValidarTokenResponse validarToken(
            String tokenPuro
    ) {

        if (!formatoTokenValido(tokenPuro)) {

            return tokenInvalidoResponse();
        }

        ConfiguracaoSistema configuracao =
                configuracaoSistemaRepository
                        .findById(CONFIGURACAO_ID)
                        .orElse(null);

        if (configuracao == null ||
                configuracao.getEstadoSetup()
                        != EstadoSetup.AGUARDANDO_ATIVACAO) {

            return tokenInvalidoResponse();
        }

        String tokenHash =
                tokenUsuarioService
                        .gerarHash(tokenPuro.trim());

        Optional<TokenAtivacaoUsuario> tokenOpt =
                tokenAtivacaoUsuarioRepository
                        .findByTokenHashAndRevogadoFalse(
                                tokenHash
                        );

        if (tokenOpt.isEmpty()) {
            return tokenInvalidoResponse();
        }

        TokenAtivacaoUsuario token =
                tokenOpt.get();

        if (!tokenPodeSerUtilizado(
                token,
                configuracao
        )) {
            return tokenInvalidoResponse();
        }

        Usuario usuario = token.getUsuario();

        return new ValidarTokenResponse(
                true,
                "Link de ativação válido. Defina sua senha para continuar.",
                mascararEmail(usuario.getEmail())
        );
    }

    // =========================================================
    // DEFINIR SENHA INICIAL
    // =========================================================

    /**
     * Define a senha do administrador inicial.
     *
     * Fluxo:
     *
     * 1. bloqueia configuração
     * 2. valida token
     * 3. valida política da senha
     * 4. cria hash com PasswordEncoder
     * 5. ativa usuário
     * 6. invalida token
     * 7. conclui setup
     */
    @Transactional
    public MensagemResponse definirSenha(
            DefinirSenhaInicialRequest request
    ) {

        validarRequestDefinicaoSenha(request);

        ConfiguracaoSistema configuracao =
                configuracaoSistemaRepository
                        .buscarParaAtualizacao()
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Configuração inicial do sistema não encontrada."
                                )
                        );

        if (configuracao.getEstadoSetup()
                != EstadoSetup.AGUARDANDO_ATIVACAO) {

            throw new IllegalStateException(
                    "O processo de ativação inicial não está disponível."
            );
        }

        String tokenHash =
                tokenUsuarioService
                        .gerarHash(
                                request.getToken().trim()
                        );

        TokenAtivacaoUsuario token =
                tokenAtivacaoUsuarioRepository
                        .findByTokenHashAndRevogadoFalse(
                                tokenHash
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Link de ativação inválido ou expirado."
                                )
                        );

        if (!tokenPodeSerUtilizado(
                token,
                configuracao
        )) {

            throw new IllegalArgumentException(
                    "Link de ativação inválido ou expirado."
            );
        }

        Usuario administrador =
                token.getUsuario();

        validarSenha(
                request.getSenha(),
                request.getConfirmarSenha()
        );

        /*
         * Esta é a única transformação correta
         * para armazenamento da senha.
         *
         * Nunca guardar a senha em texto puro.
         */
        String senhaHash =
                passwordEncoder.encode(
                        request.getSenha()
                );

        administrador.setSenha(senhaHash);

        administrador.setStatus(
                STATUS_ATIVO
        );

        /*
         * O MFA continua desativado neste momento.
         *
         * No login seguinte, o fluxo atual do
         * MfaService deverá conduzir o usuário
         * pela configuração do segundo fator.
         */
        administrador.setMfaAtivo(false);

        usuarioRepository.save(administrador);

        LocalDateTime agora =
                LocalDateTime.now();

        token.setUsadoEm(agora);

        tokenAtivacaoUsuarioRepository.save(token);

        /*
         * Revoga qualquer outro token de ativação
         * que eventualmente ainda esteja pendente.
         */
        revogarOutrosTokensPendentes(
                administrador.getId(),
                token.getId()
        );

        configuracao.setEstadoSetup(
                EstadoSetup.CONCLUIDO
        );

        configuracao.setSetupConcluidoEm(
                agora
        );

        configuracaoSistemaRepository.save(
                configuracao
        );

        log.info(
                "Configuração inicial do CliniCar concluída. administradorId={}.",
                administrador.getId()
        );

        return new MensagemResponse(
                "Senha definida com sucesso. Faça login para continuar."
        );
    }

    // =========================================================
    // REENVIAR ATIVAÇÃO
    // =========================================================

    /**
     * Gera um novo token caso o e-mail anterior
     * tenha expirado ou precise ser reenviado.
     *
     * O token anterior é revogado antes da criação
     * do novo.
     */
    @Transactional
    public MensagemResponse reenviarAtivacao() {
        validarValidadeConfigurada();

        ConfiguracaoSistema configuracao =
                configuracaoSistemaRepository
                        .buscarParaAtualizacao()
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Configuração inicial do sistema não encontrada."
                                )
                        );

        if (configuracao.getEstadoSetup()
                != EstadoSetup.AGUARDANDO_ATIVACAO) {

            throw new IllegalStateException(
                    "Não existe uma ativação inicial pendente."
            );
        }

        Usuario administrador =
                configuracao.getAdministradorInicial();

        if (administrador == null
                || !STATUS_PENDENTE_ATIVACAO.equalsIgnoreCase(administrador.getStatus())
                || !TIPO_ACESSO_ADMINISTRADOR.equalsIgnoreCase(administrador.getTipo_do_acesso())) {

            throw new IllegalStateException(
                    "Administrador inicial não encontrado."
            );
        }

        /*
         * Torna inválidos todos os links anteriores.
         */
        revogarTokensPendentes(
                administrador.getId()
        );

        LocalDateTime agora =
                LocalDateTime.now();

        LocalDateTime expiraEm =
                agora.plusMinutes(
                        tokenValidadeMinutos
                );

        String tokenPuro =
                tokenUsuarioService.gerarToken();

        String tokenHash =
                tokenUsuarioService
                        .gerarHash(tokenPuro);

        TokenAtivacaoUsuario novoToken =
                new TokenAtivacaoUsuario();

        novoToken.setUsuario(administrador);

        novoToken.setTokenHash(tokenHash);

        novoToken.setTipo(
                TIPO_TOKEN_ATIVACAO_INICIAL
        );

        novoToken.setCriadoEm(agora);

        novoToken.setExpiraEm(expiraEm);

        novoToken.setUsadoEm(null);

        novoToken.setRevogado(false);

        tokenAtivacaoUsuarioRepository
                .save(novoToken);

        eventPublisher.publishEvent(
                new AtivacaoAdministradorSolicitadaEvent(
                        administrador.getId(),
                        administrador.getNome(),
                        administrador.getEmail(),
                        tokenPuro,
                        expiraEm
                )
        );

        log.info(
                "Novo token de ativação inicial gerado para administradorId={}.",
                administrador.getId()
        );

        return new MensagemResponse(
                "Um novo e-mail de ativação foi solicitado."
        );
    }

    // =========================================================
    // VALIDAÇÕES DO CADASTRO
    // =========================================================

    private void validarCadastroAdministrador(
            AdministradorInicialRequest request
    ) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Informe os dados do administrador."
            );
        }

        if (java.util.stream.Stream.of(request.getCpf(), request.getNome(),
                request.getNomeSocial(), request.getEmail(), request.getNascimento(),
                request.getTelefone(), request.getCep(), request.getLogradouro(),
                request.getNumeroEndereco(), request.getComplementoEndereco(),
                request.getBairro(), request.getCidade(), request.getEstado())
                .anyMatch(valor -> valor != null && valor.length() > 255)) {
            throw new IllegalArgumentException("Um dos campos excede o tamanho permitido.");
        }

        String cpf =
                somenteDigitos(request.getCpf());

        if (cpf == null ||
                !(cpf.length() == 11 ||
                        cpf.length() == 14)) {

            throw new IllegalArgumentException(
                    "Informe um CPF ou CNPJ válido."
            );
        }

        if (request.getNome() == null ||
                request.getNome().isBlank()) {

            throw new IllegalArgumentException(
                    "Informe o nome do administrador."
            );
        }

        String email =
                normalizarEmail(request.getEmail());

        if (email == null ||
                email.isBlank() ||
                !emailValido(email)) {

            throw new IllegalArgumentException(
                    "Informe um e-mail válido."
            );
        }

        String cep =
                somenteDigitos(request.getCep());

        if (cep != null &&
                !cep.isBlank() &&
                cep.length() != 8) {

            throw new IllegalArgumentException(
                    "O CEP deve possuir 8 dígitos."
            );
        }

        if (request.getEstado() != null &&
                !request.getEstado().isBlank() &&
                request.getEstado().trim().length() != 2) {

            throw new IllegalArgumentException(
                    "Informe a UF com 2 caracteres."
            );
        }

        /*
         * Valida também a data antes de persistir.
         */
        parseNascimento(
                request.getNascimento()
        );
    }

    // =========================================================
    // PREENCHER USUÁRIO
    // =========================================================

    private void preencherDadosAdministrador(
            Usuario usuario,
            AdministradorInicialRequest request,
            String emailNormalizado
    ) {

        usuario.setCpf(
                somenteDigitos(request.getCpf())
        );

        usuario.setNome(
                limparTexto(request.getNome())
        );

        usuario.setNome_social(
                limparTexto(request.getNomeSocial())
        );

        usuario.setEmail(
                emailNormalizado
        );

        usuario.setNascimento(
                parseNascimento(
                        request.getNascimento()
                )
        );

        usuario.setTelefone(
                somenteDigitos(request.getTelefone())
        );

        usuario.setCep(
                somenteDigitos(request.getCep())
        );

        usuario.setLogradouro(
                limparTexto(request.getLogradouro())
        );

        usuario.setNumero_endereco(
                limparTexto(
                        request.getNumeroEndereco()
                )
        );

        usuario.setComplemento_endereco(
                limparTexto(
                        request.getComplementoEndereco()
                )
        );

        usuario.setBairro(
                limparTexto(request.getBairro())
        );

        usuario.setCidade(
                limparTexto(request.getCidade())
        );

        usuario.setEstado(
                normalizarEstado(
                        request.getEstado()
                )
        );
    }

    // =========================================================
    // VALIDAÇÃO DO TOKEN
    // =========================================================

    private boolean tokenPodeSerUtilizado(
            TokenAtivacaoUsuario token,
            ConfiguracaoSistema configuracao
    ) {

        if (token == null) {
            return false;
        }

        if (token.isRevogado()) {
            return false;
        }

        if (token.getUsadoEm() != null) {
            return false;
        }

        if (token.getExpiraEm() == null ||
                !token.getExpiraEm()
                        .isAfter(LocalDateTime.now())) {

            return false;
        }

        if (!TIPO_TOKEN_ATIVACAO_INICIAL
                .equalsIgnoreCase(
                        token.getTipo()
                )) {

            return false;
        }

        Usuario usuario =
                token.getUsuario();

        if (usuario == null ||
                usuario.getId() == null) {

            return false;
        }

        if (!STATUS_PENDENTE_ATIVACAO
                .equalsIgnoreCase(
                        usuario.getStatus()
                )) {

            return false;
        }

        if (!TIPO_ACESSO_ADMINISTRADOR.equalsIgnoreCase(usuario.getTipo_do_acesso())) {
            return false;
        }

        Usuario administradorConfigurado =
                configuracao
                        .getAdministradorInicial();

        if (administradorConfigurado == null ||
                administradorConfigurado.getId()
                        == null) {

            return false;
        }

        return administradorConfigurado
                .getId()
                .equals(
                        usuario.getId()
                );
    }

    private void validarValidadeConfigurada() {
        if (tokenValidadeMinutos <= 0) {
            throw new IllegalStateException("A ativação inicial está indisponível.");
        }
    }

    private boolean formatoTokenValido(String token) {
        return token != null && token.trim().matches("[A-Za-z0-9_-]{43}");
    }

    private ValidarTokenResponse
    tokenInvalidoResponse() {

        return new ValidarTokenResponse(
                false,
                "Este link de ativação é inválido ou expirou.",
                null
        );
    }

    // =========================================================
    // VALIDAÇÃO DA SENHA
    // =========================================================

    private void validarRequestDefinicaoSenha(
            DefinirSenhaInicialRequest request
    ) {

        if (request == null) {

            throw new IllegalArgumentException(
                    "Informe os dados necessários para definir a senha."
            );
        }

        if (!formatoTokenValido(request.getToken())) {

            throw new IllegalArgumentException(
                    "Link de ativação inválido ou expirado."
            );
        }
    }

    private void validarSenha(
            String senha,
            String confirmarSenha
    ) {

        if (senha == null ||
                senha.isBlank()) {

            throw new IllegalArgumentException(
                    "Informe a nova senha."
            );
        }

        if (confirmarSenha == null ||
                confirmarSenha.isBlank()) {

            throw new IllegalArgumentException(
                    "Confirme a nova senha."
            );
        }

        if (!senha.equals(confirmarSenha)) {

            throw new IllegalArgumentException(
                    "A senha e a confirmação de senha não coincidem."
            );
        }

        if (senha.length() < 8) {

            throw new IllegalArgumentException(
                    "A senha deve possuir pelo menos 8 caracteres."
            );
        }

        if (senha.length() > 128) {

            throw new IllegalArgumentException(
                    "A senha excede o tamanho máximo permitido."
            );
        }

        boolean possuiMaiuscula =
                senha.chars()
                        .anyMatch(
                                Character::isUpperCase
                        );

        boolean possuiMinuscula =
                senha.chars()
                        .anyMatch(
                                Character::isLowerCase
                        );

        boolean possuiNumero =
                senha.chars()
                        .anyMatch(
                                Character::isDigit
                        );

        boolean possuiEspecial =
                senha.chars()
                        .anyMatch(c ->
                                !Character.isLetterOrDigit(c) &&
                                !Character.isWhitespace(c)
                        );

        if (!possuiMaiuscula) {

            throw new IllegalArgumentException(
                    "A senha deve possuir pelo menos uma letra maiúscula."
            );
        }

        if (!possuiMinuscula) {

            throw new IllegalArgumentException(
                    "A senha deve possuir pelo menos uma letra minúscula."
            );
        }

        if (!possuiNumero) {

            throw new IllegalArgumentException(
                    "A senha deve possuir pelo menos um número."
            );
        }

        if (!possuiEspecial) {

            throw new IllegalArgumentException(
                    "A senha deve possuir pelo menos um caractere especial."
            );
        }
    }

    // =========================================================
    // REVOGAÇÃO DOS TOKENS
    // =========================================================

    private void revogarTokensPendentes(
            Long usuarioId
    ) {

        List<TokenAtivacaoUsuario> tokens =
                tokenAtivacaoUsuarioRepository
                        .findByUsuario_IdAndTipoAndRevogadoFalseAndUsadoEmIsNull(
                                usuarioId,
                                TIPO_TOKEN_ATIVACAO_INICIAL
                        );

        for (TokenAtivacaoUsuario token : tokens) {
            token.setRevogado(true);
        }

        if (!tokens.isEmpty()) {
            tokenAtivacaoUsuarioRepository
                    .saveAll(tokens);
        }
    }

    private void revogarOutrosTokensPendentes(
            Long usuarioId,
            Long tokenUtilizadoId
    ) {

        List<TokenAtivacaoUsuario> tokens =
                tokenAtivacaoUsuarioRepository
                        .findByUsuario_IdAndTipoAndRevogadoFalseAndUsadoEmIsNull(
                                usuarioId,
                                TIPO_TOKEN_ATIVACAO_INICIAL
                        );

        for (TokenAtivacaoUsuario token : tokens) {

            if (tokenUtilizadoId == null ||
                    !tokenUtilizadoId.equals(
                            token.getId()
                    )) {

                token.setRevogado(true);
            }
        }

        tokenAtivacaoUsuarioRepository
                .saveAll(tokens);
    }

    // =========================================================
    // NORMALIZAÇÕES
    // =========================================================

    private String normalizarEmail(
            String email
    ) {

        if (email == null) {
            return null;
        }

        String normalizado =
                email.trim()
                        .toLowerCase(Locale.ROOT);

        return normalizado.isBlank()
                ? null
                : normalizado;
    }

    private boolean emailValido(
            String email
    ) {

        if (email == null ||
                email.isBlank()) {

            return false;
        }

        if (!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) {
            return false;
        }

        int arroba =
                email.indexOf('@');

        int ultimoPonto =
                email.lastIndexOf('.');

        return arroba > 0 &&
                ultimoPonto > arroba + 1 &&
                ultimoPonto < email.length() - 1;
    }

    private String normalizarEstado(
            String estado
    ) {

        String valor =
                limparTexto(estado);

        if (valor == null) {
            return null;
        }

        return valor.toUpperCase(
                Locale.ROOT
        );
    }

    private String somenteDigitos(
            String valor
    ) {

        if (valor == null) {
            return null;
        }

        String somenteDigitos =
                valor.replaceAll(
                        "\\D",
                        ""
                );

        return somenteDigitos.isBlank()
                ? null
                : somenteDigitos;
    }

    private String limparTexto(
            String valor
    ) {

        if (valor == null) {
            return null;
        }

        String texto =
                valor.trim();

        return texto.isBlank()
                ? null
                : texto;
    }

    // =========================================================
    // DATA DE NASCIMENTO
    // =========================================================

    private LocalDate parseNascimento(
            String nascimento
    ) {

        if (nascimento == null ||
                nascimento.isBlank()) {

            return null;
        }

        try {

            /*
             * Formato esperado pelo input type="date"
             * do Angular:
             *
             * yyyy-MM-dd
             */
            return LocalDate.parse(
                    nascimento.trim()
            );

        } catch (DateTimeParseException e) {

            throw new IllegalArgumentException(
                    "Data de nascimento inválida. Utilize o formato yyyy-MM-dd."
            );
        }
    }

    // =========================================================
    // MASCARAR E-MAIL
    // =========================================================

    private String mascararEmail(
            String email
    ) {

        if (email == null ||
                email.isBlank()) {

            return null;
        }

        int posicaoArroba =
                email.indexOf('@');

        if (posicaoArroba <= 0) {
            return "***";
        }

        String usuarioEmail =
                email.substring(
                        0,
                        posicaoArroba
                );

        String dominio =
                email.substring(
                        posicaoArroba
                );

        String primeiraLetra =
                usuarioEmail.substring(
                        0,
                        1
                );

        return primeiraLetra
                + "***"
                + dominio;
    }
}