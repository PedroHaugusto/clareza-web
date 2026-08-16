import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Calendario as DadosDoCalendario, DiaDoCalendario, Transacao } from '../../api/contratos';
import { ErroDaApi } from '../../api/erro-da-api';
import { CategoriaService } from '../../core/dados/categoria.service';
import { CalendarioService } from './calendario.service';
import { Vencimentos } from './vencimentos/vencimentos';

/** Uma celula da grade. `dia` nulo e o espaco antes do dia 1 ou depois do ultimo. */
export interface CelulaDoMes {
  dia: number | null;
  data: string;
  movimento: DiaDoCalendario | null;
}

const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

@Component({
  selector: 'app-calendario',
  imports: [CurrencyPipe, DatePipe, Vencimentos],
  templateUrl: './calendario.html',
})
export class Calendario {
  private readonly servico = inject(CalendarioService);

  protected readonly diasDaSemana = DIAS_DA_SEMANA;

  protected readonly mes = signal(new Date().getMonth() + 1);
  protected readonly ano = signal(new Date().getFullYear());

  protected readonly dados = signal<DadosDoCalendario | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<ErroDaApi | null>(null);
  protected readonly diaSelecionado = signal<DiaDoCalendario | null>(null);
  protected readonly categorias = signal(new Map<number | undefined, string>());

  /**
   * "Hoje" pelo relogio do navegador, so para o destaque visual. A API decide o que esta
   * atrasado usando America/Sao_Paulo — se os dois divergirem perto da meia-noite, o status
   * que vale e o que veio dela.
   */
  private readonly hoje = comoTexto(new Date());

  protected readonly primeiroDiaDoMes = computed(
    () => new Date(this.ano(), this.mes() - 1, 1),
  );

  /** A grade inteira do mes: a API so devolve os dias que tem movimento. */
  protected readonly celulas = computed<CelulaDoMes[]>(() => {
    const ano = this.ano();
    const mes = this.mes();

    const movimentoPorData = new Map(
      (this.dados()?.dias ?? []).map((dia) => [dia.data, dia]),
    );

    const espacosAntes = new Date(ano, mes - 1, 1).getDay();
    const diasNoMes = new Date(ano, mes, 0).getDate();

    const vazias: CelulaDoMes[] = Array.from({ length: espacosAntes }, () => ({
      dia: null,
      data: '',
      movimento: null,
    }));

    const doMes: CelulaDoMes[] = Array.from({ length: diasNoMes }, (_, indice) => {
      const dia = indice + 1;
      const data = `${ano}-${dois(mes)}-${dois(dia)}`;
      return { dia, data, movimento: movimentoPorData.get(data) ?? null };
    });

    return [...vazias, ...doMes];
  });

  constructor() {
    inject(CategoriaService)
      .listar()
      .subscribe({
        next: (categorias) =>
          this.categorias.set(new Map(categorias.map((c) => [c.id, c.nome ?? '']))),
        error: () => undefined,
      });

    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.diaSelecionado.set(null);

    this.servico.consultar(this.mes(), this.ano()).subscribe({
      next: (calendario) => {
        this.dados.set(calendario);
        this.carregando.set(false);
      },
      error: (erro: ErroDaApi) => {
        this.erro.set(erro);
        this.carregando.set(false);
      },
    });
  }

  protected mesAnterior(): void {
    if (this.mes() === 1) {
      this.mes.set(12);
      this.ano.update((ano) => ano - 1);
    } else {
      this.mes.update((mes) => mes - 1);
    }
    this.carregar();
  }

  protected mesSeguinte(): void {
    if (this.mes() === 12) {
      this.mes.set(1);
      this.ano.update((ano) => ano + 1);
    } else {
      this.mes.update((mes) => mes + 1);
    }
    this.carregar();
  }

  protected voltarParaHoje(): void {
    const agora = new Date();
    this.mes.set(agora.getMonth() + 1);
    this.ano.set(agora.getFullYear());
    this.carregar();
  }

  protected ehHoje(celula: CelulaDoMes): boolean {
    return celula.data === this.hoje;
  }

  protected selecionar(celula: CelulaDoMes): void {
    if (!celula.movimento) {
      return;
    }
    const jaAberto = this.diaSelecionado()?.data === celula.data;
    this.diaSelecionado.set(jaAberto ? null : celula.movimento);
  }

  protected categoriaDe(transacao: Transacao): string {
    return this.categorias().get(transacao.categoriaId) ?? '';
  }

  /** Monta a data no fuso local so para o `DatePipe`: a string vem como `yyyy-MM-dd`. */
  protected comoData(texto: string | undefined): Date | null {
    if (!texto) {
      return null;
    }
    const [ano, mes, dia] = texto.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }
}

function dois(numero: number): string {
  return String(numero).padStart(2, '0');
}

function comoTexto(data: Date): string {
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`;
}
