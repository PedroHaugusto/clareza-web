import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { erroInterceptor } from '../../../core/http/erro.interceptor';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let elemento: HTMLElement;
  let http: HttpTestingController;
  let navegouPara: string[];
  let parametros: Record<string, string>;

  const preencher = (email: string, senha: string) => {
    definirValor('#email', email);
    definirValor('#senha', senha);
  };

  const definirValor = (seletor: string, valor: string) => {
    const campo = elemento.querySelector(seletor) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
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
    parametros = {};

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        // A tela conta com o erro ja normalizado pelo interceptor, como em producao.
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            // Getter, e nao valor fixo: assim um teste pode definir o returnUrl depois do setup.
            snapshot: {
              get queryParamMap() {
                return convertToParamMap(parametros);
              },
            },
          },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockImplementation((url) => {
      navegouPara.push(String(url));
      return Promise.resolve(true);
    });

    fixture = TestBed.createComponent(Login);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('naoEnvia_quandoOFormularioEstaInvalido', () => {
    preencher('nao-e-email', '');

    submeter();

    http.expectNone(`${environment.urlDaApi}/api/auth/login`);
    expect(elemento.textContent).toContain('Informe um e-mail valido.');
  });

  it('navegaParaOInicio_quandoOLoginTemSucesso', () => {
    preencher('ana@clareza.dev', 'senha-secreta');

    submeter();

    http
      .expectOne(`${environment.urlDaApi}/api/auth/login`)
      .flush({ id: 1, nome: 'Ana', email: 'ana@clareza.dev', token: 'token-emitido' });
    fixture.detectChanges();

    expect(navegouPara).toEqual(['/']);
  });

  it('voltaParaAPaginaPretendida_quandoOGuardGuardouOReturnUrl', () => {
    parametros['returnUrl'] = '/lancamentos';
    preencher('ana@clareza.dev', 'senha-secreta');

    submeter();

    http
      .expectOne(`${environment.urlDaApi}/api/auth/login`)
      .flush({ id: 1, nome: 'Ana', email: 'ana@clareza.dev', token: 'token-emitido' });
    fixture.detectChanges();

    expect(navegouPara).toEqual(['/lancamentos']);
  });

  it('exibeAMensagemUnicaDeCredencialInvalida_quandoOServidorRecusa', () => {
    preencher('ana@clareza.dev', 'errada');

    submeter();

    http.expectOne(`${environment.urlDaApi}/api/auth/login`).flush(
      {
        timestamp: '2026-08-16T05:16:56.791Z',
        status: 401,
        erro: 'Unauthorized',
        mensagem: 'E-mail ou senha invalidos',
        path: '/api/auth/login',
      },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'E-mail ou senha invalidos',
    );
    expect(navegouPara).toEqual([]);
  });

  it('destacaOCampoApontadoPelaApi_quandoAValidacaoReprova', () => {
    preencher('ana@clareza.dev', 'senha-secreta');

    submeter();

    http.expectOne(`${environment.urlDaApi}/api/auth/login`).flush(
      {
        timestamp: '2026-08-16T05:16:56.791Z',
        status: 400,
        erro: 'Bad Request',
        mensagem: 'Falha de validacao',
        path: '/api/auth/login',
        campos: [{ campo: 'email', mensagem: 'deve ser um e-mail valido' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(elemento.textContent).toContain('deve ser um e-mail valido');
  });

  it('reabilitaOBotao_quandoOEnvioFalha', () => {
    preencher('ana@clareza.dev', 'errada');

    submeter();
    const botao = elemento.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(botao.disabled).toBe(true);

    http
      .expectOne(`${environment.urlDaApi}/api/auth/login`)
      .flush({ status: 401, mensagem: 'E-mail ou senha invalidos' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(botao.disabled).toBe(false);
  });
});
