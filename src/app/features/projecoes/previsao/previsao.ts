import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { Cenario, Previsao as DadosDaPrevisao, PrevisaoMensal } from '../../../api/contratos';
import { ErroDaApi } from '../../../api/erro-da-api';
import { AREA_DO_SALDO, CORES } from '../../../core/graficos/cores';
import { opcoesBase, rotuloDoMes } from '../../../core/graficos/opcoes';
import { Horizonte, PrevisaoService } from '../previsao.service';

@Component({
  selector: 'app-previsao',
  imports: [CurrencyPipe, FormsModule, BaseChartDirective],
  // Declarado no componente, e nao no `app.config`: assim o Chart.js viaja no chunk
  // desta rota em vez de entrar no bundle inicial de quem nunca abre um grafico.
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './previsao.html',
})
export class Previsao {
  private readonly servico = inject(PrevisaoService);

  protected readonly horizonte = signal<Horizonte>(6);
  protected readonly cenario = signal<Cenario>('PROVAVEL');
  protected readonly ajusteReceita = signal(10);
  protected readonly ajusteDespesa = signal(10);

  /** Enquanto false, a consulta omite os ajustes e a API usa a preferencia salva. */
  protected readonly ajustando = signal(false);
  protected readonly preferenciaSalva = signal(false);

  protected readonly dados = signal<DadosDaPrevisao | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<ErroDaApi | null>(null);

  protected readonly meses = computed(() => this.dados()?.meses ?? []);

  /** O cenario so muda os totais: sem ajuste aplicado, nao ha o que explicar na tela. */
  protected readonly cenarioAjustado = computed(
    () => this.cenario() !== 'PROVAVEL' && this.meses().length > 0,
  );

  private readonly rotulos = computed(() => {
    const primeiro = this.meses()[0];
    const anoBase = primeiro?.ano ?? new Date().getFullYear();
    return this.meses().map((mes) => rotuloDoMes(mes.mes ?? 1, mes.ano ?? anoBase, anoBase));
  });

  protected readonly opcoes = opcoesBase((valor) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  );

  protected readonly graficoDoSaldo = computed<ChartConfiguration<'line'>['data']>(() => ({
    labels: this.rotulos(),
    datasets: [
      {
        label: 'Saldo projetado',
        data: this.meses().map((mes) => mes.saldoProjetado ?? 0),
        borderColor: CORES.SALDO,
        backgroundColor: AREA_DO_SALDO,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: CORES.SALDO,
        // Anel da cor da superficie, para o ponto nao se fundir com a linha.
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.25,
      },
    ],
  }));

  protected readonly graficoDeMovimento = computed<ChartConfiguration<'bar'>['data']>(() => ({
    labels: this.rotulos(),
    datasets: [
      {
        label: 'Receitas',
        data: this.meses().map((mes) => mes.totalReceitasPrevistas ?? 0),
        backgroundColor: CORES.RECEITA,
        borderRadius: 4,
        // Respiro entre as barras do mesmo mes, para elas nao virarem um bloco so.
        barPercentage: 0.8,
        categoryPercentage: 0.7,
      },
      {
        label: 'Despesas',
        data: this.meses().map((mes) => mes.totalDespesasPrevistas ?? 0),
        backgroundColor: CORES.DESPESA,
        borderRadius: 4,
        barPercentage: 0.8,
        categoryPercentage: 0.7,
      },
    ],
  }));

  constructor() {
    this.servico.preferencia().subscribe({
      next: (preferencia) => {
        this.ajusteReceita.set(preferencia.percentualAjusteReceita ?? 10);
        this.ajusteDespesa.set(preferencia.percentualAjusteDespesa ?? 10);
      },
      error: () => undefined,
    });

    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.preferenciaSalva.set(false);

    this.servico
      .consultar({
        meses: this.horizonte(),
        cenario: this.cenario(),
        ...(this.ajustando()
          ? { ajusteReceita: this.ajusteReceita(), ajusteDespesa: this.ajusteDespesa() }
          : {}),
      })
      .subscribe({
        next: (previsao) => {
          this.dados.set(previsao);
          this.carregando.set(false);
        },
        error: (erro: ErroDaApi) => {
          this.erro.set(erro);
          this.carregando.set(false);
        },
      });
  }

  protected escolherHorizonte(meses: Horizonte): void {
    this.horizonte.set(meses);
    this.carregar();
  }

  protected escolherCenario(cenario: Cenario): void {
    this.cenario.set(cenario);
    this.carregar();
  }

  protected ajustar(): void {
    this.ajustando.set(true);
    this.carregar();
  }

  protected salvarPreferencia(): void {
    this.servico
      .salvarPreferencia({
        percentualAjusteReceita: this.ajusteReceita(),
        percentualAjusteDespesa: this.ajusteDespesa(),
      })
      .subscribe({
        next: () => this.preferenciaSalva.set(true),
        error: (erro: ErroDaApi) => this.erro.set(erro),
      });
  }

  protected rotuloDoMesNaTabela(mes: PrevisaoMensal): string {
    const anoBase = this.meses()[0]?.ano ?? new Date().getFullYear();
    return rotuloDoMes(mes.mes ?? 1, mes.ano ?? anoBase, anoBase);
  }
}
