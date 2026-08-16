import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { erroInterceptor } from '../../../core/http/erro.interceptor';
import { Contas } from './contas';

describe('Contas', () => {
  let fixture: ComponentFixture<Contas>;
  let elemento: HTMLElement;
  let http: HttpTestingController;

  const rota = `${environment.urlDaApi}/api/contas`;

  const contas = [
    { id: 1, nome: 'Conta principal', tipo: 'CONTA_CORRENTE', cartaoDeCredito: false },
    { id: 2, nome: 'Cartao principal', tipo: 'CARTAO_CREDITO', cartaoDeCredito: true },
  ];

  const criarEResponder = (corpo: object = contas) => {
    fixture = TestBed.createComponent(Contas);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne(rota).flush(corpo);
    fixture.detectChanges();
  };

  const clicarEm = (rotulo: string) => {
    const botao = [...elemento.querySelectorAll('button')].find(
      (candidato) => candidato.textContent?.trim() === rotulo,
    );
    botao!.click();
    fixture.detectChanges();
  };

  const definir = (seletor: string, valor: string) => {
    const campo = elemento.querySelector(seletor) as HTMLInputElement | HTMLSelectElement;
    campo.value = valor;
    campo.dispatchEvent(new Event(campo instanceof HTMLSelectElement ? 'change' : 'input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Contas],
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('diferenciaCartaoDeConta_pelaFlagEnaoPeloEnum', () => {
    criarEResponder();

    const rotulos = [...elemento.querySelectorAll('li span.rounded-md')].map((span) =>
      span.textContent?.trim(),
    );
    expect(rotulos).toEqual(['Conta', 'Cartao']);
    expect(elemento.textContent).toContain('Cartao de credito');
  });

  it('ofereceOsQuatroTipos', () => {
    criarEResponder();

    clicarEm('Nova');

    const opcoes = [...elemento.querySelectorAll('select[formControlName="tipo"] option')].map(
      (opcao) => opcao.textContent?.trim(),
    );
    expect(opcoes).toEqual(['Conta corrente', 'Conta poupanca', 'Cartao de credito', 'Carteira']);
  });

  it('criaERecarregaALista', () => {
    criarEResponder();

    clicarEm('Nova');
    definir('input[formControlName="nome"]', 'Carteira');
    definir('select[formControlName="tipo"]', 'CARTEIRA');
    clicarEm('Salvar');

    const criacao = http.expectOne((req) => req.method === 'POST' && req.url === rota);
    expect(criacao.request.body).toEqual({ nome: 'Carteira', tipo: 'CARTEIRA' });
    criacao.flush({ id: 3, nome: 'Carteira', tipo: 'CARTEIRA', cartaoDeCredito: false });
    fixture.detectChanges();

    http.expectOne((req) => req.method === 'GET' && req.url === rota).flush(contas);
    fixture.detectChanges();

    expect(elemento.querySelector('form')).toBeNull();
  });

  it('avisaQueContaComLancamentosNaoPodeSerExcluida', () => {
    criarEResponder();

    (
      elemento.querySelector(
        'button[aria-label="Excluir conta Conta principal"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(elemento.textContent).toContain('Contas com lancamentos nao podem ser excluidas');
  });

  it('mostraAMensagemDaApi_quandoAContaTemLancamentos', () => {
    criarEResponder();

    (
      elemento.querySelector(
        'button[aria-label="Excluir conta Conta principal"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const dialogo = elemento.querySelector('.fixed') as HTMLElement;
    [...dialogo.querySelectorAll('button')]
      .find((botao) => botao.textContent?.trim() === 'Excluir')!
      .click();
    fixture.detectChanges();

    http.expectOne(`${rota}/1`).flush(
      {
        timestamp: '2026-08-16T05:16:56.791Z',
        status: 422,
        erro: 'Unprocessable Entity',
        mensagem: 'Esta conta tem lancamentos e nao pode ser excluida',
        path: '/api/contas/1',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'Esta conta tem lancamentos e nao pode ser excluida',
    );
    // O dialogo fecha: insistir no mesmo botao nao mudaria o resultado.
    expect(elemento.querySelector('.fixed')).toBeNull();
  });
});
