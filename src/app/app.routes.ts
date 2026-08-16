import { Routes } from '@angular/router';
import { authGuard } from './core/sessao/auth.guard';
import { convidadoGuard } from './core/sessao/convidado.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [convidadoGuard],
    loadComponent: () => import('./features/autenticacao/login/login').then((m) => m.Login),
  },
  {
    path: 'registrar',
    canActivate: [convidadoGuard],
    loadComponent: () => import('./features/autenticacao/registro/registro').then((m) => m.Registro),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/area-logada/area-logada').then((m) => m.AreaLogada),
    children: [
      {
        path: 'visao-geral',
        loadComponent: () =>
          import('./features/visao-geral/visao-geral').then((m) => m.VisaoGeral),
      },
      {
        path: 'lancamentos',
        loadComponent: () =>
          import('./features/lancamentos/lancamentos').then((m) => m.Lancamentos),
      },
      {
        path: 'calendario',
        loadComponent: () => import('./features/calendario/calendario').then((m) => m.Calendario),
      },
      {
        path: 'previsao',
        loadComponent: () =>
          import('./features/projecoes/previsao/previsao').then((m) => m.Previsao),
      },
      {
        path: 'fluxo-de-caixa',
        loadComponent: () =>
          import('./features/projecoes/fluxo-de-caixa/fluxo-de-caixa').then((m) => m.FluxoDeCaixa),
      },
      {
        path: 'cadastros',
        loadComponent: () => import('./features/cadastros/cadastros').then((m) => m.Cadastros),
      },
      { path: '', pathMatch: 'full', redirectTo: 'visao-geral' },
    ],
  },
  { path: '**', redirectTo: '' },
];
