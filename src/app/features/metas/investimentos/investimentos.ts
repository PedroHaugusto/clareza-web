import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Carteira, Investimento, MetaDeAporte, TipoInvestimento } from '../../../api/contratos';
import { ErroDaApi, mensagemDoCampo } from '../../../api/erro-da-api';
import { InvestimentosService } from '../investimentos.service';

const ROTULOS: Record<TipoInvestimento, string> = {
  RENDA_FIXA: 'Renda fixa',
  ACOES: 'Acoes',
  FIIS: 'FIIs',
  CRIPTO: 'Cripto',
  TESOURO: 'Tesouro',
};

@Component({
  selector: 'app-investimentos',
  imports: [CurrencyPipe, DecimalPipe, ReactiveFormsModule],
  templateUrl: './investimentos.html',
})
export class Investimentos {
  private readonly servico = inject(InvestimentosService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly tipos = Object.keys(ROTULOS) as TipoInvestimento[];

  protected readonly carteira = signal<Carteira | null>(null);
  protected readonly aporte = signal<MetaDeAporte | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erroAoCarregar = signal<ErroDaApi | null>(null);

  protected readonly emFormulario = signal<Investimento | null>(null);
  protected readonly formularioAberto = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<ErroDaApi | null>(null);
  protected readonly aExcluir = signal<Investimento | null>(null);
  protected readonly editandoAporte = signal(false);

  protected readonly investimentos = computed(() => this.carteira()?.investimentos ?? []);

  protected readonly formulario = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    tipo: ['RENDA_FIXA', [Validators.required]],
    valorInvestido: [null as number | null, [Validators.required, Validators.min(0.01)]],
    // Sem `min`: rentabilidade negativa e um resultado legitimo, nao erro de digitacao.
    rentabilidadeInformada: [null as number | null],
  });

  protected readonly formularioDoAporte = this.formBuilder.nonNullable.group({
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erroAoCarregar.set(null);

    this.servico.carteira().subscribe({
      next: (carteira) => {
        this.carteira.set(carteira);
        this.carregando.set(false);
      },
      error: (erro: ErroDaApi) => {
        this.erroAoCarregar.set(erro);
        this.carregando.set(false);
      },
    });

    this.servico.metaDeAporte().subscribe({
      next: (aporte) => this.aporte.set(aporte),
      error: () => undefined,
    });
  }

  protected rotuloDoTipo(tipo: TipoInvestimento | undefined): string {
    return tipo ? ROTULOS[tipo] : '';
  }

  protected erroDoCampo(campo: string): string | null {
    return mensagemDoCampo(this.erro(), campo);
  }

  protected abrirCriacao(): void {
    this.emFormulario.set(null);
    this.erro.set(null);
    this.formulario.reset({
      nome: '',
      tipo: 'RENDA_FIXA',
      valorInvestido: null,
      rentabilidadeInformada: null,
    });
    this.formularioAberto.set(true);
  }

  protected abrirEdicao(investimento: Investimento): void {
    this.emFormulario.set(investimento);
    this.erro.set(null);
    this.formulario.reset({
      nome: investimento.nome ?? '',
      tipo: investimento.tipo ?? 'RENDA_FIXA',
      valorInvestido: investimento.valorInvestido ?? null,
      rentabilidadeInformada: investimento.rentabilidadeInformada ?? null,
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
      tipo: valores.tipo as TipoInvestimento,
      valorInvestido: Number(valores.valorInvestido),
      // Zero e rentabilidade informada; nulo e "nao informei".
      ...(valores.rentabilidadeInformada !== null
        ? { rentabilidadeInformada: Number(valores.rentabilidadeInformada) }
        : {}),
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

  protected pedirExclusao(investimento: Investimento): void {
    this.aExcluir.set(investimento);
    this.erro.set(null);
  }

  protected desistirDaExclusao(): void {
    this.aExcluir.set(null);
  }

  protected excluir(): void {
    const investimento = this.aExcluir();
    if (!investimento || investimento.id === undefined) {
      return;
    }

    this.servico.excluir(investimento.id).subscribe({
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

  protected abrirAporte(): void {
    this.formularioDoAporte.reset({ valor: this.aporte()?.valor ?? null });
    this.editandoAporte.set(true);
  }

  protected cancelarAporte(): void {
    this.editandoAporte.set(false);
  }

  protected salvarAporte(): void {
    if (this.formularioDoAporte.invalid) {
      this.formularioDoAporte.markAllAsTouched();
      return;
    }

    this.servico
      .definirMetaDeAporte(Number(this.formularioDoAporte.getRawValue().valor))
      .subscribe({
        next: (aporte) => {
          this.aporte.set(aporte);
          this.editandoAporte.set(false);
        },
        error: (erro: ErroDaApi) => this.erro.set(erro),
      });
  }

  protected removerAporte(): void {
    this.servico.removerMetaDeAporte().subscribe({
      next: () => this.aporte.set({ valor: undefined, definida: false }),
      error: (erro: ErroDaApi) => this.erro.set(erro),
    });
  }
}
