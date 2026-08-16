import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { erroInterceptor } from '../../core/http/erro.interceptor';
import { VisaoGeral } from './visao-geral';

registerLocaleData(localePt, 'pt-BR');

describe('VisaoGeral', () => {
  let fixture: ComponentFixture<VisaoGeral>;
  let elemento: HTMLElement;
  let http: HttpTestingController;

  const painel = {
    saldoDisponivel: 3710.1,
    saldoRealizado: 3800.0,
    mesAtual: {
      mes: 8,
      ano: 2026,
      receitasRealizadas: 5000.0,
      receitasPrevistas: 0.0,
      despesasRealizadas: 1200.0,
      despesasPrevistas: 89.9,
      totalReceitas: 5000.0,
      totalDespesas: 1289.9,
      saldoDoMes: 3710.1,
    },
    proximosMeses: [
      { mes: 9, ano: 2026, totalReceitas: 0, totalDespesas: 0, saldoDoMes: 0 },
      { mes: 10, ano: 2026, totalReceitas: 0, totalDespesas: 0, saldoDoMes: 0 },
      { mes: 11, ano: 2026, totalReceitas: 0, totalDespesas: 0, saldoDoMes: 0 },
    ],
  };

  const criar = () => {
    fixture = TestBed.createComponent(VisaoGeral);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  };

  const responder = (corpo: object) => {
    http.expectOne(`${environment.urlDaApi}/api/visao-geral`).flush(corpo);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisaoGeral],
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

  afterEach(() => http.verify());

  it('avisaQueOServidorPodeEstarAcordando_enquantoCarrega', () => {
    criar();

    expect(elemento.textContent).toContain('Carregando');
    expect(elemento.textContent).toContain('acordar');

    responder(painel);
  });

  it('mostraOsDoisSaldosComOSignificadoDeCada', () => {
    criar();

    responder(painel);

    const texto = elemento.textContent ?? '';
    expect(texto).toContain('Saldo disponivel');
    expect(texto).toContain('Depois de pagar tudo que vence neste mes.');
    expect(texto).toContain('Saldo realizado');
    expect(texto).toContain('So o que ja foi confirmado.');
  });

  it('formataOsValoresEmReais', () => {
    criar();

    responder(painel);

    // O locale pt-BR usa ponto para milhar e virgula para centavos.
    expect(elemento.textContent).toContain('3.710,10');
    expect(elemento.textContent).toContain('R$');
  });

  it('detalhaORealizadoEOPrevistoDoMesAtual', () => {
    criar();

    responder(painel);

    const texto = elemento.textContent ?? '';
    expect(texto).toContain('Recebido');
    expect(texto).toContain('A receber');
    expect(texto).toContain('Pago');
    expect(texto).toContain('A pagar');
    expect(texto).toContain('1.289,90');
  });

  it('escreveOMesSemCapitalizarAPreposicao', () => {
    criar();

    responder(painel);

    // `capitalize` do Tailwind escreveria "Agosto De 2026"; so a primeira letra sobe.
    const titulo = elemento.querySelector('h2') as HTMLElement;
    expect(titulo.textContent?.trim()).toBe('agosto de 2026');
    expect(titulo.className).toContain('first-letter:uppercase');
  });

  it('listaOsTresProximosMeses', () => {
    criar();

    responder(painel);

    expect(elemento.textContent).toContain('Proximos meses');
    expect(elemento.querySelectorAll('section:last-of-type article')).toHaveLength(3);
  });

  it('pintaDeVermelho_quandoOSaldoDisponivelENegativo', () => {
    criar();

    responder({ ...painel, saldoDisponivel: -250.5 });

    const destaque = elemento.querySelector('article p.text-3xl') as HTMLElement;
    expect(destaque.className).toContain('text-red-700');
    expect(destaque.textContent).toContain('250,50');
  });

  it('naoQuebra_quandoOMesAtualNaoTrazTodosOsCampos', () => {
    criar();

    // A API omite campos nulos em vez de mandar null.
    responder({ saldoDisponivel: 0, saldoRealizado: 0, mesAtual: { mes: 8, ano: 2026 } });

    expect(elemento.textContent).toContain('Visao geral');
  });

  it('ofereceTentarDeNovo_quandoAConsultaFalha', () => {
    criar();

    http
      .expectOne(`${environment.urlDaApi}/api/visao-geral`)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    fixture.detectChanges();

    const alerta = elemento.querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('servidor');

    (alerta?.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    responder(painel);
    expect(elemento.textContent).toContain('Saldo disponivel');
  });
});
