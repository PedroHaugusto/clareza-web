import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { Transacao } from '../../../api/contratos';
import { ErroDaApi } from '../../../api/erro-da-api';
import { LancamentosService } from '../../lancamentos/lancamentos.service';
import { CalendarioService } from '../calendario.service';

@Component({
  selector: 'app-vencimentos',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './vencimentos.html',
})
export class Vencimentos {
  /** Avisa a tela que um lancamento mudou de status, para o calendario recarregar junto. */
  readonly confirmado = output<void>();

  private readonly servico = inject(CalendarioService);
  private readonly lancamentos = inject(LancamentosService);

  protected readonly vencimentos = signal<Transacao[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<ErroDaApi | null>(null);
  protected readonly confirmando = signal<number | null>(null);
  protected readonly aviso = signal<string | null>(null);

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.servico.vencimentos().subscribe({
      next: (transacoes) => {
        this.vencimentos.set(transacoes);
        this.carregando.set(false);
      },
      error: (erro: ErroDaApi) => {
        this.erro.set(erro);
        this.carregando.set(false);
      },
    });
  }

  protected confirmar(transacao: Transacao): void {
    if (transacao.id === undefined || this.confirmando() !== null) {
      return;
    }

    this.confirmando.set(transacao.id);
    this.aviso.set(null);

    this.lancamentos.confirmar(transacao.id).subscribe({
      next: () => {
        this.confirmando.set(null);
        this.carregar();
        this.confirmado.emit();
      },
      error: (erro: ErroDaApi) => {
        this.confirmando.set(null);
        this.aviso.set(erro.mensagem);
        // Um 422 aqui significa que a lista envelheceu — recarregar tira o botao morto.
        if (erro.status === 422) {
          this.carregar();
        }
      },
    });
  }

  protected comoData(texto: string | undefined): Date | null {
    if (!texto) {
      return null;
    }
    const [ano, mes, dia] = texto.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }
}
