import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, merge, of, startWith, switchMap, tap } from 'rxjs';
import {
  Categoria,
  Conta,
  FiltroDeTransacoes,
  StatusTransacao,
  Transacao,
} from '../../api/contratos';
import { ErroDaApi } from '../../api/erro-da-api';
import { CategoriaService } from '../../core/dados/categoria.service';
import { ContaService } from '../../core/dados/conta.service';
import { LancamentosService } from './lancamentos.service';

const ATRASO_DA_BUSCA_EM_MS = 300;

@Component({
  selector: 'app-lancamentos',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './lancamentos.html',
})
export class Lancamentos {
  private readonly servico = inject(LancamentosService);
  private readonly formBuilder = inject(FormBuilder);

  private readonly recarregar = new Subject<void>();
  private readonly anoAtual = new Date().getFullYear();

  protected readonly filtros = this.formBuilder.nonNullable.group({
    busca: '',
    tipo: '',
    // `TODOS` como padrao: comecar filtrado por mes esconderia lancamentos futuros e faria o
    // usuario procurar por um lancamento que ele mesmo acabou de criar.
    periodo: 'TODOS',
    categoriaId: '',
    contaId: '',
  });

  protected readonly transacoes = signal<Transacao[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly contas = signal<Conta[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<ErroDaApi | null>(null);

  /**
   * Os filtros que produziram a lista atual — atualizados junto com a busca, nao a cada tecla.
   * Assim o estado vazio explica o resultado que esta na tela, e nao o que o usuario acabou de
   * digitar e ainda nem foi consultado.
   */
  private readonly filtrosDaBusca = signal<FiltroDeTransacoes>({});

  /** Distingue "nao ha nada cadastrado" de "os filtros nao acharam nada". */
  protected readonly filtrandoAlgo = computed(() => Object.keys(this.filtrosDaBusca()).length > 0);

  private readonly nomeDaCategoria = computed(
    () => new Map(this.categorias().map((categoria) => [categoria.id, categoria.nome])),
  );
  private readonly nomeDaConta = computed(
    () => new Map(this.contas().map((conta) => [conta.id, conta.nome])),
  );

  constructor() {
    inject(CategoriaService)
      .listar()
      .pipe(
        catchError(() => of<Categoria[]>([])),
        takeUntilDestroyed(),
      )
      .subscribe((categorias) => this.categorias.set(categorias));

    inject(ContaService)
      .listar()
      .pipe(
        catchError(() => of<Conta[]>([])),
        takeUntilDestroyed(),
      )
      .subscribe((contas) => this.contas.set(contas));

    // `switchMap` cancela a busca anterior: digitando rapido, so a ultima resposta vale — sem
    // ele, uma resposta lenta de tres letras atras poderia chegar depois e sobrescrever a lista.
    merge(this.recarregar, this.filtros.valueChanges.pipe(debounceTime(ATRASO_DA_BUSCA_EM_MS)))
      .pipe(
        startWith(undefined),
        tap(() => {
          this.carregando.set(true);
          this.erro.set(null);
          this.filtrosDaBusca.set(this.montarFiltros());
        }),
        switchMap(() =>
          this.servico.listar(this.filtrosDaBusca()).pipe(
            catchError((erro: ErroDaApi) => {
              this.erro.set(erro);
              return of<Transacao[]>([]);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((transacoes) => {
        this.transacoes.set(transacoes);
        this.carregando.set(false);
      });
  }

  protected buscarDeNovo(): void {
    this.recarregar.next();
  }

  protected limparFiltros(): void {
    this.filtros.reset({ busca: '', tipo: '', periodo: 'TODOS', categoriaId: '', contaId: '' });
  }

  protected categoriaDe(transacao: Transacao): string {
    return this.nomeDaCategoria().get(transacao.categoriaId) ?? '';
  }

  protected contaDe(transacao: Transacao): string {
    return this.nomeDaConta().get(transacao.contaId) ?? '';
  }

  protected rotuloDoStatus(status: StatusTransacao | undefined): string {
    if (status === 'CONFIRMADA') return 'Confirmada';
    if (status === 'ATRASADA') return 'Atrasada';
    return 'Prevista';
  }

  protected classeDoStatus(status: StatusTransacao | undefined): string {
    if (status === 'CONFIRMADA') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    if (status === 'ATRASADA') return 'bg-red-50 text-red-700 ring-red-200';
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }

  /** Monta a data no fuso local so para o `DatePipe`: a string vem como `yyyy-MM-dd`. */
  protected dataDe(transacao: Transacao): Date | null {
    if (!transacao.dataPrevista) {
      return null;
    }
    const [ano, mes, dia] = transacao.dataPrevista.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }

  /**
   * Mostra o ano so quando ele nao e o corrente.
   *
   * Nao e enfeite: criar uma recorrencia materializa 12 meses de ocorrencias, entao a lista
   * costuma atravessar a virada do ano. Sem o ano, "10 ago." apareceria duas vezes com valores
   * diferentes e nada explicaria a diferenca.
   */
  protected formatoDaData(transacao: Transacao): string {
    const data = this.dataDe(transacao);
    return data && data.getFullYear() !== this.anoAtual ? 'dd MMM y' : 'dd MMM';
  }

  /** Apenas os filtros preenchidos — o servico ignora vazios, isto e para a interface saber. */
  private montarFiltros(): FiltroDeTransacoes {
    const { busca, tipo, periodo, categoriaId, contaId } = this.filtros.getRawValue();
    const aplicados: FiltroDeTransacoes = {};

    if (busca.trim()) aplicados.busca = busca.trim();
    if (tipo) aplicados.tipo = tipo as NonNullable<FiltroDeTransacoes['tipo']>;
    if (periodo && periodo !== 'TODOS') {
      aplicados.periodo = periodo as NonNullable<FiltroDeTransacoes['periodo']>;
    }
    if (categoriaId) aplicados.categoriaId = Number(categoriaId);
    if (contaId) aplicados.contaId = Number(contaId);

    return aplicados;
  }
}
