import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CategoriaService } from './categoria.service';
import { ContaService } from './conta.service';

describe('cadastros de apoio', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listaAsCategoriasDoUsuarioEAsDoSistema', () => {
    const servico = TestBed.inject(CategoriaService);
    let recebidas: unknown[] = [];
    servico.listar().subscribe((categorias) => (recebidas = categorias));

    http
      .expectOne(`${environment.urlDaApi}/api/categorias`)
      .flush([
        { id: 1, nome: 'Salario', tipo: 'RECEITA', corHex: '#2E7D32', padraoDoSistema: true },
        { id: 9, nome: 'Pets', tipo: 'DESPESA', corHex: '#AD1457', padraoDoSistema: false },
      ]);

    expect(recebidas).toHaveLength(2);
  });

  it('listaContasECartoesNaMesmaColecao', () => {
    const servico = TestBed.inject(ContaService);
    let recebidas: { cartaoDeCredito?: boolean }[] = [];
    servico.listar().subscribe((contas) => (recebidas = contas));

    http.expectOne(`${environment.urlDaApi}/api/contas`).flush([
      { id: 1, nome: 'Conta principal', tipo: 'CONTA_CORRENTE', cartaoDeCredito: false },
      { id: 2, nome: 'Cartao principal', tipo: 'CARTAO_CREDITO', cartaoDeCredito: true },
    ]);

    expect(recebidas.filter((conta) => conta.cartaoDeCredito)).toHaveLength(1);
  });

  it('criaUmaCategoriaDoUsuario', () => {
    TestBed.inject(CategoriaService)
      .criar({ nome: 'Pets', tipo: 'DESPESA', corHex: '#AD1457' })
      .subscribe();

    const requisicao = http.expectOne(`${environment.urlDaApi}/api/categorias`);
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ nome: 'Pets', tipo: 'DESPESA', corHex: '#AD1457' });
    requisicao.flush({ id: 9, nome: 'Pets', padraoDoSistema: false });
  });

  it('excluiUmaCategoriaPeloId', () => {
    TestBed.inject(CategoriaService).excluir(9).subscribe();

    const requisicao = http.expectOne(`${environment.urlDaApi}/api/categorias/9`);
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(null);
  });

  it('criaUmaConta', () => {
    TestBed.inject(ContaService).criar({ nome: 'Carteira', tipo: 'CARTEIRA' }).subscribe();

    const requisicao = http.expectOne(`${environment.urlDaApi}/api/contas`);
    expect(requisicao.request.method).toBe('POST');
    requisicao.flush({ id: 3, nome: 'Carteira', tipo: 'CARTEIRA', cartaoDeCredito: false });
  });

  it('excluiUmaContaPeloId', () => {
    TestBed.inject(ContaService).excluir(3).subscribe();

    const requisicao = http.expectOne(`${environment.urlDaApi}/api/contas/3`);
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(null);
  });
});
