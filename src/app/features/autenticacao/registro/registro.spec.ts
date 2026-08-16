import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { erroInterceptor } from '../../../core/http/erro.interceptor';
import { ArmazenamentoDeSessao } from '../../../core/sessao/armazenamento-de-sessao';
import { Registro } from './registro';

describe('Registro', () => {
  let fixture: ComponentFixture<Registro>;
  let elemento: HTMLElement;
  let http: HttpTestingController;
  let navegouPara: string[];

  const definirValor = (seletor: string, valor: string) => {
    const campo = elemento.querySelector(seletor) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  };

  const preencher = (nome: string, email: string, senha: string) => {
    definirValor('#nome', nome);
    definirValor('#email', email);
    definirValor('#senha', senha);
  };

  const submeter = () => {
    (elemento.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    fixture.detectChanges();
  };

  beforeEach(async () => {
    localStorage.clear();
    navegouPara = [];

    await TestBed.configureTestingModule({
      imports: [Registro],
      providers: [
        // A tela conta com o erro ja normalizado pelo interceptor, como em producao.
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockImplementation((url) => {
      navegouPara.push(String(url));
      return Promise.resolve(true);
    });

    fixture = TestBed.createComponent(Registro);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('naoEnvia_quandoASenhaEMenorQueOMinimo', () => {
    preencher('Ana', 'ana@clareza.dev', 'curta');

    submeter();

    http.expectNone(`${environment.urlDaApi}/api/auth/registrar`);
    expect(elemento.textContent).toContain('pelo menos 8 caracteres');
  });

  it('naoEnvia_quandoASenhaPassaDoTetoDoBcrypt', () => {
    preencher('Ana', 'ana@clareza.dev', 'a'.repeat(73));

    submeter();

    http.expectNone(`${environment.urlDaApi}/api/auth/registrar`);
  });

  it('entraDiretoSemPassarPeloLogin_quandoORegistroTemSucesso', () => {
    preencher('Ana', 'ana@clareza.dev', 'senha-secreta');

    submeter();

    http
      .expectOne(`${environment.urlDaApi}/api/auth/registrar`)
      .flush({ id: 1, nome: 'Ana', email: 'ana@clareza.dev', token: 'token-emitido' });
    fixture.detectChanges();

    // O registro ja devolve o token: nao existe uma chamada a /login em seguida.
    http.expectNone(`${environment.urlDaApi}/api/auth/login`);
    expect(TestBed.inject(ArmazenamentoDeSessao).lerToken()).toBe('token-emitido');
    expect(navegouPara).toEqual(['/']);
  });

  it('exibeAMensagemDaApi_quandoOEmailJaTemConta', () => {
    preencher('Ana', 'ana@clareza.dev', 'senha-secreta');

    submeter();

    http.expectOne(`${environment.urlDaApi}/api/auth/registrar`).flush(
      {
        timestamp: '2026-08-16T05:16:56.791Z',
        status: 422,
        erro: 'Unprocessable Entity',
        mensagem: 'Ja existe uma conta com este e-mail',
        path: '/api/auth/registrar',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'Ja existe uma conta com este e-mail',
    );
    expect(navegouPara).toEqual([]);
  });
});
