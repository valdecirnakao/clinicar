import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CadastraPecaService } from './cadastra-peca.service';

type Peca = {
  id_peca: number;
  nome: string;
  tipo?: string;
  especificacao?: string;
  fabricante: string;
  modelo?: string;
  norma?: string;
  unidade: string;
};

@Component({
  selector: 'app-cadastra-peca',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './cadastra-peca.component.html',
  styleUrls: ['./cadastra-peca.component.css']
})
export class CadastraPecaComponent implements OnInit {
  peca: Peca = {
    id_peca: 0,
    nome: '',
    tipo: '',
    especificacao: '',
    fabricante: '',
    modelo: '',
    norma: '',
    unidade: ''
  };

  pecasCadastradas: Peca[] = [];

  constructor(
    private readonly cadastraPecaService: CadastraPecaService,
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}


  // ========= FORMATAÇÕES =========

  formatarEspecificacao(): void {
    const s = (this.peca.especificacao || '').trim();
    this.peca.especificacao = s.toUpperCase();
  }

  formatarModelo(): void {
    const s = (this.peca.modelo || '').trim();
    this.peca.modelo = s.toUpperCase();
  }

  formatarNorma(): void {
    const s = (this.peca.norma || '').trim();
    this.peca.norma = s.toUpperCase();
  }

  CapitalizarNome(): void {
    const s = (this.peca.nome || '').trim();
    this.peca.nome = s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  CapitalizarTipo(): void {
    const s = (this.peca.tipo || '').trim();
    this.peca.tipo = s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }


  CapitalizarFabricante(): void {
    const s = (this.peca.fabricante).trim();
    this.peca.fabricante = s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  CapitalizarUnidade(): void {
    const s = (this.peca.unidade).trim();
    this.peca.unidade = s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }


  // ========= CRUD =========
  cadastrar(form: NgForm): void {
    // validações básicas
    const camposObrig = [
      'nome','fabricante','unidade'
    ] as const;

    const faltando = camposObrig.filter(c => !String(this.peca[c]).trim());
    if (faltando.length) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // prepara payload limpo para o backend
    const payload = {
      ...this.peca,
      nome: (this.peca.nome ?? '').toLowerCase(),
      tipo: (this.peca.tipo ?? '').toLowerCase(),
      especificacao: (this.peca.especificacao ?? '').toLowerCase(),
      fabricante: (this.peca.fabricante ?? '').toLowerCase(),
      modelo: (this.peca.modelo ?? '').toLowerCase(),
      norma: (this.peca.norma ?? '').toLowerCase(),
      unidade: (this.peca.unidade ?? '').toLowerCase()
    };
    // opcional: não enviar id_peca
    delete (payload as any).id_peca;

    console.log('Payload para cadastro:', payload);

    this.cadastraPecaService.cadastrar(payload).subscribe({
      next: () => {
        alert('Cadastro realizado com sucesso!');
        form.resetForm();
        // reset the peca object with properly typed values
        this.peca = {
          id_peca: 0,
          nome: '',
          tipo: '',
          especificacao: '',
          fabricante: '',
          modelo: '',
          norma: '',
          unidade: ''
        };
        this.router.navigate(['/peca']); // ajuste a rota se necessário
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao cadastrar peça.');
      }
    });
  }

  ngOnInit(): void {
    this.cadastraPecaService.buscarPecas().subscribe({
      next: (pecas) => {
        const arr = pecas || [];
        // guarda lista e índices por ID da peça
        this.pecasCadastradas = arr as Peca[];
      }
    });
  }
}
