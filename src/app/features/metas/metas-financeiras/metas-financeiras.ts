import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MetaFinanceira } from '../../../api/contratos';
import { ErroDaApi, mensagemDoCampo } from '../../../api/erro-da-api';
import { MetasService } from '../metas.service';

@Component({
  selector: 'app-metas-financeiras',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, ReactiveFormsModule],
  templateUrl: './metas-financeiras.html',
})
export class MetasFinanceiras {
  private readonly servico = inject(MetasService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly metas = signal<MetaFinanceira[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erroAoCarregar = signal<ErroDaApi | null>(null);

  protected readonly emFormulario = signal<MetaFinanceira | null>(null);
  protected readonly formularioAberto = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<ErroDaApi | null>(null);
  protected readonly aExcluir = signal<MetaFinanceira | null>(null);

  protected readonly formulario = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    valorObjetivo: [null as number | null, [Validators.required, Validators.min(0.01)]],
    valorAtual: [0],
    prazo: [''],
    descricao: [''],
  });

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erroAoCarregar.set(null);

    this.servico.listar().subscribe({
      next: (metas) => {
        this.metas.set(metas);
        this.carregando.set(false);
      },
      error: (erro: ErroDaApi) => {
        this.erroAoCarregar.set(erro);
        this.carregando.set(false);
      },
    });
  }

  /**
   * Meta superada devolve percentual acima de 100. A barra para em 100 para nao estourar o
   * layout — o numero ao lado continua mostrando o valor real.
   */
  protected larguraDaBarra(meta: MetaFinanceira): string {
    return `${Math.min(meta.percentualConcluido ?? 0, 100)}%`;
  }

  protected erroDoCampo(campo: string): string | null {
    return mensagemDoCampo(this.erro(), campo);
  }

  protected abrirCriacao(): void {
    this.emFormulario.set(null);
    this.erro.set(null);
    this.formulario.reset({ nome: '', valorObjetivo: null, valorAtual: 0, prazo: '', descricao: '' });
    this.formularioAberto.set(true);
  }

  protected abrirEdicao(meta: MetaFinanceira): void {
    this.emFormulario.set(meta);
    this.erro.set(null);
    this.formulario.reset({
      nome: meta.nome ?? '',
      valorObjetivo: meta.valorObjetivo ?? null,
      valorAtual: meta.valorAtual ?? 0,
      prazo: meta.prazo ?? '',
      descricao: meta.descricao ?? '',
    });
    this.formularioAberto.set(true);
  }

  protected fechar(): void {
    this.formularioAberto.set(false);
    this.emFormulario.set(null);
  }

  protected salvar(): void {
    if (this.formulario.invalid || this.salvando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);

    const valores = this.formulario.getRawValue();
    const dados = {
      nome: valores.nome.trim(),
      valorObjetivo: Number(valores.valorObjetivo),
      valorAtual: Number(valores.valorAtual),
      // Campos opcionais ficam de fora quando vazios, em vez de irem como string em branco.
      ...(valores.prazo ? { prazo: valores.prazo } : {}),
      ...(valores.descricao.trim() ? { descricao: valores.descricao.trim() } : {}),
    };

    const emEdicao = this.emFormulario();
    const requisicao =
      emEdicao?.id !== undefined
        ? this.servico.editar(emEdicao.id, dados)
        : this.servico.criar(dados);

    requisicao.subscribe({
      next: () => {
        this.salvando.set(false);
        this.fechar();
        this.carregar();
      },
      error: (erro: ErroDaApi) => {
        this.salvando.set(false);
        this.erro.set(erro);
      },
    });
  }

  protected pedirExclusao(meta: MetaFinanceira): void {
    this.aExcluir.set(meta);
    this.erro.set(null);
  }

  protected desistirDaExclusao(): void {
    this.aExcluir.set(null);
  }

  protected excluir(): void {
    const meta = this.aExcluir();
    if (!meta || meta.id === undefined) {
      return;
    }

    this.servico.excluir(meta.id).subscribe({
      next: () => {
        this.aExcluir.set(null);
        this.carregar();
      },
      error: (erro: ErroDaApi) => {
        this.aExcluir.set(null);
        this.erro.set(erro);
      },
    });
  }

  /** Monta a data no fuso local so para exibir: a string vem como `yyyy-MM-dd`. */
  protected comoData(texto: string | undefined): Date | null {
    if (!texto) {
      return null;
    }
    const [ano, mes, dia] = texto.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }
}
