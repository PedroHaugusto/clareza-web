import { Injectable } from '@angular/core';

const CHAVE_DO_TOKEN = 'clareza.token';

/**
 * Unico ponto que fala com o `localStorage`.
 *
 * Isolar aqui permite trocar por `sessionStorage` depois sem tocar em mais nada, e concentra
 * o `try/catch`: em modo privativo ou com cookies bloqueados o proprio acesso ao
 * `localStorage` lanca, e uma sessao nao persistida e melhor do que um app que nao sobe.
 */
@Injectable({ providedIn: 'root' })
export class ArmazenamentoDeSessao {
  guardarToken(token: string): void {
    try {
      localStorage.setItem(CHAVE_DO_TOKEN, token);
    } catch {
      // Sessao vale so enquanto a aba viver. Nao ha o que fazer alem de seguir.
    }
  }

  lerToken(): string | null {
    try {
      return localStorage.getItem(CHAVE_DO_TOKEN);
    } catch {
      return null;
    }
  }

  limpar(): void {
    try {
      localStorage.removeItem(CHAVE_DO_TOKEN);
    } catch {
      // Idem: nao ha token acessivel para remover.
    }
  }
}
