import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { erroInterceptor } from '../../../core/http/erro.interceptor';
import { Vencimentos } from './vencimentos';

registerLocaleData(localePt, 'pt-BR');

describe('Vencimentos', () => {
  let fixture: ComponentFixture<Vencimentos>;
  let elemento: HTMLElement;
  let http: HttpTestingController;

  const rota = `${environment.urlDaApi}/api/vencimentos`;

  const vencimentos = [
    {
      id: 6,
      descricao: 'Conta de luz',
      valor: 89.9,
      tipo: 'DESPESA',
      dataPrevista: '2026-08-02',
      status: 'ATRASADA',
    },
    {
      id: 7,
      descricao: 'Salario',
      valor: 5000,
      tipo: 'RECEITA',
      dataPrevista: '2026-08-25',
      status: 'PREVISTA',
    },
  ];

  const criarEResponder = (corpo: object = vencimentos) => {
    fixture = TestBed.createComponent(Vencimentos);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne(rota).flush(corpo);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Vencimentos],
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

  it('mantemAOrdemDaApi_queJaVemPorUrgencia', () => {
    criarEResponder();

    const descricoes = [...elemento.querySelectorAll('li')].map(
      (item) => item.querySelector('span.block')?.textContent?.trim().split('\n')[0],
    );
    expect(descricoes[0]).toContain('Conta de luz');
    expect(descricoes[1]).toContain('Salario');
  });

  it('destacaOQueJaVenceu', () => {
    criarEResponder();

    const badges = [...elemento.querySelectorAll('li span.rounded-full')];
    expect(badges[0].textContent?.trim()).toBe('Atrasada');
    expect(badges[0].className).toContain('text-red-700');
    expect(badges[1].textContent?.trim()).toBe('Prevista');
  });

  it('usaOVerboCertoParaCadaTipo', () => {
    criarEResponder();

    const botoes = [...elemento.querySelectorAll('li button')].map((botao) =>
      botao.textContent?.trim(),
    );
    expect(botoes).toEqual(['Marcar como paga', 'Marcar como recebida']);
  });

  it('comemoraQuandoNaoHaNadaVencendo', () => {
    criarEResponder([]);

    expect(elemento.textContent).toContain('Tudo em dia');
  });

  it('confirmaRecarregaEAvisaATela', () => {
    criarEResponder();
    let avisou = false;
    fixture.componentInstance.confirmado.subscribe(() => (avisou = true));

    (elemento.querySelector('li button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const confirmacao = http.expectOne(`${environment.urlDaApi}/api/transacoes/6/confirmar`);
    expect(confirmacao.request.method).toBe('PATCH');
    confirmacao.flush({ id: 6, status: 'CONFIRMADA' });
    fixture.detectChanges();

    // Confirmado sai da lista de vencimentos, e o calendario ao lado precisa saber.
    http.expectOne(rota).flush([vencimentos[1]]);
    fixture.detectChanges();
    expect(avisou).toBe(true);
    expect(elemento.textContent).not.toContain('Conta de luz');
  });

  it('recarrega_quandoOServidorDizQueJaEstavaConfirmada', () => {
    criarEResponder();

    (elemento.querySelector('li button') as HTMLButtonElement).click();
    fixture.detectChanges();

    http.expectOne(`${environment.urlDaApi}/api/transacoes/6/confirmar`).flush(
      {
        timestamp: '2026-08-16T05:16:56.791Z',
        status: 422,
        erro: 'Unprocessable Entity',
        mensagem: 'Esta transacao ja foi confirmada',
        path: '/api/transacoes/6/confirmar',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'Esta transacao ja foi confirmada',
    );
    http.expectOne(rota).flush([vencimentos[1]]);
    fixture.detectChanges();
  });
});
