import { Component, DestroyRef, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout } from 'rxjs';

interface ClienteCadastro {
  cpf: string; nome: string; nome_social: string; nascimento: string;
  telefone: string; email: string; cep: string; logradouro: string;
  numero_endereco: string; complemento_endereco: string; bairro: string;
  cidade: string; estado: string; senha: string; confirmarSenha: string;
}

interface EnderecoCep { erro?: boolean | string; logradouro?: string; bairro?: string;
  localidade?: string; uf?: string; complemento?: string }

type Etapa = 'dados' | 'contato' | 'endereco' | 'seguranca' | 'revisao';
const ETAPAS: Etapa[] = ['dados', 'contato', 'endereco', 'seguranca', 'revisao'];

@Component({
  selector: 'app-cadastra-cliente',
  imports: [FormsModule, RouterLink],
  templateUrl: './cadastra-cliente.component.html',
  styleUrl: './cadastra-cliente.component.css'
})
export class CadastraClienteComponent {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private consultaCepId = 0;
  readonly etapas = ETAPAS;
  etapa: Etapa = 'dados';
  maiorEtapa = 0;
  cliente: ClienteCadastro = {
    cpf: '', nome: '', nome_social: '', nascimento: '', telefone: '', email: '',
    cep: '', logradouro: '', numero_endereco: '', complemento_endereco: '',
    bairro: '', cidade: '', estado: '', senha: '', confirmarSenha: ''
  };
  carregando = false;
  concluido = false;
  mensagemErro = '';
  mostrarSenha = false;
  cepConsultando = false;
  cepErro = '';

  get progresso(): number { return Math.round(((this.maiorEtapa + 1) / ETAPAS.length) * 100); }
  get indiceEtapa(): number { return ETAPAS.indexOf(this.etapa); }

  abrirEtapa(etapa: Etapa): void {
    if (ETAPAS.indexOf(etapa) <= this.maiorEtapa) {
      this.etapa = etapa;
      this.mensagemErro = '';
    }
  }

  proximo(): void {
    const erro = this.validar(this.etapa);
    if (erro) { this.mensagemErro = erro; return; }
    this.mensagemErro = '';
    const proximo = Math.min(this.indiceEtapa + 1, ETAPAS.length - 1);
    this.maiorEtapa = Math.max(this.maiorEtapa, proximo);
    this.etapa = ETAPAS[proximo];
  }

  anterior(): void {
    this.etapa = ETAPAS[Math.max(0, this.indiceEtapa - 1)];
    this.mensagemErro = '';
  }

  cadastrar(): void {
    if (this.carregando || this.concluido || this.etapa !== 'revisao') return;
    for (const etapa of ETAPAS.slice(0, -1)) {
      const erro = this.validar(etapa);
      if (erro) { this.etapa = etapa; this.mensagemErro = erro; return; }
    }
    this.carregando = true;
    this.mensagemErro = '';
    const { confirmarSenha, ...dados } = this.cliente;
    this.http.post<{ id: number }>('/api/usuario', {
      ...dados,
      cpf: this.digitos(dados.cpf),
      telefone: this.digitos(dados.telefone),
      cep: this.digitos(dados.cep),
      email: dados.email.trim().toLowerCase(),
      estado: dados.estado.trim().toUpperCase(),
      tipo_do_acesso: 'cliente', status: 'ativo'
    }).subscribe({
      next: usuario => {
        this.carregando = false;
        this.concluido = true;
        this.cliente.senha = '';
        this.cliente.confirmarSenha = '';
        if (usuario.id) sessionStorage.setItem('clinicar.cadastroCliente', `${usuario.id}:veiculos`);
      },
      error: erro => {
        this.carregando = false;
        this.mensagemErro = typeof erro?.error?.mensagem === 'string'
          ? erro.error.mensagem : 'Não foi possível concluir o cadastro. Confira os dados e tente novamente.';
      }
    });
  }

  formatarDocumento(): void {
    const d = this.digitos(this.cliente.cpf);
    this.cliente.cpf = d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      : d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : d;
  }
  formatarTelefone(): void {
    const d = this.digitos(this.cliente.telefone).replace(/^55(?=\d{10,11}$)/, '');
    this.cliente.telefone = d.length === 11 ? `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
      : d.length === 10 ? `+55 (${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d;
  }
  formatarCep(): void {
    const d = this.digitos(this.cliente.cep);
    this.cliente.cep = d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }
  aoAlterarCep(): void {
    this.consultaCepId++;
    this.cepConsultando = false;
    this.cepErro = '';
  }
  consultarCep(): void {
    this.formatarCep();
    const cep = this.digitos(this.cliente.cep);
    const consultaId = ++this.consultaCepId;
    this.cepErro = '';
    if (!cep) return;
    if (cep.length !== 8) { this.cepErro = 'CEP deve conter 8 dígitos.'; return; }
    this.cepConsultando = true;
    this.http.get<EnderecoCep>(`https://viacep.com.br/ws/${cep}/json/`)
      .pipe(timeout(8000), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: endereco => {
          if (consultaId !== this.consultaCepId || this.digitos(this.cliente.cep) !== cep) return;
          this.cepConsultando = false;
          if (endereco.erro) { this.cepErro = 'CEP não encontrado. Confira o número ou preencha o endereço manualmente.'; return; }
          this.cliente.logradouro = endereco.logradouro || '';
          this.cliente.bairro = endereco.bairro || '';
          this.cliente.cidade = endereco.localidade || '';
          this.cliente.estado = (endereco.uf || '').toUpperCase();
          if (!this.cliente.complemento_endereco) this.cliente.complemento_endereco = endereco.complemento || '';
        },
        error: () => {
          if (consultaId !== this.consultaCepId || this.digitos(this.cliente.cep) !== cep) return;
          this.cepConsultando = false;
          this.cepErro = 'Não foi possível consultar o CEP. Tente novamente ou preencha o endereço manualmente.';
        }
      });
  }
  private digitos(valor: string): string { return (valor || '').replace(/\D/g, ''); }

  private validar(etapa: Etapa): string | null {
    const c = this.cliente;
    if (etapa === 'dados') {
      if (!c.nome.trim() || !c.nascimento || ![11, 14].includes(this.digitos(c.cpf).length))
        return 'Informe nome, CPF ou CNPJ e data de nascimento.';
    }
    if (etapa === 'contato') {
      const telefone = this.digitos(c.telefone).replace(/^55(?=\d{10,11}$)/, '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim()) || ![10, 11].includes(telefone.length))
        return 'Informe um e-mail válido e telefone com DDD.';
    }
    if (etapa === 'endereco') {
      if (this.cepConsultando) return 'Aguarde a consulta do CEP terminar.';
      if (this.digitos(c.cep).length !== 8 || !c.logradouro.trim() || !c.numero_endereco.trim()
        || !c.bairro.trim() || !c.cidade.trim() || !/^[a-zA-Z]{2}$/.test(c.estado.trim()))
        return 'Preencha CEP, logradouro, número, bairro, cidade e UF.';
    }
    if (etapa === 'seguranca') {
      if (c.senha.length < 8 || c.senha.length > 128 || !/\p{Lu}/u.test(c.senha)
        || !/\p{Ll}/u.test(c.senha) || !/\p{N}/u.test(c.senha) || !/[^\p{L}\p{N}\s]/u.test(c.senha))
        return 'A senha deve ter de 8 a 128 caracteres, letra maiúscula, minúscula, número e caractere especial.';
      if (c.senha !== c.confirmarSenha) return 'As senhas informadas não coincidem.';
    }
    return null;
  }
}
