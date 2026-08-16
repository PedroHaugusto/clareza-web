import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Categoria, TipoCategoria } from '../../../api/contratos';
import { ErroDaApi, mensagemDoCampo } from '../../../api/erro-da-api';
import { CategoriaService } from '../../../core/dados/categoria.service';

@Component({
  selector: 'app-categorias',
  imports: [ReactiveFormsModule],
  templateUrl: './categorias.html',
})
export class Categorias {
  private readonly servico = inject(CategoriaService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erroAoCarregar = signal<ErroDaApi | null>(null);

  protected readonly criando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<ErroDaApi | null>(null);
  protected readonly aExcluir = signal<Categoria | null>(null);
  protected readonly excluindo = signal(false);

  protected readonly formulario = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    tipo: ['DESPESA', [Validators.required]],
    // `input type="color"` sempre entrega `#rrggbb` valido — a API normaliza para maiusculas.
    corHex: ['#546E7A', [Validators.required]],
  });

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erroAoCarregar.set(null);

    this.servico.listar().subscribe({
      next: (categorias) => {
        this.categorias.set(categorias);
        this.carregando.set(false);
      },
      error: (erro: ErroDaApi) => {
        this.erroAoCarregar.set(erro);
        this.carregando.set(false);
      },
    });
  }

  protected rotuloDoTipo(tipo: TipoCategoria | undefined): string {
    if (tipo === 'RECEITA') return 'Receita';
    if (tipo === 'DESPESA') return 'Despesa';
    return 'Receita e despesa';
  }

  protected erroDoCampo(campo: string): string | null {
    return mensagemDoCampo(this.erro(), campo);
  }

  protected abrirCriacao(): void {
    this.criando.set(true);
    this.erro.set(null);
    this.formulario.reset({ nome: '', tipo: 'DESPESA', corHex: '#546E7A' });
  }

  protected cancelarCriacao(): void {
    this.criando.set(false);
    this.erro.set(null);
  }

  protected criar(): void {
    if (this.formulario.invalid || this.salvando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);

    const { nome, tipo, corHex } = this.formulario.getRawValue();

    this.servico.criar({ nome: nome.trim(), tipo: tipo as TipoCategoria, corHex }).subscribe({
      next: () => {
        this.salvando.set(false);
        this.criando.set(false);
        this.carregar();
      },
      error: (erro: ErroDaApi) => {
        this.salvando.set(false);
        // Tipicamente 422 de nome duplicado, com texto ja redigido para o usuario.
        this.erro.set(erro);
      },
    });
  }

  protected pedirExclusao(categoria: Categoria): void {
    this.aExcluir.set(categoria);
    this.erro.set(null);
  }

  protected desistirDaExclusao(): void {
    this.aExcluir.set(null);
  }

  protected excluir(): void {
    const categoria = this.aExcluir();
    if (!categoria || categoria.id === undefined || this.excluindo()) {
      return;
    }

    this.excluindo.set(true);

    this.servico.excluir(categoria.id).subscribe({
      next: () => {
        this.excluindo.set(false);
        this.aExcluir.set(null);
        this.carregar();
      },
      error: (erro: ErroDaApi) => {
        this.excluindo.set(false);
        this.aExcluir.set(null);
        this.erro.set(erro);
      },
    });
  }
}
