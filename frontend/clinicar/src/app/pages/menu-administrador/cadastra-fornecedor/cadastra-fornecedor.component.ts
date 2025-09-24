import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CadastraFornecedorService } from '../cadastra-fornecedor/cadastra-fornecedor.service';

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string; // cidade
  uf?: string;         // estado
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;
}

type Fornecedor = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  itemFornecido: string;
  telefone: string;
  email: string;
  fundacao: string;
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  complementoEndereco: string;
  numeroEndereco: string;
};

@Component({
  selector: 'app-cadastro-fornecedor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './cadastra-fornecedor.component.html',
  styleUrls: ['./cadastra-fornecedor.component.css']
})
export class CadastroFornecedorComponent implements OnInit {
  fornecedor: Fornecedor = {
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    itemFornecido: '',
    telefone: '',
    email: '',
    fundacao: '',
    cep: '',
    logradouro: '',
    bairro: '',
    cidade: '',
    estado: '',
    complementoEndereco: '',
    numeroEndereco: ''
  };

  fornecedoresCadastrados: any[] = [];
  cnpjsCadastrados: string[] = [];

  cepStatus = {
    loading: false,
    errorMsg: ''
  };

  @ViewChild('numeroInput') numeroInput?: ElementRef<HTMLInputElement>;

  constructor(
    private router: Router,
    private http: HttpClient,
    private CadastraFornecedorService: CadastraFornecedorService
  ) {}

  // ======== FORMATAÇÕES ========
  formatarCNPJ() {
    if (!this.fornecedor.cnpj) return;
    const nums = this.fornecedor.cnpj.replace(/\D/g, '');
    if (nums.length === 14) {
      this.fornecedor.cnpj = nums.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        '$1.$2.$3/$4-$5'
      );
    }
  }

  formatarTelefone() {
    if (!this.fornecedor.telefone) return;
    const numero = this.fornecedor.telefone.replace(/\D/g, '');
    const codigoPais = '55';
    if (numero.length >= 11) {
      const ddd = numero.slice(-11, -9);
      const parte1 = numero.slice(-9, -4);
      const parte2 = numero.slice(-4);
      this.fornecedor.telefone = `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    } else if (numero.length >= 10) {
      const ddd = numero.slice(0, 2);
      const parte1 = numero.slice(2, 6);
      const parte2 = numero.slice(6, 10);
      this.fornecedor.telefone = `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    } else if (numero.length >= 8) {
      const ddd = '11';
      const parte1 = numero.slice(0, numero.length - 4);
      const parte2 = numero.slice(-4);
      this.fornecedor.telefone = `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    }
  }

  private formatarCEP() {
    if (!this.fornecedor.cep) return;
    const nums = this.fornecedor.cep.replace(/\D/g, '').slice(0, 8);
    if (nums.length === 8) {
      this.fornecedor.cep = nums.replace(/(\d{5})(\d{3})/, '$1-$2');
    } else {
      this.fornecedor.cep = nums; // mantém o que há, sem hífen
    }
  }

  // ======== VIA CEP ========
  onCepBlur() {
    this.formatarCEP();
    const cepNums = this.fornecedor.cep.replace(/\D/g, '');
    if (cepNums.length !== 8) {
      this.cepStatus.errorMsg = 'CEP deve ter 8 dígitos.';
      return;
    }
    this.consultarCep(cepNums);
  }

  private consultarCep(cepNums: string) {
    this.cepStatus = { loading: true, errorMsg: '' };

    this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${cepNums}/json/`)
      .subscribe({
        next: (resp) => {
          if ((resp as any)?.erro) {
            this.cepStatus = { loading: false, errorMsg: 'CEP não encontrado.' };
            return;
          }
          // Preenche campos
          this.fornecedor.logradouro = resp.logradouro || '';
          this.fornecedor.bairro     = resp.bairro     || '';
          this.fornecedor.cidade     = resp.localidade || '';
          this.fornecedor.estado     = resp.uf         || '';
          if (!this.fornecedor.complementoEndereco && resp.complemento) {
            this.fornecedor.complementoEndereco = resp.complemento;
          }
          this.cepStatus = { loading: false, errorMsg: '' };

          // Foca no número (qualidade de UX)
          setTimeout(() => this.numeroInput?.nativeElement.focus(), 0);
        },
        error: () => {
          this.cepStatus = { loading: false, errorMsg: 'Falha ao consultar o CEP. Tente novamente.' };
        }
      });
  }

  // ======== CRUD ========
  cadastrar(form: NgForm) {
    // Validação simples
    const camposObrig = [
      'cnpj','razaoSocial','nomeFantasia','itemFornecido','telefone','email',
      'fundacao','cep','numeroEndereco','logradouro','bairro','cidade','estado'
    ] as const;

    const faltando = camposObrig.filter(c => !String(this.fornecedor[c]).trim());
    if (faltando.length) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    this.CadastraFornecedorService.cadastrar(this.fornecedor).subscribe({
      next: () => {
        alert('Cadastro realizado com sucesso!');
        form.resetForm();
        // limpa o modelo
        Object.keys(this.fornecedor).forEach(
          k => (this.fornecedor[k as keyof Fornecedor] = '' as any)
        );
        this.router.navigate(['/fornecedor']); // ajuste se necessário
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao cadastrar fornecedor.');
      }
    });
  }

  ngOnInit() {
    this.CadastraFornecedorService.buscarFornecedores().subscribe({
      next: (fornecedores) => {
        this.fornecedoresCadastrados = fornecedores || [];
        this.cnpjsCadastrados = (fornecedores || []).map((u: any) => u.cnpj);
      }
    });
  }

  onCnpjSelecionado(cnpj: string) {
    if (!this.cnpjsCadastrados.includes(cnpj)) {
      // novo fornecedor
      this.fornecedor = {
        cnpj,
        razaoSocial: '',
        nomeFantasia: '',
        itemFornecido: '',
        telefone: '',
        email: '',
        fundacao: '',
        cep: '',
        logradouro: '',
        bairro: '',
        cidade: '',
        estado: '',
        complementoEndereco: '',
        numeroEndereco: ''
      };
      return;
    }

    // existente → preencher
    this.CadastraFornecedorService.buscarFornecedores().subscribe((fornecedores: Fornecedor[] | Fornecedor) => {
      // Se o serviço retorna um array, pegue o primeiro elemento
      const f = Array.isArray(fornecedores) ? fornecedores[0] : fornecedores;
      if (f) {
        this.fornecedor.razaoSocial          = f.razaoSocial || '';
        this.fornecedor.nomeFantasia         = f.nomeFantasia || '';
        this.fornecedor.itemFornecido        = f.itemFornecido || '';
        this.fornecedor.telefone             = f.telefone || '';
        this.fornecedor.email                = f.email || '';
        this.fornecedor.fundacao             = f.fundacao || '';
        this.fornecedor.cep                  = f.cep || '';
        this.fornecedor.logradouro           = f.logradouro || '';
        this.fornecedor.bairro               = f.bairro || '';
        this.fornecedor.cidade               = f.cidade || '';
        this.fornecedor.estado               = f.estado || '';
        this.fornecedor.complementoEndereco  = f.complementoEndereco || '';
        this.fornecedor.numeroEndereco       = f.numeroEndereco || '';
      }
    });
  }
}
