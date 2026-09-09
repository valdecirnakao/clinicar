import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize } from 'rxjs';

import {
  AdministradorInicialRequest,
  SetupService,
  SetupStatusResponse,
  mensagemSetupErro
} from '../../services/setup.service';

interface ViaCepResponse {
  erro?: boolean | 'true';
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

type SecaoId = 'dados' | 'contato' | 'endereco';

interface Campo {
  nome: keyof AdministradorInicialRequest;
  rotulo: string;
  tipo: string;
  obrigatorio?: boolean;
  autocomplete: string;
  secao: SecaoId;
  largura: string;
}

interface Etapa {
  numero: number;
  titulo: string;
  icone: string;
  descricao: string;
  secao?: SecaoId;
}

@Component({
  selector: 'app-primeiro-acesso',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './primeiro-acesso.component.html',
  styleUrls: ['./primeiro-acesso.component.css']
})
export class PrimeiroAcessoComponent implements OnInit {

  private readonly destroyRef = inject(DestroyRef);
  private readonly setup = inject(SetupService);
  private readonly http = inject(HttpClient);

  private consultaCep?: Subscription;
  private ultimoCep = '';

  etapaAtual = 1;
  maiorEtapaLiberada = 1;

  cepCarregando = false;
  cepMensagem = '';

  status: SetupStatusResponse | null = null;

  carregando = false;
  enviando = false;

  erro = '';
  mensagem = '';

  errosCampos: Partial<
    Record<keyof AdministradorInicialRequest, string>
  > = {};

  readonly etapas: Etapa[] = [
    {
      numero: 1,
      titulo: 'Dados pessoais',
      icone: 'bi-person-vcard',
      descricao: 'Identificação do administrador inicial.',
      secao: 'dados'
    },
    {
      numero: 2,
      titulo: 'Contato e Acesso',
      icone: 'bi-envelope-at',
      descricao: 'Dados usados para contato e ativação da conta.',
      secao: 'contato'
    },
    {
      numero: 3,
      titulo: 'Endereço',
      icone: 'bi-geo-alt',
      descricao: 'Informe o endereço do administrador.',
      secao: 'endereco'
    },
    {
      numero: 4,
      titulo: 'Revisão',
      icone: 'bi-clipboard-check',
      descricao: 'Confira os dados antes de concluir o cadastro.'
    }
  ];

  dados: AdministradorInicialRequest = this.criarDadosVazios();

  readonly campos: Campo[] = [
    {
      nome: 'nome',
      rotulo: 'Nome completo',
      tipo: 'text',
      obrigatorio: true,
      autocomplete: 'name',
      secao: 'dados',
      largura: 'col-md-6'
    },
    {
      nome: 'nomeSocial',
      rotulo: 'Nome social',
      tipo: 'text',
      autocomplete: 'nickname',
      secao: 'dados',
      largura: 'col-md-6'
    },
    {
      nome: 'cpf',
      rotulo: 'CPF',
      tipo: 'text',
      obrigatorio: true,
      autocomplete: 'off',
      secao: 'dados',
      largura: 'col-md-4'
    },
    {
      nome: 'nascimento',
      rotulo: 'Data de nascimento',
      tipo: 'date',
      obrigatorio: true,
      autocomplete: 'bday',
      secao: 'dados',
      largura: 'col-md-4'
    },

    {
      nome: 'email',
      rotulo: 'E-mail de ativação',
      tipo: 'email',
      obrigatorio: true,
      autocomplete: 'email',
      secao: 'contato',
      largura: 'col-md-7'
    },
    {
      nome: 'telefone',
      rotulo: 'Telefone',
      tipo: 'tel',
      obrigatorio: true,
      autocomplete: 'tel',
      secao: 'contato',
      largura: 'col-md-5'
    },

    {
      nome: 'cep',
      rotulo: 'CEP',
      tipo: 'text',
      obrigatorio: true,
      autocomplete: 'postal-code',
      secao: 'endereco',
      largura: 'col-md-3'
    },
    {
      nome: 'logradouro',
      rotulo: 'Logradouro',
      tipo: 'text',
      obrigatorio: true,
      autocomplete: 'address-line1',
      secao: 'endereco',
      largura: 'col-md-6'
    },
    {
      nome: 'numeroEndereco',
      rotulo: 'Número',
      tipo: 'text',
      obrigatorio: true,
      autocomplete: 'off',
      secao: 'endereco',
      largura: 'col-md-3'
    },
    {
      nome: 'complementoEndereco',
      rotulo: 'Complemento',
      tipo: 'text',
      autocomplete: 'address-line2',
      secao: 'endereco',
      largura: 'col-md-4'
    },
    {
      nome: 'bairro',
      rotulo: 'Bairro',
      tipo: 'text',
      obrigatorio: true,
      autocomplete: 'address-level3',
      secao: 'endereco',
      largura: 'col-md-4'
    },
    {
      nome: 'cidade',
      rotulo: 'Cidade',
      tipo: 'text',
      obrigatorio: true,
      autocomplete: 'address-level2',
      secao: 'endereco',
      largura: 'col-md-3'
    },
    {
      nome: 'estado',
      rotulo: 'UF',
      tipo: 'text',
      obrigatorio: true,
      autocomplete: 'address-level1',
      secao: 'endereco',
      largura: 'col-md-1'
    }
  ];

  ngOnInit(): void {
    this.consultar();
  }

  private criarDadosVazios(): AdministradorInicialRequest {
    return {
      cpf: '',
      nome: '',
      nomeSocial: '',
      email: '',
      nascimento: '',
      telefone: '',
      cep: '',
      logradouro: '',
      numeroEndereco: '',
      complementoEndereco: '',
      bairro: '',
      cidade: '',
      estado: ''
    };
  }

  get etapaSelecionada(): Etapa {
    return this.etapas[this.etapaAtual - 1];
  }

  camposDaSecao(secao: SecaoId): Campo[] {
    return this.campos.filter(campo => campo.secao === secao);
  }

  camposEtapaAtual(): Campo[] {
    const secao = this.etapaSelecionada.secao;

    return secao
      ? this.camposDaSecao(secao)
      : [];
  }

  etapaDisponivel(numero: number): boolean {
    return numero <= this.maiorEtapaLiberada;
  }

  etapaConcluida(numero: number): boolean {
    return numero < this.maiorEtapaLiberada;
  }

  irParaEtapa(numero: number): void {
    if (numero < 1 || numero > 4 || numero === this.etapaAtual) {
      return;
    }

    if (numero < this.etapaAtual) {
      this.etapaAtual = numero;
      this.erro = '';
      return;
    }

    if (!this.etapaDisponivel(numero)) {
      return;
    }

    if (!this.validarAteEtapa(numero - 1)) {
      this.erro =
        'Confira os campos destacados antes de avançar.';
      return;
    }

    this.etapaAtual = numero;
    this.erro = '';
  }

  avancar(): void {
    if (this.enviando || this.etapaAtual >= 4) {
      return;
    }

    if (!this.validarEtapa(this.etapaAtual)) {
      this.erro =
        'Confira os campos destacados antes de avançar.';
      return;
    }

    this.erro = '';

    const proximaEtapa = this.etapaAtual + 1;

    this.maiorEtapaLiberada = Math.max(
      this.maiorEtapaLiberada,
      proximaEtapa
    );

    this.etapaAtual = proximaEtapa;
  }

  voltar(): void {
    if (this.enviando || this.etapaAtual <= 1) {
      return;
    }

    this.etapaAtual--;
    this.erro = '';
  }

  editarEtapa(numero: number): void {
    if (numero < 1 || numero > 3) {
      return;
    }

    this.etapaAtual = numero;
    this.erro = '';
  }

  private validarEtapa(numero: number): boolean {
    const etapa = this.etapas[numero - 1];

    if (!etapa?.secao) {
      return true;
    }

    const campos = this.camposDaSecao(etapa.secao);

    for (const campo of campos) {
      this.validarCampo(campo.nome);
    }

    return !campos.some(
      campo => !!this.errosCampos[campo.nome]
    );
  }

  private validarAteEtapa(numero: number): boolean {
    let primeiraEtapaComErro: number | null = null;

    for (let etapa = 1; etapa <= numero; etapa++) {
      if (!this.validarEtapa(etapa) && primeiraEtapaComErro === null) {
        primeiraEtapaComErro = etapa;
      }
    }

    if (primeiraEtapaComErro !== null) {
      this.etapaAtual = primeiraEtapaComErro;
      return false;
    }

    return true;
  }

  private digitos(valor: string): string {
    return String(valor ?? '').replace(/\D/g, '');
  }

  atualizarCampo(
    campo: keyof AdministradorInicialRequest,
    valor: string,
    input: HTMLInputElement
  ): void {

    let formatado = valor;

    if (campo === 'cpf') {
      const numeros = this.digitos(valor).slice(0, 11);

      formatado = numeros
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2')
        .replace(
          /(\d{3}\.\d{3}\.\d{3})(\d)/,
          '$1-$2'
        );

    } else if (campo === 'telefone') {

      let numeros = this.digitos(valor);

      if (
        numeros.startsWith('55') &&
        (
          valor.trim().startsWith('+55') ||
          numeros.length === 12 ||
          numeros.length === 13
        )
      ) {
        numeros = numeros.slice(2);
      }

      numeros = numeros.slice(0, 11);

      const local = numeros.slice(2);
      const separador = numeros.length > 10 ? 5 : 4;

      formatado = numeros
        ? '(' +
          numeros.slice(0, 2) +
          (
            numeros.length > 2
              ? ') ' +
                local.slice(0, separador) +
                (
                  local.length > separador
                    ? '-' + local.slice(separador)
                    : ''
                )
              : ''
          )
        : '';

    } else if (campo === 'cep') {

      formatado = this.digitos(valor)
        .slice(0, 8)
        .replace(/^(\d{5})(\d)/, '$1-$2');

      if (
        this.digitos(formatado) !==
        this.digitos(this.dados.cep)
      ) {
        this.consultaCep?.unsubscribe();
        this.ultimoCep = '';
        this.cepMensagem = '';
      }

    } else if (campo === 'estado') {

      formatado = valor
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 2);
    }

    this.dados[campo] = formatado;
    input.value = formatado;

    delete this.errosCampos[campo];
    this.erro = '';

    if (
      campo === 'cep' &&
      this.digitos(formatado).length === 8
    ) {
      this.buscarCep();
    }
  }

  validarCampo(
    campo: keyof AdministradorInicialRequest
  ): void {

    const mensagem = this.erroCampo(campo);

    if (mensagem) {
      this.errosCampos[campo] = mensagem;
    } else {
      delete this.errosCampos[campo];
    }
  }

  private erroCampo(
    campo: keyof AdministradorInicialRequest
  ): string {

    const valor = String(
      this.dados[campo] ?? ''
    ).trim();

    const definicao = this.campos.find(
      item => item.nome === campo
    );

    if (!valor) {
      return definicao?.obrigatorio
        ? 'Informe ' + definicao.rotulo.toLowerCase() + '.'
        : '';
    }

    if (
      campo === 'cpf' &&
      this.digitos(valor).length !== 11
    ) {
      return 'CPF deve conter 11 dígitos.';
    }

    if (
      campo === 'email' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
    ) {
      return 'Informe um e-mail válido.';
    }

    if (
      campo === 'telefone' &&
      ![10, 11].includes(this.digitos(valor).length)
    ) {
      return 'Informe telefone com DDD e 10 ou 11 dígitos.';
    }

    if (
      campo === 'cep' &&
      this.digitos(valor).length !== 8
    ) {
      return 'CEP deve conter 8 dígitos.';
    }

    if (
      campo === 'estado' &&
      !/^[A-Z]{2}$/.test(valor)
    ) {
      return 'Informe a UF com 2 letras.';
    }

    if (campo === 'nascimento') {

      if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return 'Informe uma data válida.';
      }

      const [ano, mes, dia] = valor
        .split('-')
        .map(Number);

      const data = new Date(
        ano,
        mes - 1,
        dia
      );

      if (
        data.getFullYear() !== ano ||
        data.getMonth() + 1 !== mes ||
        data.getDate() !== dia
      ) {
        return 'Informe uma data válida.';
      }

      const hoje = new Date();

      if (data > hoje) {
        return 'A data de nascimento não pode estar no futuro.';
      }
    }

    return '';
  }

  buscarCep(repetir = false): void {

    const cep = this.digitos(this.dados.cep);

    if (
      this.enviando ||
      cep.length !== 8 ||
      (!repetir && this.ultimoCep === cep)
    ) {
      return;
    }

    this.consultaCep?.unsubscribe();

    this.ultimoCep = cep;
    this.cepCarregando = true;
    this.cepMensagem = '';

    const enderecoAntes = { ...this.dados };

    this.consultaCep = this.http
      .get<ViaCepResponse>(
        `https://viacep.com.br/ws/${cep}/json/`
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.cepCarregando = false;
        })
      )
      .subscribe({

        next: resposta => {

          if (
            this.digitos(this.dados.cep) !== cep
          ) {
            return;
          }

          if (!resposta || resposta.erro) {

            this.cepMensagem =
              'CEP não encontrado. Confira os dígitos e preencha o endereço manualmente, se necessário.';

            return;
          }

          const endereco: Partial<
            AdministradorInicialRequest
          > = {
            logradouro: resposta.logradouro,
            bairro: resposta.bairro,
            cidade: resposta.localidade,
            estado: resposta.uf?.toUpperCase()
          };

          for (
            const campo of [
              'logradouro',
              'bairro',
              'cidade',
              'estado'
            ] as const
          ) {

            if (
              endereco[campo] &&
              this.dados[campo] ===
                enderecoAntes[campo]
            ) {
              this.dados[campo] =
                endereco[campo]!;

              delete this.errosCampos[campo];
            }
          }

          this.cepMensagem =
            'Consulta concluída. Confira o endereço e informe o número e o complemento, se houver.';

          setTimeout(() => {
            document
              .getElementById('numeroEndereco')
              ?.focus();
          });
        },

        error: () => {

          this.cepMensagem =
            'Não foi possível consultar o ViaCEP. Preencha o endereço manualmente ou tente consultar novamente.';
        }
      });
  }

  consultar(): void {

    if (this.carregando || this.enviando) {
      return;
    }

    this.carregando = true;
    this.erro = '';
    this.status = null;

    this.setup
      .consultarStatus()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.carregando = false;
        })
      )
      .subscribe({

        next: status => {

          this.status = status;

          if (status.estado === 'NAO_INICIADO') {
            this.etapaAtual = 1;
            this.maiorEtapaLiberada = 1;
          }
        },

        error: (erro: unknown) => {

          this.erro = mensagemSetupErro(
            erro,
            'Não foi possível consultar a configuração. Tente novamente.'
          );
        }
      });
  }

  cadastrar(form: NgForm): void {

    if (
      this.enviando ||
      this.status?.estado !== 'NAO_INICIADO'
    ) {
      return;
    }

    this.erro = '';
    this.mensagem = '';

    if (!this.validarAteEtapa(3)) {

      form.control.markAllAsTouched();

      this.erro =
        'Confira os campos destacados antes de cadastrar.';

      return;
    }

    this.consultaCep?.unsubscribe();

    this.enviando = true;

    const dados: AdministradorInicialRequest = {
      ...this.dados,

      cpf: this.digitos(this.dados.cpf),

      cep: this.digitos(this.dados.cep),

      // Mantido conforme o comportamento atual do cadastro de usuário.
      telefone:
        '55' +
        this.digitos(this.dados.telefone),

      nome: this.dados.nome.trim(),

      nomeSocial:
        this.dados.nomeSocial.trim(),

      email:
        this.dados.email
          .trim()
          .toLowerCase(),

      nascimento:
        this.dados.nascimento,

      logradouro:
        this.dados.logradouro.trim(),

      numeroEndereco:
        this.dados.numeroEndereco.trim(),

      complementoEndereco:
        this.dados.complementoEndereco.trim(),

      bairro:
        this.dados.bairro.trim(),

      cidade:
        this.dados.cidade.trim(),

      estado:
        this.dados.estado
          .trim()
          .toUpperCase()
    };

    this.setup
      .cadastrarAdministrador(dados)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.enviando = false;
        })
      )
      .subscribe({

        next: resposta => {

          this.mensagem = resposta.mensagem;

          this.status = {
            setupDisponivel: false,
            estado: 'AGUARDANDO_ATIVACAO',
            mensagem:
              'Administrador cadastrado. Consulte seu e-mail e abra o link para definir sua senha.'
          };

          this.dados =
            this.criarDadosVazios();

          this.errosCampos = {};

          form.resetForm();
        },

        error: (erro: unknown) => {

          this.erro = mensagemSetupErro(
            erro,
            'Não foi possível cadastrar. Consulte o estado do setup antes de tentar novamente.'
          );
        }
      });
  }

  reenviar(): void {

    if (
      this.enviando ||
      this.status?.estado !==
        'AGUARDANDO_ATIVACAO'
    ) {
      return;
    }

    this.enviando = true;
    this.erro = '';
    this.mensagem = '';

    this.setup
      .reenviarAtivacao()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.enviando = false;
        })
      )
      .subscribe({

        next: resposta => {
          this.mensagem = resposta.mensagem;
        },

        error: (erro: unknown) => {

          this.erro = mensagemSetupErro(
            erro,
            'Não foi possível solicitar o reenvio. Tente novamente mais tarde.'
          );
        }
      });
  }

  nascimentoFormatado(): string {

    const valor = this.dados.nascimento;

    if (
      !valor ||
      !/^\d{4}-\d{2}-\d{2}$/.test(valor)
    ) {
      return 'Não informado';
    }

    const [ano, mes, dia] =
      valor.split('-');

    return `${dia}/${mes}/${ano}`;
  }

  valorOuNaoInformado(
    valor: string | null | undefined
  ): string {

    const texto = String(valor ?? '').trim();

    return texto || 'Não informado';
  }

  enderecoResumo(): string {

    const logradouro =
      this.dados.logradouro.trim();

    const numero =
      this.dados.numeroEndereco.trim();

    if (!logradouro) {
      return 'Não informado';
    }

    return numero
      ? `${logradouro}, ${numero}`
      : logradouro;
  }
}
