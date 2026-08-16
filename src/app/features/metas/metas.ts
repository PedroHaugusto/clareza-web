import { Component } from '@angular/core';
import { Investimentos } from './investimentos/investimentos';
import { MetasFinanceiras } from './metas-financeiras/metas-financeiras';

/**
 * Metas e investimentos na mesma tela: as duas respondem a mesma pergunta — para onde o
 * dinheiro que sobra esta indo — e sao consultadas juntas, nao no meio do dia a dia.
 */
@Component({
  selector: 'app-metas',
  imports: [MetasFinanceiras, Investimentos],
  templateUrl: './metas.html',
})
export class Metas {}
