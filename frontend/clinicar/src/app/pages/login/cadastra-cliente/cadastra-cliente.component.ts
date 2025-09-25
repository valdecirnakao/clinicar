import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CadastraClienteService } from './cadastra-cliente.service';

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;
}

type Usuario = {
  cpf: string;
  nome: string;
  nome_social: string;
  tipo_do_acesso: string;
  telefone: string;
  whatsappapikey: string;
  senha: string;
  confirmarSenha: string;
  email: string;
  nascimento: string;  // ideal: 'yyyy-MM-dd'
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;      // UF
  complemento_endereco: string;
  numero_endereco: string;
};

@Component({
  selector: 'app-cadastra-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './cadastra-cliente.component.html',
  styleUrls: ['./cadastra-cliente.component.css']
})
export class CadastraClienteComponent implements OnInit {
  usuario: Usuario = {
    cpf: '',
    nome: '',
    nome_social: '',
    tipo_do_acesso: 'cliente',
    telefone: '',
    whatsappapikey: '',
    senha: '',
    confirmarSenha: '',
    email: '',
    nascimento: '',
    cep: '',
    logradouro: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento_endereco: '',
    numero_endereco: ''
  };

  usuariosCadastrados: Usuario[] = [];
  cpfsCadastrados: string[] = []; // armazena só dígitos para comparar

  cepStatus = { loading: false, errorMsg: '' };

  @ViewChild('numeroInput') numeroInput?: ElementRef<HTMLInputElement>;

  constructor(
    private readonly cadastraClienteService: CadastraClienteService,
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  // ========= Helpers =========
  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  // ========= FORMATAÇÕES =========
  formatarCPF(): void {
    if (!this.usuario.cpf) return;
    const d = this.onlyDigits(this.usuario.cpf).slice(0, 11);
    if (d.length === 11) {
      this.usuario.cpf = d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      this.usuario.cpf = d.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        '$1.$2.$3/$4-$5'
      );
    }
  }

  formatarTelefone(): void {
    if (!this.usuario.telefone) return;
    const n = this.onlyDigits(this.usuario.telefone);
    const codigoPais = '55';
    if (n.length >= 11) {
      const ddd = n.slice(-11, -9);
      const parte1 = n.slice(-9, -4);
      const parte2 = n.slice(-4);
      this.usuario.telefone = `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    } else if (n.length >= 10) {
      const ddd = n.slice(0, 2);
      const parte1 = n.slice(2, 6);
      const parte2 = n.slice(6, 10);
      this.usuario.telefone = `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    } else if (n.length >= 8) {
      const ddd = '11';
      const parte1 = n.slice(0, n.length - 4);
      const parte2 = n.slice(-4);
      this.usuario.telefone = `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    } else {
      this.usuario.telefone = n;
    }
  }

  private formatarCEP(): void {
    if (!this.usuario.cep) return;
    const d = this.onlyDigits(this.usuario.cep).slice(0, 8);
    this.usuario.cep = d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : d;
  }

  // ========= VIA CEP =========
  onCepBlur(): void {
    this.formatarCEP();
    const cepNums = this.onlyDigits(this.usuario.cep);
    if (cepNums.length !== 8) {
      this.cepStatus.errorMsg = 'CEP deve ter 8 dígitos.';
      return;
    }
    this.consultarCep(cepNums);
  }

  private consultarCep(cepNums: string): void {
    this.cepStatus = { loading: true, errorMsg: '' };

    this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${cepNums}/json/`)
      .subscribe({
        next: (resp) => {
          if (resp?.erro) {
            this.cepStatus = { loading: false, errorMsg: 'CEP não encontrado.' };
            return;
          }
          this.usuario.logradouro = resp.logradouro || '';
          this.usuario.bairro     = resp.bairro     || '';
          this.usuario.cidade     = resp.localidade || '';
          this.usuario.estado     = (resp.uf || '').toUpperCase();
          if (!this.usuario.complemento_endereco && resp.complemento) {
            this.usuario.complemento_endereco = resp.complemento;
          }
          this.cepStatus = { loading: false, errorMsg: '' };
          setTimeout(() => this.numeroInput?.nativeElement.focus(), 0);
        },
        error: () => {
          this.cepStatus = { loading: false, errorMsg: 'Falha ao consultar o CEP. Tente novamente.' };
        }
      });
  }

  // ========= CRUD =========
  cadastrar(form: NgForm): void {
    // validações básicas
    const camposObrig = [
      'cpf','nome','telefone','email','nascimento',
      'cep','numero_endereco','logradouro','bairro','cidade','estado'
    ] as const;

    if (this.usuario.senha !== this.usuario.confirmarSenha) {
      alert('As senhas não coincidem.');
      return;
    }

    const faltando = camposObrig.filter(c => !String(this.usuario[c]).trim());
    if (faltando.length) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // prepara payload limpo para o backend
    const payload = {
      ...this.usuario,
      cpf: this.onlyDigits(this.usuario.cpf),
      telefone: this.onlyDigits(this.usuario.telefone),
      cep: this.onlyDigits(this.usuario.cep),
      estado: (this.usuario.estado || '').toUpperCase()
    };
    // opcional: não enviar confirmarSenha
    delete (payload as any).confirmarSenha;

    console.log('Payload para cadastro:', payload);

    this.cadastraClienteService.cadastrar(payload).subscribe({
      next: () => {
        alert('Cadastro realizado com sucesso!');
        form.resetForm();
        Object.keys(this.usuario).forEach(k => (this.usuario[k as keyof Usuario] = '' as any));
        this.router.navigate(['/usuario']); // ajuste a rota se necessário
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao cadastrar usuário.');
      }
    });
  }

  ngOnInit(): void {
    this.cadastraClienteService.buscarClientes().subscribe({
      next: (usuarios) => {
        const arr = usuarios || [];
        // guarda lista e índices por CPF (apenas dígitos)
        this.usuariosCadastrados = arr as Usuario[];
        this.cpfsCadastrados = (arr as Usuario[]).map(u => this.onlyDigits(u.cpf));
      }
    });
  }

  onCpfSelecionado(cpfDigitado: string): void {
    const alvo = this.onlyDigits(cpfDigitado);
    // se não existir, prepara para novo cadastro
    if (!this.cpfsCadastrados.includes(alvo)) {
      this.usuario = {
        cpf: cpfDigitado, // mantém o que o usuário digitou (pode estar mascarado)
        nome: '',
        nome_social: '',
        tipo_do_acesso: 'cliente',
        telefone: '',
        whatsappapikey: '',
        senha: '',
        confirmarSenha: '',
        email: '',
        nascimento: '',
        cep: '',
        logradouro: '',
        bairro: '',
        cidade: '',
        estado: '',
        complemento_endereco: '',
        numero_endereco: ''
      };
      return;
    }

    // existe: procura na lista carregada
    const existente = this.usuariosCadastrados.find(u => this.onlyDigits(u.cpf) === alvo);
    if (existente) {
      this.usuario.cpf                 = existente.cpf || cpfDigitado;
      this.usuario.nome                = existente.nome || '';
      this.usuario.nome_social          = existente.nome_social || '';
      this.usuario.telefone            = existente.telefone || '';
      this.usuario.whatsappapikey      = existente.whatsappapikey || '';
      this.usuario.senha               = existente.senha || '';
      this.usuario.email               = existente.email || '';
      this.usuario.nascimento          = existente.nascimento || '';
      this.usuario.cep                 = existente.cep || '';
      this.usuario.logradouro          = existente.logradouro || '';
      this.usuario.bairro              = existente.bairro || '';
      this.usuario.cidade              = existente.cidade || '';
      this.usuario.estado              = existente.estado || '';
      this.usuario.complemento_endereco = existente.complemento_endereco || '';
      this.usuario.numero_endereco      = existente.numero_endereco || '';
    }
  }
}
