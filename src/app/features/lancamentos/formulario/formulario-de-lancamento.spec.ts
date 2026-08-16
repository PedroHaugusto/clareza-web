import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Transacao } from '../../../api/contratos';
import { environment } from '../../../../environments/environment';
import { erroInterceptor } from '../../../core/http/erro.interceptor';
import { FormularioDeLancamento } from './formulario-de-lancamento';

describe('FormularioDeLancamento', () => {
  let fixture: ComponentFixture<FormularioDeLancamento>;
  let elemento: HTMLElement;
  let http: HttpTestingController;

  const rota = `${environment.urlDaApi}/api/transacoes`;
  const rotaDeRecorrencia = `${environment.urlDaApi}/api/transacoes-recorrentes`;

  const categorias = [
    { id: 1, nome: 'Salario', tipo: 'RECEITA' as const, corHex: '#2E7D32', padraoDoSistema: true },
    { id: 2, nome: 'Moradia', tipo: 'DESPESA' as const, corHex: '#6D4C41', padraoDoSistema: true },
    { id: 7, nome: 'Outros', tipo: 'AMBOS' as const, corHex: '#546E7A', padraoDoSistema: true },
  ];
  const contas = [
    { id: 1, nome: 'Conta principal', tipo: 'CONTA_CORRENTE' as const, cartaoDeCredito: false },
  ];

  const criar = (transacao: Transacao | null = null) => {
    fixture = TestBed.createComponent(FormularioDeLancamento);
    fixture.componentRef.setInput('categorias', categorias);
    fixture.componentRef.setInput('contas', contas);
    fixture.componentRef.setInput('transacao', transacao);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  };

  const definir = (seletor: string, valor: string) => {
    const campo = elemento.querySelector(seletor) as HTMLInputElement | HTMLSelectElement;
    campo.value = valor;
    campo.dispatchEvent(new Event(campo instanceof HTMLSelectElement ? 'change' : 'input'));
    fixture.detectChanges();
  };

  const preencherObrigatorios = () => {
    definir('input[formControlName="descricao"]', 'Conta de luz');
    definir('input[formControlName="valor"]', '89.90');
    definir('select[formControlName="categoriaId"]', '2');
    definir('select[formControlName="contaId"]', '1');
    definir('input[formControlName="dataPrevista"]', '2026-08-28');
  };

  const submeter = () => {
    (elemento.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormularioDeLancamento],
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('naoEnvia_quandoOsCamposObrigatoriosEstaoVazios', () => {
    criar();

    submeter();

    http.expectNone(rota);
    expect(elemento.textContent).toContain('Informe uma descricao.');
  });

  it('naoAceitaValorZeroOuNegativo', () => {
    criar();
    preencherObrigatorios();

    definir('input[formControlName="valor"]', '-10');
    submeter();

    // O valor e sempre positivo: o sinal vem do tipo, e negativo responde 400 na API.
    http.expectNone(rota);
    expect(elemento.textContent).toContain('Informe um valor maior que zero.');
  });

  it('criaUmLancamentoSimples', () => {
    criar();
    preencherObrigatorios();

    submeter();

    const requisicao = http.expectOne(rota);
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({
      contaId: 1,
      categoriaId: 2,
      descricao: 'Conta de luz',
      tipo: 'DESPESA',
      valor: 89.9,
      dataPrevista: '2026-08-28',
      dataEfetivacao: undefined,
    });
    requisicao.flush({ id: 9 });
  });

  it('jaNasceConfirmada_quandoMarcadoComoPago', () => {
    criar();
    preencherObrigatorios();

    const checkbox = elemento.querySelector(
      'input[formControlName="jaEfetivado"]',
    ) as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    submeter();

    // Informar a efetivacao na criacao evita uma segunda chamada so para confirmar.
    const requisicao = http.expectOne(rota);
    expect(requisicao.request.body.dataEfetivacao).toBe('2026-08-28');
    requisicao.flush({ id: 9 });
  });

  it('mandaOValorComoTotal_quandoEParcelado', () => {
    criar();
    preencherObrigatorios();

    definir('select[formControlName="repeticao"]', 'PARCELADO');
    definir('input[formControlName="totalParcelas"]', '3');
    submeter();

    const requisicao = http.expectOne(`${rota}/parcelada`);
    expect(requisicao.request.body).toEqual({
      contaId: 1,
      categoriaId: 2,
      descricao: 'Conta de luz',
      tipo: 'DESPESA',
      valorTotal: 89.9,
      dataDaPrimeiraParcela: '2026-08-28',
      totalParcelas: 3,
    });
    requisicao.flush([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('naoAceitaMenosDeDuasParcelas', () => {
    criar();
    preencherObrigatorios();

    definir('select[formControlName="repeticao"]', 'PARCELADO');
    definir('input[formControlName="totalParcelas"]', '1');
    submeter();

    http.expectNone(`${rota}/parcelada`);
    expect(elemento.textContent).toContain('Minimo de 2 parcelas.');
  });

  it('derivaODiaDoMes_quandoARepeticaoEMensal', () => {
    criar();
    preencherObrigatorios();

    definir('select[formControlName="repeticao"]', 'MENSAL');
    submeter();

    const requisicao = http.expectOne(rotaDeRecorrencia);
    expect(requisicao.request.body.periodicidade).toBe('MENSAL');
    expect(requisicao.request.body.diaDoMes).toBe(28);
    // Mandar os dois, ou nenhum, responde 422.
    expect(requisicao.request.body.diaDaSemana).toBeUndefined();
    requisicao.flush({ id: 1 });
  });

  it('derivaODiaDaSemanaNaContagemDaApi_quandoARepeticaoESemanal', () => {
    criar();
    preencherObrigatorios();

    // 2026-08-30 e um domingo: 0 no JavaScript, 7 na API.
    definir('input[formControlName="dataPrevista"]', '2026-08-30');
    definir('select[formControlName="repeticao"]', 'SEMANAL');
    submeter();

    const requisicao = http.expectOne(rotaDeRecorrencia);
    expect(requisicao.request.body.diaDaSemana).toBe(7);
    expect(requisicao.request.body.diaDoMes).toBeUndefined();
    requisicao.flush({ id: 1 });
  });

  it('mostraSoAsCategoriasCompativeisComOTipo', () => {
    criar();

    const opcoesDeDespesa = [
      ...elemento.querySelectorAll('select[formControlName="categoriaId"] option'),
    ].map((opcao) => opcao.textContent?.trim());
    expect(opcoesDeDespesa).toEqual(['Selecione', 'Moradia', 'Outros']);

    definir('select[formControlName="tipo"]', 'RECEITA');

    const opcoesDeReceita = [
      ...elemento.querySelectorAll('select[formControlName="categoriaId"] option'),
    ].map((opcao) => opcao.textContent?.trim());
    expect(opcoesDeReceita).toEqual(['Selecione', 'Salario', 'Outros']);
  });

  it('descartaACategoriaEscolhida_quandoElaNaoServeMaisParaONovoTipo', () => {
    criar();
    preencherObrigatorios();

    definir('select[formControlName="tipo"]', 'RECEITA');
    submeter();

    // Moradia e so de despesa: nao pode viajar escondida numa receita.
    http.expectNone(rota);
    expect(elemento.textContent).toContain('Escolha uma categoria.');
  });

  it('preencheOsCampos_quandoAbreParaEditar', () => {
    criar({
      id: 9,
      contaId: 1,
      categoriaId: 2,
      descricao: 'Aluguel',
      valor: 1200,
      tipo: 'DESPESA',
      dataPrevista: '2026-08-10',
      status: 'PREVISTA',
    });

    expect(elemento.textContent).toContain('Editar lancamento');
    expect(
      (elemento.querySelector('input[formControlName="descricao"]') as HTMLInputElement).value,
    ).toBe('Aluguel');
    // Repeticao nao se edita: o seletor nem aparece.
    expect(elemento.querySelector('select[formControlName="repeticao"]')).toBeNull();
  });

  it('preservaAEfetivacaoJaRegistrada_aoEditar', () => {
    criar({
      id: 9,
      contaId: 1,
      categoriaId: 2,
      descricao: 'Aluguel',
      valor: 1200,
      tipo: 'DESPESA',
      dataPrevista: '2026-08-10',
      dataEfetivacao: '2026-08-10',
      status: 'CONFIRMADA',
    });

    submeter();

    const requisicao = http.expectOne(`${rota}/9`);
    expect(requisicao.request.method).toBe('PUT');
    // Editar a descricao nao pode desconfirmar o lancamento sem querer.
    expect(requisicao.request.body.dataEfetivacao).toBe('2026-08-10');
    requisicao.flush({ id: 9 });
  });

  it('exibeAMensagemDaApi_quandoARegraDeNegocioRecusa', () => {
    criar();
    preencherObrigatorios();

    submeter();

    http.expectOne(rota).flush(
      {
        timestamp: '2026-08-16T05:16:56.791Z',
        status: 422,
        erro: 'Unprocessable Entity',
        mensagem: 'Categoria nao pertence ao usuario',
        path: '/api/transacoes',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'Categoria nao pertence ao usuario',
    );
  });

  it('avisaQuemSalvou_quandoDeuCerto', () => {
    criar();
    let salvou = false;
    fixture.componentInstance.salvo.subscribe(() => (salvou = true));
    preencherObrigatorios();

    submeter();
    http.expectOne(rota).flush({ id: 9 });

    expect(salvou).toBe(true);
  });
});
