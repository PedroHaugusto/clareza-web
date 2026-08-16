import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ResumoDoMes, VisaoGeral as DadosDaVisaoGeral } from '../../api/contratos';
import { ErroDaApi } from '../../api/erro-da-api';
import { VisaoGeralService } from './visao-geral.service';

@Component({
  selector: 'app-visao-geral',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './visao-geral.html',
})
export class VisaoGeral {
  private readonly servico = inject(VisaoGeralService);

  protected readonly dados = signal<DadosDaVisaoGeral | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<ErroDaApi | null>(null);

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.servico.consultar().subscribe({
      next: (visao) => {
        this.dados.set(visao);
        this.carregando.set(false);
      },
      error: (erro: ErroDaApi) => {
        this.erro.set(erro);
        this.carregando.set(false);
      },
    });
  }

  /**
   * A API devolve mes e ano separados. Montamos no dia 1 apenas para o `DatePipe` escrever o
   * nome do mes — nenhuma regra depende desta data.
   */
  protected primeiroDiaDe(resumo: ResumoDoMes): Date {
    return new Date(resumo.ano ?? 1970, (resumo.mes ?? 1) - 1, 1);
  }
}
