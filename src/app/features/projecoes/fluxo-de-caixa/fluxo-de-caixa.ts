import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { FluxoDeCaixa as DadosDoFluxo, FluxoMensal } from '../../../api/contratos';
import { ErroDaApi } from '../../../api/erro-da-api';
import { AREA_DO_SALDO, CORES } from '../../../core/graficos/cores';
import { opcoesBase, rotuloDoMes } from '../../../core/graficos/opcoes';
import { FluxoDeCaixaService, MAXIMO_DE_MESES } from '../fluxo-de-caixa.service';

const JANELAS = [3, 6, 12, 24] as const;

@Component({
  selector: 'app-fluxo-de-caixa',
  imports: [CurrencyPipe, FormsModule, BaseChartDirective],
  // Declarado no componente, e nao no `app.config`: assim o Chart.js viaja no chunk
  // desta rota em vez de entrar no bundle inicial de quem nunca abre um grafico.
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './fluxo-de-caixa.html',
})
export class FluxoDeCaixa {
  private readonly servico = inject(FluxoDeCaixaService);

  protected readonly janelas = JANELAS;
  protected readonly maximoDeMeses = MAXIMO_DE_MESES;

  protected readonly mesesPassados = signal(6);
  protected readonly mesesFuturos = signal(6);

  protected readonly dados = signal<DadosDoFluxo | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<ErroDaApi | null>(null);

  protected readonly meses = computed(() => this.dados()?.meses ?? []);
  protected readonly saldoAnterior = computed(() => this.dados()?.saldoAnterior ?? 0);

  /**
   * O `saldoAnterior` e o que existia antes da janela. Sem ele na curva, o grafico comecaria do
   * zero como se nao houvesse passado — por isso ele entra como o ponto de partida da linha.
   */
  protected readonly comecaAntesDoZero = computed(() => this.saldoAnterior() !== 0);

  private readonly rotulos = computed(() => {
    const anoBase = this.meses()[0]?.ano ?? new Date().getFullYear();
    const dosMeses = this.meses().map((mes) =>
      rotuloDoMes(mes.mes ?? 1, mes.ano ?? anoBase, anoBase),
    );
    return ['antes', ...dosMeses];
  });

  protected readonly opcoes = opcoesBase((valor) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  );

  protected readonly graficoDoAcumulado = computed<ChartConfiguration<'line'>['data']>(() => ({
    labels: this.rotulos(),
    datasets: [
      {
        label: 'Saldo acumulado',
        data: [this.saldoAnterior(), ...this.meses().map((mes) => mes.saldoAcumulado ?? 0)],
        borderColor: CORES.SALDO,
        backgroundColor: AREA_DO_SALDO,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: CORES.SALDO,
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.25,
      },
    ],
  }));

  protected readonly graficoDeMovimento = computed<ChartConfiguration<'bar'>['data']>(() => {
    const anoBase = this.meses()[0]?.ano ?? new Date().getFullYear();

    return {
      labels: this.meses().map((mes) => rotuloDoMes(mes.mes ?? 1, mes.ano ?? anoBase, anoBase)),
      datasets: [
        {
          label: 'Entradas',
          data: this.meses().map((mes) => mes.entradas ?? 0),
          backgroundColor: CORES.RECEITA,
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.7,
        },
        {
          label: 'Saidas',
          data: this.meses().map((mes) => mes.saidas ?? 0),
          backgroundColor: CORES.DESPESA,
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.7,
        },
      ],
    };
  });

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.servico.consultar(this.mesesPassados(), this.mesesFuturos()).subscribe({
      next: (fluxo) => {
        this.dados.set(fluxo);
        this.carregando.set(false);
      },
      error: (erro: ErroDaApi) => {
        this.erro.set(erro);
        this.carregando.set(false);
      },
    });
  }

  protected escolherPassado(meses: number): void {
    this.mesesPassados.set(meses);
    this.carregar();
  }

  protected escolherFuturo(meses: number): void {
    this.mesesFuturos.set(meses);
    this.carregar();
  }

  protected rotuloDoMesNaTabela(mes: FluxoMensal): string {
    const anoBase = this.meses()[0]?.ano ?? new Date().getFullYear();
    return rotuloDoMes(mes.mes ?? 1, mes.ano ?? anoBase, anoBase);
  }
}
