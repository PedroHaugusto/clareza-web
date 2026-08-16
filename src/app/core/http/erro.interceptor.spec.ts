import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ErroDaApi, MENSAGEM_DE_INDISPONIBILIDADE } from '../../api/erro-da-api';
import { environment } from '../../../environments/environment';
import { ArmazenamentoDeSessao } from '../sessao/armazenamento-de-sessao';
import { AuthService } from '../sessao/auth.service';
import { semTratamentoDeSessao } from './contexto-http';
import { erroInterceptor } from './erro.interceptor';

describe('erroInterceptor', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;
  let auth: AuthService;
  let router: Router;
  let navegouPara: string[];

  const corpoDeErro = (status: number, mensagem: string, campos?: ErroDaApi['campos']) => ({
    timestamp: '2026-08-16T05:16:56.791Z',
    status,
    erro: 'Erro',
    mensagem,
    path: '/api/qualquer',
    campos,
  });

  beforeEach(() => {
    localStorage.clear();
    navegouPara = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation((comandos) => {
      navegouPara.push(String(comandos));
      return Promise.resolve(true);
    });
    TestBed.inject(ArmazenamentoDeSessao).guardarToken('token-guardado');
  });

  afterEach(() => {
    controlador.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('deslogaERedireciona_quandoASessaoExpira', () => {
    let recebido: ErroDaApi | null = null;
    http.get(`${environment.urlDaApi}/api/transacoes`).subscribe({
      error: (erro: ErroDaApi) => (recebido = erro),
    });

    controlador
      .expectOne(`${environment.urlDaApi}/api/transacoes`)
      .flush(corpoDeErro(401, 'Token expirado'), { status: 401, statusText: 'Unauthorized' });

    expect(auth.autenticado()).toBe(false);
    expect(TestBed.inject(ArmazenamentoDeSessao).lerToken()).toBeNull();
    expect(navegouPara).toEqual(['/login']);
    expect(recebido!.status).toBe(401);
  });

  it('apenasPropaga_quandoO401VemDoProprioLogin', () => {
    let recebido: ErroDaApi | null = null;
    http.post(`${environment.urlDaApi}/api/auth/login`, {}).subscribe({
      error: (erro: ErroDaApi) => (recebido = erro),
    });

    controlador
      .expectOne(`${environment.urlDaApi}/api/auth/login`)
      .flush(corpoDeErro(401, 'E-mail ou senha invalidos'), {
        status: 401,
        statusText: 'Unauthorized',
      });

    // Sem isso a tela de login navegaria para si mesma e engoliria a mensagem.
    expect(navegouPara).toEqual([]);
    expect(recebido!.mensagem).toBe('E-mail ou senha invalidos');
  });

  it('naoRedireciona_quandoARequisicaoPediuParaIgnorarASessao', () => {
    http
      .get(`${environment.urlDaApi}/api/auth/eu`, { context: semTratamentoDeSessao() })
      .subscribe({ error: () => undefined });

    controlador
      .expectOne(`${environment.urlDaApi}/api/auth/eu`)
      .flush(corpoDeErro(401, 'Token expirado'), { status: 401, statusText: 'Unauthorized' });

    expect(navegouPara).toEqual([]);
  });

  it('preservaAMensagemDeRegraDeNegocio_quandoRespondeu422', () => {
    let recebido: ErroDaApi | null = null;
    http.delete(`${environment.urlDaApi}/api/contas/1`).subscribe({
      error: (erro: ErroDaApi) => (recebido = erro),
    });

    controlador
      .expectOne(`${environment.urlDaApi}/api/contas/1`)
      .flush(corpoDeErro(422, 'Esta conta tem lancamentos e nao pode ser excluida'), {
        status: 422,
        statusText: 'Unprocessable Entity',
      });

    expect(recebido!.mensagem).toBe('Esta conta tem lancamentos e nao pode ser excluida');
    expect(navegouPara).toEqual([]);
  });

  it('preservaOsCamposInvalidos_quandoRespondeu400', () => {
    let recebido: ErroDaApi | null = null;
    http.post(`${environment.urlDaApi}/api/transacoes`, {}).subscribe({
      error: (erro: ErroDaApi) => (recebido = erro),
    });

    controlador
      .expectOne(`${environment.urlDaApi}/api/transacoes`)
      .flush(corpoDeErro(400, 'Falha de validacao', [
        { campo: 'valor', mensagem: 'deve ser maior que zero' },
      ]), { status: 400, statusText: 'Bad Request' });

    expect(recebido!.campos).toEqual([{ campo: 'valor', mensagem: 'deve ser maior que zero' }]);
  });

  it('avisaSobreOServidorIniciando_quandoAConexaoFalha', () => {
    let recebido: ErroDaApi | null = null;
    http.get(`${environment.urlDaApi}/api/visao-geral`).subscribe({
      error: (erro: ErroDaApi) => (recebido = erro),
    });

    controlador
      .expectOne(`${environment.urlDaApi}/api/visao-geral`)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(recebido!.mensagem).toBe(MENSAGEM_DE_INDISPONIBILIDADE);
    expect(navegouPara).toEqual([]);
  });
});
