import { Component } from '@angular/core';
import { Categorias } from './categorias/categorias';
import { Contas } from './contas/contas';

/**
 * Os dois cadastros de apoio vivem na mesma tela: sao listas curtas, mexidas com pouca
 * frequencia e quase sempre na mesma sentada — separar em duas rotas so somaria cliques.
 */
@Component({
  selector: 'app-cadastros',
  imports: [Categorias, Contas],
  templateUrl: './cadastros.html',
})
export class Cadastros {}
