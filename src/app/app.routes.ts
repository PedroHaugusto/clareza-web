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
        path: 'inicio',
        loadComponent: () => import('./features/inicio/inicio').then((m) => m.Inicio),
      },
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
    ],
  },
  { path: '**', redirectTo: '' },
];
