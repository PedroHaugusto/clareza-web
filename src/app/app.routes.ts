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
      { path: '', pathMatch: 'full', redirectTo: 'visao-geral' },
    ],
  },
  { path: '**', redirectTo: '' },
];
