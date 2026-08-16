import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { erroInterceptor } from '../../core/http/erro.interceptor';
import { Lancamentos } from './lancamentos';

registerLocaleData(localePt, 'pt-BR');

describe('Lancamentos', () => {
  let fixture: ComponentFixture<Lancamentos>;
  let elemento: HTMLElement;
  let http: HttpTestingController;

  const rota = `${environment.urlDaApi}/api/transacoes`;

  const transacoes = [
    {
      id: 5,
      contaId: 1,
      categoriaId: 1,
      descricao: 'Salario de agosto',
      valor: 5000.0,
      tipo: 'RECEITA',
      dataPrevista: '2026-08-05',
      status: 'CONFIRMADA',
    },
    {
      id: 6,
      contaId: 1,
      categoriaId: 2,
      descricao: 'Conta de luz',
      valor: 89.9,
      tipo: 'DESPESA',
      dataPrevista: '2026-08-02',
      status: 'ATRASADA',
    },
    {
      id: 7,
      contaId: 2,
      categoriaId: 2,
      descricao: 'Curso',
      valor: 33.34,
      tipo: 'DESPESA',
      dataPrevista: '2026-09-01',
      status: 'PREVISTA',
      numeroParcela: 3,
      totalParcelas: 3,
    },
  ];

  /** A tela pede categorias e contas no construtor; os nomes vem dessas duas listas. */
  const responderCadastros = () => {
    http.expectOne(`${environment.urlDaApi}/api/categorias`).flush([
      { id: 1, nome: 'Salario', tipo: 'RECEITA', corHex: '#2E7D32', padraoDoSistema: true },
      { id: 2, nome: 'Moradia', tipo: 'DESPESA', corHex: '#6D4C41', padraoDoSistema: true },
    ]);
    http.expectOne(`${environment.urlDaApi}/api/contas`).flush([
      { id: 1, nome: 'Conta principal', tipo: 'CONTA_CORRENTE', cartaoDeCredito: false },
      { id: 2, nome: 'Cartao principal', tipo: 'CARTAO_CREDITO', cartaoDeCredito: true },
    ]);
  };

  const criarEResponder = (corpo: object = transacoes) => {
    fixture = TestBed.createComponent(Lancamentos);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    responderCadastros();
    http.expectOne((req) => req.url === rota).flush(corpo);
    fixture.detectChanges();
  };

  const definirFiltro = (seletor: string, valor: string) => {
    const campo = elemento.querySelector(seletor) as HTMLInputElement | HTMLSelectElement;
    campo.value = valor;
    campo.dispatchEvent(new Event(campo instanceof HTMLSelectElement ? 'change' : 'input'));
    fixture.detectChanges();
  };

  /**
   * O app e zoneless, entao `fakeAsync`/`tick` do Angular nao estao disponiveis — quem controla
   * o relogio do `debounceTime` sao os temporizadores do Vitest.
   */
  const passarOAtrasoDaBusca = () => {
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Lancamentos],
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    // Ligados depois do `compileComponents`, que e assincrono de verdade.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('buscaSemFiltro_naPrimeiraCarga', () => {
    fixture = TestBed.createComponent(Lancamentos);
    fixture.detectChanges();
    responderCadastros();

    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.keys()).toHaveLength(0);
    requisicao.flush([]);
  });

  it('mostraOsNomesDaCategoriaEDaConta_emVezDosIds', () => {
    criarEResponder();

    const texto = elemento.textContent ?? '';
    expect(texto).toContain('Salario');
    expect(texto).toContain('Conta principal');
    expect(texto).not.toContain('categoriaId');
  });

  it('poeOSinalPeloTipo_jaQueOValorChegaSemprePositivo', () => {
    criarEResponder();

    const valores = [...elemento.querySelectorAll('li span.tabular-nums')].map(
      (span) => span.textContent?.trim() ?? '',
    );
    expect(valores[0]).toContain('+');
    expect(valores[0]).toContain('5.000,00');
    expect(valores[1]).toContain('-');
    expect(valores[1]).toContain('89,90');
  });

  it('destacaOStatusAtrasada', () => {
    criarEResponder();

    const badges = [...elemento.querySelectorAll('li span.rounded-full')];
    expect(badges[1].textContent?.trim()).toBe('Atrasada');
    expect(badges[1].className).toContain('text-red-700');
  });

  it('mostraOAnoSoQuandoNaoEOCorrente', () => {
    const anoAtual = new Date().getFullYear();
    criarEResponder([
      { ...transacoes[0], id: 1, dataPrevista: `${anoAtual}-08-05` },
      { ...transacoes[0], id: 2, dataPrevista: `${anoAtual + 1}-08-05` },
    ]);

    // Uma recorrencia materializa 12 meses: sem o ano, "05 ago." apareceria duas vezes.
    const datas = [...elemento.querySelectorAll('li span.text-slate-500')].map(
      (span) => span.textContent?.trim() ?? '',
    );
    expect(datas[0]).toBe('05 ago.');
    expect(datas[1]).toBe(`05 ago. ${anoAtual + 1}`);
  });

  it('mostraONumeroDaParcela_quandoOLancamentoEParcelado', () => {
    criarEResponder();

    expect(elemento.textContent).toContain('(3/3)');
  });

  it('adiaABuscaEEnviaUmaRequisicaoSo_quandoOUsuarioDigita', () => {
    criarEResponder();

    definirFiltro('input[type="search"]', 'l');
    definirFiltro('input[type="search"]', 'lu');
    definirFiltro('input[type="search"]', 'luz');
    // Antes do atraso, nenhuma requisicao saiu.
    http.expectNone((req) => req.url === rota);

    passarOAtrasoDaBusca();
    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.get('busca')).toBe('luz');
    requisicao.flush([]);
    fixture.detectChanges();
  });

  it('combinaOsFiltrosDeTipoEPeriodo', () => {
    criarEResponder();

    definirFiltro('select[formControlName="tipo"]', 'DESPESA');
    definirFiltro('select[formControlName="periodo"]', 'PROXIMOS_30_DIAS');
    passarOAtrasoDaBusca();

    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.get('tipo')).toBe('DESPESA');
    expect(requisicao.request.params.get('periodo')).toBe('PROXIMOS_30_DIAS');
    requisicao.flush([]);
    fixture.detectChanges();
  });

  it('naoEnviaOPeriodoTodos_porqueEAusenciaDeFiltro', () => {
    criarEResponder();

    definirFiltro('select[formControlName="tipo"]', 'RECEITA');
    passarOAtrasoDaBusca();

    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.has('periodo')).toBe(false);
    requisicao.flush([]);
    fixture.detectChanges();
  });

  it('diferenciaListaVaziaDeBuscaSemResultado', () => {
    criarEResponder([]);

    expect(elemento.textContent).toContain('Voce ainda nao tem lancamentos');

    definirFiltro('input[type="search"]', 'inexistente');
    passarOAtrasoDaBusca();
    http.expectOne((req) => req.url === rota).flush([]);
    fixture.detectChanges();

    expect(elemento.textContent).toContain('Nenhum lancamento com esses filtros');
  });

  it('limpaOsFiltrosEBuscaDeNovo', () => {
    criarEResponder();

    definirFiltro('input[type="search"]', 'luz');
    passarOAtrasoDaBusca();
    http.expectOne((req) => req.url === rota).flush([]);
    fixture.detectChanges();

    (elemento.querySelector('form button') as HTMLButtonElement).click();
    fixture.detectChanges();
    passarOAtrasoDaBusca();

    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.keys()).toHaveLength(0);
    requisicao.flush(transacoes);
    fixture.detectChanges();
  });

  it('ofereceTentarDeNovo_quandoAConsultaFalha', () => {
    fixture = TestBed.createComponent(Lancamentos);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    responderCadastros();

    http
      .expectOne((req) => req.url === rota)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    fixture.detectChanges();

    const alerta = elemento.querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('servidor');

    (alerta?.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    http.expectOne((req) => req.url === rota).flush(transacoes);
    fixture.detectChanges();
    expect(elemento.textContent).toContain('Salario de agosto');
  });

  it('aindaListaOsLancamentos_quandoOsCadastrosDeApoioFalham', () => {
    fixture = TestBed.createComponent(Lancamentos);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    http
      .expectOne(`${environment.urlDaApi}/api/categorias`)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    http
      .expectOne(`${environment.urlDaApi}/api/contas`)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    http.expectOne((req) => req.url === rota).flush(transacoes);
    fixture.detectChanges();

    // Sem os nomes, mas a lista — que e o essencial da tela — continua de pe.
    expect(elemento.textContent).toContain('Salario de agosto');
  });
});
