import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Conta, TipoConta } from '../../../api/contratos';
import { ErroDaApi, mensagemDoCampo } from '../../../api/erro-da-api';
import { ContaService } from '../../../core/dados/conta.service';

const ROTULOS: Record<TipoConta, string> = {
  CONTA_CORRENTE: 'Conta corrente',
  CONTA_POUPANCA: 'Conta poupanca',
  CARTAO_CREDITO: 'Cartao de credito',
  CARTEIRA: 'Carteira',
};

@Component({
  selector: 'app-contas',
  imports: [ReactiveFormsModule],
  templateUrl: './contas.html',
})
export class Contas {
  private readonly servico = inject(ContaService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly contas = signal<Conta[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erroAoCarregar = signal<ErroDaApi | null>(null);

  protected readonly criando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<ErroDaApi | null>(null);
  protected readonly aExcluir = signal<Conta | null>(null);
  protected readonly excluindo = signal(false);

  protected readonly tipos = Object.keys(ROTULOS) as TipoConta[];

  protected readonly formulario = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    tipo: ['CONTA_CORRENTE', [Validators.required]],
  });

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erroAoCarregar.set(null);

    this.servico.listar().subscribe({
      next: (contas) => {
        this.contas.set(contas);
        this.carregando.set(false);
      },
      error: (erro: ErroDaApi) => {
        this.erroAoCarregar.set(erro);
        this.carregando.set(false);
      },
    });
  }

  protected rotuloDoTipo(tipo: TipoConta | undefined): string {
    return tipo ? ROTULOS[tipo] : '';
  }

  protected erroDoCampo(campo: string): string | null {
    return mensagemDoCampo(this.erro(), campo);
  }

  protected abrirCriacao(): void {
    this.criando.set(true);
    this.erro.set(null);
    this.formulario.reset({ nome: '', tipo: 'CONTA_CORRENTE' });
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

    const { nome, tipo } = this.formulario.getRawValue();

    this.servico.criar({ nome: nome.trim(), tipo: tipo as TipoConta }).subscribe({
      next: () => {
        this.salvando.set(false);
        this.criando.set(false);
        this.carregar();
      },
      error: (erro: ErroDaApi) => {
        this.salvando.set(false);
        this.erro.set(erro);
      },
    });
  }

  protected pedirExclusao(conta: Conta): void {
    this.aExcluir.set(conta);
    this.erro.set(null);
  }

  protected desistirDaExclusao(): void {
    this.aExcluir.set(null);
  }

  protected excluir(): void {
    const conta = this.aExcluir();
    if (!conta || conta.id === undefined || this.excluindo()) {
      return;
    }

    this.excluindo.set(true);

    this.servico.excluir(conta.id).subscribe({
      next: () => {
        this.excluindo.set(false);
        this.aExcluir.set(null);
        this.carregar();
      },
      error: (erro: ErroDaApi) => {
        this.excluindo.set(false);
        this.aExcluir.set(null);
        // Conta com lancamentos responde 422, com a mensagem ja redigida pela API.
        this.erro.set(erro);
      },
    });
  }
}
