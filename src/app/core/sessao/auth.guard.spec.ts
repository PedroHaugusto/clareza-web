import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { environment } from '../../../environments/environment';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { convidadoGuard } from './convidado.guard';

describe('guards de sessao', () => {
  let auth: AuthService;
  let router: Router;
  let http: HttpTestingController;

  const rota = {} as ActivatedRouteSnapshot;
  const estadoEm = (url: string) => ({ url }) as RouterStateSnapshot;

  const autenticar = () => {
    auth.entrar({ email: 'ana@clareza.dev', senha: 'senha-secreta' }).subscribe();
    http
      .expectOne(`${environment.urlDaApi}/api/auth/login`)
      .flush({ id: 1, nome: 'Ana', email: 'ana@clareza.dev', token: 'token-emitido' });
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  describe('authGuard', () => {
    it('liberaARota_quandoOUsuarioEstaAutenticado', () => {
      autenticar();

      const permitido = TestBed.runInInjectionContext(() =>
        authGuard(rota, estadoEm('/lancamentos')),
      );

      expect(permitido).toBe(true);
    });

    it('mandaParaOLoginGuardandoAUrlPretendida_quandoNaoHaSessao', () => {
      const resultado = TestBed.runInInjectionContext(() =>
        authGuard(rota, estadoEm('/lancamentos')),
      ) as UrlTree;

      expect(resultado).toBeInstanceOf(UrlTree);
      expect(router.serializeUrl(resultado)).toBe('/login?returnUrl=%2Flancamentos');
    });
  });

  describe('convidadoGuard', () => {
    it('liberaOLogin_quandoNaoHaSessao', () => {
      const permitido = TestBed.runInInjectionContext(() => convidadoGuard(rota, estadoEm('/login')));

      expect(permitido).toBe(true);
    });

    it('mandaParaOInicio_quandoOUsuarioJaEstaAutenticado', () => {
      autenticar();

      const resultado = TestBed.runInInjectionContext(() =>
        convidadoGuard(rota, estadoEm('/login')),
      ) as UrlTree;

      expect(resultado).toBeInstanceOf(UrlTree);
      expect(router.serializeUrl(resultado)).toBe('/');
    });
  });
});
