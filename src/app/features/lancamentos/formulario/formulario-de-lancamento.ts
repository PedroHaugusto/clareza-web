import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { Categoria, Conta, Periodicidade, Transacao } from '../../../api/contratos';
import { ErroDaApi, mensagemDoCampo } from '../../../api/erro-da-api';
import { LancamentosService } from '../lancamentos.service';
import { RecorrenciasService } from '../recorrencias.service';

/**
 * As opcoes de repeticao expostas ao usuario. "Parcelado" nao e recorrencia: vira N lancamentos
 * independentes numa rota propria — por isso ele e um valor deste seletor, e nao uma
 * periodicidade.
 */
type Repeticao = 'NENHUMA' | 'PARCELADO' | Periodicidade;

const MINIMO_DE_PARCELAS = 2;

@Component({
  selector: 'app-formulario-de-lancamento',
  imports: [ReactiveFormsModule],
  templateUrl: './formulario-de-lancamento.html',
})
export class FormularioDeLancamento {
  /** Preenchido = edicao; nulo = criacao. */
  readonly transacao = input<Transacao | null>(null);
  readonly categorias = input.required<Categoria[]>();
  readonly contas = input.required<Conta[]>();

  readonly salvo = output<void>();
  readonly cancelado = output<void>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly servico = inject(LancamentosService);
  private readonly recorrencias = inject(RecorrenciasService);

  protected readonly formulario = this.formBuilder.nonNullable.group({
    descricao: ['', [Validators.required]],
    // Sempre positivo: o sinal vem do tipo. Mandar negativo responde 400.
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
    tipo: ['DESPESA', [Validators.required]],
    contaId: ['', [Validators.required]],
    categoriaId: ['', [Validators.required]],
    dataPrevista: [hoje(), [Validators.required]],
    jaEfetivado: [false],
    repeticao: ['NENHUMA'],
    totalParcelas: [2, [Validators.min(MINIMO_DE_PARCELAS)]],
  });

  protected readonly salvando = signal(false);
  protected readonly erro = signal<ErroDaApi | null>(null);
  protected readonly repeticaoEscolhida = signal<Repeticao>('NENHUMA');
  protected readonly tipoEscolhido = signal<string>('DESPESA');

  protected readonly editando = computed(() => this.transacao() !== null);
  protected readonly parcelando = computed(() => this.repeticaoEscolhida() === 'PARCELADO');

  /** Categoria de tipo incompativel nao deveria nem aparecer na lista. */
  protected readonly categoriasCompativeis = computed(() =>
    this.categorias().filter(
      (categoria) => categoria.tipo === 'AMBOS' || categoria.tipo === this.tipoEscolhido(),
    ),
  );

  constructor() {
    this.formulario.controls.repeticao.valueChanges.subscribe((valor) =>
      this.repeticaoEscolhida.set(valor as Repeticao),
    );
    this.formulario.controls.tipo.valueChanges.subscribe((valor) => {
      this.tipoEscolhido.set(valor);
      this.descartarCategoriaIncompativel();
    });

    effect(() => this.preencherComATransacao());
  }

  protected erroDoCampo(campo: string): string | null {
    return mensagemDoCampo(this.erro(), campo);
  }

  protected cancelar(): void {
    this.cancelado.emit();
  }

  protected enviar(): void {
    if (this.formulario.invalid || this.salvando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);

    this.requisicaoEscolhida().subscribe({
      next: () => this.salvo.emit(),
      error: (erro: ErroDaApi) => {
        this.salvando.set(false);
        this.erro.set(erro);
      },
    });
  }

  private requisicaoEscolhida(): Observable<unknown> {
    const valores = this.formulario.getRawValue();
    const emEdicao = this.transacao();

    const base = {
      contaId: Number(valores.contaId),
      categoriaId: Number(valores.categoriaId),
      descricao: valores.descricao.trim(),
      tipo: valores.tipo as 'RECEITA' | 'DESPESA',
    };

    if (emEdicao?.id !== undefined) {
      return this.servico.editar(emEdicao.id, {
        ...base,
        valor: Number(valores.valor),
        dataPrevista: valores.dataPrevista,
        // Preserva a efetivacao ja registrada: editar nao pode desconfirmar sem querer.
        dataEfetivacao: emEdicao.dataEfetivacao,
      });
    }

    if (valores.repeticao === 'PARCELADO') {
      // O valor informado e o **total**; a API divide e joga a sobra de centavos na ultima.
      return this.servico.criarParcelado({
        ...base,
        valorTotal: Number(valores.valor),
        dataDaPrimeiraParcela: valores.dataPrevista,
        totalParcelas: Number(valores.totalParcelas),
      });
    }

    if (valores.repeticao !== 'NENHUMA') {
      return this.recorrencias.criar({
        ...base,
        valor: Number(valores.valor),
        periodicidade: valores.repeticao as Periodicidade,
        ...diaDaRecorrencia(valores.repeticao as Periodicidade, valores.dataPrevista),
        dataInicio: valores.dataPrevista,
      });
    }

    return this.servico.criar({
      ...base,
      valor: Number(valores.valor),
      dataPrevista: valores.dataPrevista,
      // Informar a efetivacao na criacao ja nasce CONFIRMADA, evitando duas chamadas.
      dataEfetivacao: valores.jaEfetivado ? valores.dataPrevista : undefined,
    });
  }

  private preencherComATransacao(): void {
    const emEdicao = this.transacao();
    if (!emEdicao) {
      return;
    }

    this.tipoEscolhido.set(emEdicao.tipo ?? 'DESPESA');
    this.formulario.patchValue({
      descricao: emEdicao.descricao ?? '',
      valor: emEdicao.valor ?? null,
      tipo: emEdicao.tipo ?? 'DESPESA',
      contaId: String(emEdicao.contaId ?? ''),
      categoriaId: String(emEdicao.categoriaId ?? ''),
      dataPrevista: emEdicao.dataPrevista ?? hoje(),
      jaEfetivado: emEdicao.dataEfetivacao !== undefined,
    });
  }

  /** Trocar de receita para despesa nao pode deixar para tras uma categoria que sumiu da lista. */
  private descartarCategoriaIncompativel(): void {
    const escolhida = this.formulario.controls.categoriaId.value;
    const continuaValida = this.categoriasCompativeis().some(
      (categoria) => String(categoria.id) === escolhida,
    );

    if (escolhida && !continuaValida) {
      this.formulario.controls.categoriaId.setValue('');
    }
  }
}

function hoje(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/**
 * `MENSAL` e `ANUAL` exigem `diaDoMes`; `SEMANAL` exige `diaDaSemana`. Mandar os dois, ou
 * nenhum, responde 422 — por isso a escolha e exclusiva.
 *
 * A API conta a semana de 1 (segunda) a 7 (domingo); o JavaScript conta de 0 (domingo) a 6.
 */
function diaDaRecorrencia(
  periodicidade: Periodicidade,
  data: string,
): { diaDoMes?: number; diaDaSemana?: number } {
  const [ano, mes, dia] = data.split('-').map(Number);

  if (periodicidade === 'SEMANAL') {
    const diaNoJavaScript = new Date(ano, mes - 1, dia).getDay();
    return { diaDaSemana: diaNoJavaScript === 0 ? 7 : diaNoJavaScript };
  }

  return { diaDoMes: dia };
}
