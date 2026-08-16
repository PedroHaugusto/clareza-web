import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { erroInterceptor } from '../../core/http/erro.interceptor';
import { Calendario } from './calendario';

registerLocaleData(localePt, 'pt-BR');

describe('Calendario', () => {
  let fixture: ComponentFixture<Calendario>;
  let elemento: HTMLElement;
  let http: HttpTestingController;

  const rota = `${environment.urlDaApi}/api/calendario`;

  // Agosto de 2026 comeca num sabado e tem 31 dias.
  const agosto = {
    mes: 8,
    ano: 2026,
    totalReceitas: 5000,
    totalDespesas: 1289.9,
    saldoDoMes: 3710.1,
    dias: [
      {
        data: '2026-08-05',
        totalReceitas: 5000,
        totalDespesas: 0,
        saldoDoDia: 5000,
        transacoes: [
          { id: 1, categoriaId: 1, descricao: 'Salario', valor: 5000, tipo: 'RECEITA' },
        ],
      },
      {
        data: '2026-08-10',
        totalReceitas: 0,
        totalDespesas: 1289.9,
        saldoDoDia: -1289.9,
        transacoes: [
          { id: 2, categoriaId: 2, descricao: 'Aluguel', valor: 1289.9, tipo: 'DESPESA' },
        ],
      },
    ],
  };

  const responderApoio = () => {
    http
      .expectOne(`${environment.urlDaApi}/api/categorias`)
      .flush([
        { id: 1, nome: 'Salario', tipo: 'RECEITA', corHex: '#2E7D32', padraoDoSistema: true },
        { id: 2, nome: 'Moradia', tipo: 'DESPESA', corHex: '#6D4C41', padraoDoSistema: true },
      ]);
    http.expectOne(`${environment.urlDaApi}/api/vencimentos`).flush([]);
  };

  const criarEResponder = (corpo: object = agosto) => {
    fixture = TestBed.createComponent(Calendario);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    responderApoio();
    http.expectOne((req) => req.url === rota).flush(corpo);
    fixture.detectChanges();
  };

  const clicarEm = (rotulo: string) => {
    const botao = [...elemento.querySelectorAll('button')].find(
      (candidato) =>
        candidato.textContent?.trim() === rotulo ||
        candidato.getAttribute('aria-label') === rotulo,
    );
    botao!.click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.setSystemTime(new Date(2026, 7, 16));

    await TestBed.configureTestingModule({
      imports: [Calendario],
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('abreNoMesCorrente', () => {
    fixture = TestBed.createComponent(Calendario);
    fixture.detectChanges();
    responderApoio();

    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.get('mes')).toBe('8');
    expect(requisicao.request.params.get('ano')).toBe('2026');
    requisicao.flush(agosto);
  });

  it('desenhaAGradeInteiraDoMes_aindaQueAApiSoMandeOsDiasComMovimento', () => {
    criarEResponder();

    const celulas = [...elemento.querySelectorAll('.grid.grid-cols-7')[1].children];
    // Agosto de 2026 comeca num sabado: 6 espacos vazios antes do dia 1, mais 31 dias.
    expect(celulas).toHaveLength(37);
    expect(celulas.filter((celula) => celula.tagName === 'BUTTON')).toHaveLength(2);
  });

  it('marcaOsDiasComReceitaEComDespesa', () => {
    criarEResponder();

    const diasComMovimento = [...elemento.querySelectorAll('.grid.grid-cols-7 button')];
    expect(diasComMovimento[0].querySelector('.bg-emerald-500')).not.toBeNull();
    expect(diasComMovimento[0].querySelector('.bg-red-500')).toBeNull();
    expect(diasComMovimento[1].querySelector('.bg-red-500')).not.toBeNull();
  });

  it('abreOsLancamentosDoDia_aoClicarNumaCelulaMarcada', () => {
    criarEResponder();

    clicarEm('Dia 10 com lancamentos');

    const texto = elemento.textContent ?? '';
    expect(texto).toContain('Aluguel');
    expect(texto).toContain('Moradia');
    expect(texto).toContain('Saldo do dia');
  });

  it('fechaOPainel_aoClicarDeNovoNoMesmoDia', () => {
    criarEResponder();

    clicarEm('Dia 10 com lancamentos');
    expect(elemento.textContent).toContain('Aluguel');

    clicarEm('Dia 10 com lancamentos');
    expect(elemento.textContent).toContain('Clique num dia marcado');
  });

  it('navegaParaOMesSeguinte', () => {
    criarEResponder();

    clicarEm('Mes seguinte');

    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.get('mes')).toBe('9');
    expect(requisicao.request.params.get('ano')).toBe('2026');
    requisicao.flush({ mes: 9, ano: 2026, dias: [] });
    fixture.detectChanges();
  });

  it('viraOAno_quandoPassaDeDezembro', () => {
    criarEResponder();

    for (const mesEsperado of [9, 10, 11, 12, 1]) {
      clicarEm('Mes seguinte');
      const requisicao = http.expectOne((req) => req.url === rota);
      expect(requisicao.request.params.get('mes')).toBe(String(mesEsperado));
      requisicao.flush({ dias: [] });
      fixture.detectChanges();
    }

    expect(elemento.querySelector('h2')?.textContent?.trim()).toBe('janeiro de 2027');
  });

  it('viraOAnoParaTras_quandoPassaDeJaneiro', () => {
    criarEResponder();

    for (const mesEsperado of [7, 6, 5, 4, 3, 2, 1, 12]) {
      clicarEm('Mes anterior');
      const requisicao = http.expectOne((req) => req.url === rota);
      expect(requisicao.request.params.get('mes')).toBe(String(mesEsperado));
      requisicao.flush({ dias: [] });
      fixture.detectChanges();
    }

    expect(elemento.querySelector('h2')?.textContent?.trim()).toBe('dezembro de 2025');
  });

  it('destacaODiaDeHoje', () => {
    criarEResponder();

    const dezesseis = [...elemento.querySelectorAll('.grid.grid-cols-7')[1].children].find(
      (celula) => celula.textContent?.trim() === '16',
    );
    expect(dezesseis?.className).toContain('text-emerald-700');
  });

  it('destacaODiaDeHoje_mesmoQuandoEleTemLancamento', () => {
    // Dia com movimento vira botao, e o destaque fica no numero dentro dele — nao na celula.
    criarEResponder({
      ...agosto,
      dias: [{ data: '2026-08-16', totalReceitas: 0, totalDespesas: 50, saldoDoDia: -50, transacoes: [] }],
    });

    const destacado = elemento.querySelector('.grid.grid-cols-7 button span.font-bold');
    expect(destacado?.textContent?.trim()).toBe('16');
  });

  it('ofereceTentarDeNovo_quandoAConsultaFalha', () => {
    fixture = TestBed.createComponent(Calendario);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    responderApoio();

    http
      .expectOne((req) => req.url === rota)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Erro' });
    fixture.detectChanges();

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('servidor');
    clicarEm('Tentar de novo');
    http.expectOne((req) => req.url === rota).flush(agosto);
    fixture.detectChanges();

    expect(elemento.textContent).toContain('Receitas');
  });
});
