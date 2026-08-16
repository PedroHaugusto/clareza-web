# Clareza — guia de integração para o frontend

Documento de referência para construir o `clareza-web` (Angular) contra a `clareza-api`.
Descreve o que o backend entrega hoje, os contratos de cada rota e as decisões que o frontend
precisa conhecer para não descobrir na tela.

O backend está **completo**: os 12 blocos do roadmap concluídos, 307 testes automatizados e a
API publicada e verificada em produção.

---

## 1. Ambientes

| Ambiente | URL | Observação |
|---|---|---|
| Produção | `https://clareza-api.onrender.com` | Render, plano gratuito |
| Local | `http://localhost:8080` | `docker compose up` na raiz do `clareza-api` |
| Documentação | `/swagger-ui.html` | Swagger navegável, com botão **Authorize** |
| Schema OpenAPI | `/v3/api-docs` | JSON para gerar tipos TypeScript |

**O CORS já libera `http://localhost:4200`.** Ao publicar o frontend, a origem de produção
precisa ser adicionada na variável `CORS_ALLOWED_ORIGINS` no painel do Render (aceita lista
separada por vírgula). Sem isso o navegador bloqueia as chamadas, mesmo com a API no ar.

> **Cold start:** no plano gratuito, API e banco hibernam após inatividade. A primeira
> requisição depois de um tempo parado pode levar **até um minuto**. Não é erro — mas a primeira
> tela precisa de um estado de carregamento honesto, ou vai parecer travada.

---

## 2. Autenticação

A API emite **JWT próprio**. Não há refresh token.

| Característica | Valor |
|---|---|
| Cabeçalho | `Authorization: Bearer <token>` |
| Validade | 60 minutos (`JWT_EXPIRATION_MINUTES`) |
| Renovação | não existe — token expirado exige novo login |
| Onde guardar | decisão do frontend; a API não usa cookie |

O token traz `sub` (id do usuário), `nome` e `email` nos claims, mas **não decodifique o token
para exibir dados**: use `GET /api/auth/eu`, que devolve o dado verificado pelo servidor e falha
corretamente quando o token expirou.

### Rotas públicas

Apenas estas quatro dispensam token. Todo o resto responde **401**:

```
POST /api/auth/registrar
POST /api/auth/login
POST /api/auth/google
GET  /actuator/health
```

### Registro

```http
POST /api/auth/registrar
Content-Type: application/json

{ "nome": "Ana", "email": "ana@clareza.dev", "senha": "senha-secreta" }
```

```json
201 Created
{
  "id": 1,
  "nome": "Ana",
  "email": "ana@clareza.dev",
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tipo": "Bearer",
  "expiraEm": "2026-08-16T06:18:03.561Z"
}
```

O registro **já devolve o token** — não precisa chamar `/login` em seguida. A conta nasce com
duas contas semeadas ("Conta principal" e "Cartão principal") e enxergando as 7 categorias
padrão do sistema.

Senha entre **8 e 72 caracteres**. O teto não é arbitrário: o BCrypt trunca em 72 bytes, e
aceitar mais criaria a ilusão de uma senha mais forte do que a armazenada.

### Login

```http
POST /api/auth/login
{ "email": "ana@clareza.dev", "senha": "senha-secreta" }
```

Mesma resposta do registro, com **200**. O e-mail é normalizado no servidor: `ANA@Clareza.dev`
e `ana@clareza.dev` são a mesma conta.

Falha responde **401** com a mensagem `"E-mail ou senha invalidos"` — a mesma para e-mail
inexistente, senha errada e conta que só tem Google. É intencional: mensagens diferentes
transformariam a rota em um oráculo de quais e-mails têm conta. **Não tente distinguir os casos
na interface.**

### Login com Google

O frontend obtém o `id_token` pelo Google Identity Services e o envia para a API, que valida
assinatura, emissor, audiência e `email_verified` contra as chaves públicas do Google:

```http
POST /api/auth/google
{ "idToken": "<id_token do Google>" }
```

Devolve o mesmo formato de resposta. Primeiro acesso cria a conta sem senha; se o e-mail já
tiver cadastro, a conta recebe o vínculo e passa a aceitar os dois caminhos de login.

> Hoje `GOOGLE_CLIENT_ID` está **vazio** em produção: a rota responde 401 explicando que o login
> social não está configurado. Para habilitar, defina a variável no Render com o mesmo client ID
> usado no frontend.

### Usuário logado

```http
GET /api/auth/eu
Authorization: Bearer <token>
```

```json
{ "id": 1, "nome": "Ana", "email": "ana@clareza.dev",
  "possuiSenha": true, "vinculadoAoGoogle": false }
```

Chame no bootstrap da aplicação, quando existir token guardado. `possuiSenha` e
`vinculadoAoGoogle` dizem à tela de conta o que faz sentido oferecer.

---

## 3. Convenções que valem para toda a API

### Datas e valores

| Tipo | Formato | Exemplo |
|---|---|---|
| Data (sem hora) | `yyyy-MM-dd` | `"2026-09-05"` |
| Instante | ISO-8601 UTC | `"2026-08-16T05:18:03.561Z"` |
| Dinheiro e percentual | número JSON, 2 casas | `1200.00`, `11.27` |

**"Hoje" é o dia em `America/Sao_Paulo`**, não o do servidor nem o do navegador. É o que define
se uma conta está atrasada, qual é o mês do calendário e a janela de vencimentos. Se o usuário
estiver em outro fuso, a referência continua sendo esta — não recalcule datas no cliente
esperando bater com a API.

### Campos nulos são omitidos

A serialização usa `non_null`: campo sem valor **não aparece** no JSON, em vez de vir `null`.
Uma transação prevista não traz `dataEfetivacao`; uma meta sem prazo não traz `prazo` nem
`diasAtePrazo`. Nos tipos TypeScript, marque esses campos como opcionais.

A única exceção é `GET /api/meta-aporte`, que sempre devolve `valor` (podendo ser `null`) junto
de `definida`.

### Isolamento por usuário

Toda consulta é escopada pelo token. Recurso de outro usuário responde **404**, nunca 403 — um
403 confirmaria que aquele id existe. Trate 404 como "não encontrado" e siga.

### Formato de erro

Todas as falhas usam o mesmo corpo:

```json
{
  "timestamp": "2026-08-16T05:16:56.791Z",
  "status": 400,
  "erro": "Bad Request",
  "mensagem": "Falha de validacao",
  "path": "/api/transacoes",
  "campos": [ { "campo": "valor", "mensagem": "deve ser maior que zero" } ]
}
```

`campos` só aparece em erro de validação — use para destacar o campo no formulário.

| Código | Quando | Como tratar na interface |
|---|---|---|
| **400** | corpo inválido, tipo errado, validação | destacar campos usando `campos[]` |
| **401** | sem token, token inválido/expirado, credencial errada | redirecionar para login |
| **404** | recurso inexistente ou de outro usuário | mensagem neutra de não encontrado |
| **405** | método HTTP errado | erro de programação, não deve chegar ao usuário |
| **422** | regra de negócio violada | **exibir `mensagem` direto** — é texto escrito para o usuário |
| **500** | falha inesperada | mensagem genérica; o detalhe fica no log do servidor |

O **422 é o mais importante para a experiência**: são as regras do domínio, e a `mensagem` já
vem redigida para ser lida ("Esta conta tem lancamentos e nao pode ser excluida", "Categoria
padrao do sistema nao pode ser excluida", "Ja existe uma conta com este e-mail").

---

## 4. Referência de endpoints

### Categorias — `/api/categorias`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/categorias` | as do usuário **mais** as 7 padrão do sistema |
| POST | `/api/categorias` | cria categoria do usuário |
| DELETE | `/api/categorias/{id}` | exclui |

```json
{ "id": 3, "nome": "Alimentação", "tipo": "DESPESA",
  "corHex": "#EF6C00", "padraoDoSistema": true }
```

`padraoDoSistema: true` indica categoria global — **não ofereça o botão de excluir**, a API
responde 422. A cor é normalizada para maiúsculas (`#ad1457` vira `#AD1457`). Nome duplicado,
comparando sem diferenciar maiúsculas e considerando também as globais, responde 422.

Corpo de criação: `{ "nome", "tipo", "corHex" }` — `corHex` no formato `#RRGGBB`.

### Contas e cartões — `/api/contas`

| Método | Rota |
|---|---|
| GET | `/api/contas` |
| POST | `/api/contas` |
| DELETE | `/api/contas/{id}` |

```json
{ "id": 1, "nome": "Conta principal", "tipo": "CONTA_CORRENTE", "cartaoDeCredito": false }
```

Contas e cartões são a **mesma entidade**, diferenciados por `tipo`. Use `cartaoDeCredito` para
decidir o ícone ou o rótulo, em vez de comparar a string do enum.

Excluir conta com lançamentos responde **422**.

### Lançamentos — `/api/transacoes`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/transacoes` | listagem com filtros combináveis |
| POST | `/api/transacoes` | cria lançamento |
| POST | `/api/transacoes/parcelada` | cria N parcelas, devolve **array** |
| PUT | `/api/transacoes/{id}` | edita |
| PATCH | `/api/transacoes/{id}/confirmar` | marca como pago/recebido |
| DELETE | `/api/transacoes/{id}` | exclui |

```json
{
  "id": 5, "contaId": 6, "categoriaId": 1,
  "descricao": "Salário de verificação",
  "valor": 5000.00, "tipo": "RECEITA",
  "dataPrevista": "2026-09-05",
  "status": "PREVISTA",
  "grupoParcelamentoId": null, "numeroParcela": null, "totalParcelas": null
}
```

**`valor` é sempre positivo** — o sinal vem de `tipo`. Não envie negativo: responde 400.

**`status` é derivado na leitura.** A API grava apenas `PREVISTA` e `CONFIRMADA`; `ATRASADA` é
calculado comparando `dataPrevista` com hoje. Ou seja, o mesmo registro muda de status sozinho
quando a data passa — não guarde esse valor em cache achando que é estável.

Informar `dataEfetivacao` na criação já nasce `CONFIRMADA`, evitando duas chamadas para lançar
algo já pago. Confirmar duas vezes responde **422**.

#### Filtros (todos opcionais e combináveis)

| Parâmetro | Valores |
|---|---|
| `tipo` | `RECEITA`, `DESPESA` |
| `periodo` | `TODOS`, `MES_ATUAL`, `PROXIMOS_30_DIAS`, `PROXIMOS_90_DIAS` |
| `categoriaId` | id |
| `contaId` | id |
| `busca` | texto livre na descrição, ignora maiúsculas |

```
GET /api/transacoes?tipo=DESPESA&periodo=PROXIMOS_30_DIAS&busca=luz
```

#### Parcelamento

```http
POST /api/transacoes/parcelada
{ "contaId": 1, "categoriaId": 2, "descricao": "Curso",
  "valorTotal": 100.00, "tipo": "DESPESA",
  "dataDaPrimeiraParcela": "2026-09-01", "totalParcelas": 3 }
```

Devolve **array** com as parcelas criadas (`33.33`, `33.33`, `33.34` — a diferença de centavos
fica na última, e a soma fecha o total exato). Cada uma é um lançamento comum, com
`grupoParcelamentoId` compartilhado e `numeroParcela` de 1 a N; aparecem na listagem e podem ser
confirmadas individualmente. Mínimo de 2 parcelas.

### Recorrências — `/api/transacoes-recorrentes`

| Método | Rota |
|---|---|
| GET | `/api/transacoes-recorrentes` |
| POST | `/api/transacoes-recorrentes` |
| DELETE | `/api/transacoes-recorrentes/{id}` (desativa) |

```http
POST /api/transacoes-recorrentes
{ "contaId": 1, "categoriaId": 2, "descricao": "Aluguel", "valor": 1200.00,
  "tipo": "DESPESA", "periodicidade": "MENSAL", "diaDoMes": 10,
  "dataInicio": "2026-09-01", "dataFim": null }
```

`MENSAL` e `ANUAL` exigem `diaDoMes` (1–31); `SEMANAL` exige `diaDaSemana` (1 = segunda,
7 = domingo). Mandar os dois, ou nenhum, responde 422.

**Criar uma recorrência materializa as ocorrências como lançamentos reais**, até 12 meses à
frente. Depois do POST, a listagem de transações terá ~12 itens novos. O dia 31 encolhe nos
meses curtos e volta ao original no mês seguinte.

`DELETE` desativa a regra e **apaga as ocorrências futuras ainda previstas**, preservando as já
confirmadas. Avise o usuário disso na confirmação da tela.

### Calendário e vencimentos

```
GET /api/calendario?mes=8&ano=2026    (ambos opcionais; padrão é o mês corrente)
GET /api/vencimentos
```

O calendário agrupa por dia, já com os totais calculados:

```json
{ "mes": 8, "ano": 2026,
  "totalReceitas": 5000.00, "totalDespesas": 1289.90, "saldoDoMes": 3710.10,
  "dias": [
    { "data": "2026-08-10", "totalReceitas": 0.00, "totalDespesas": 1289.90,
      "saldoDoDia": -1289.90, "transacoes": [ ... ] }
  ] }
```

Só dias **com lançamento** aparecem — o front desenha a grade do mês e consulta por data.

`/api/vencimentos` traz os próximos 14 dias **e também o que já venceu** e segue previsto,
ordenado do mais urgente. Confirmados não aparecem.

### Visão geral e saldo

```
GET /api/visao-geral
GET /api/saldo-disponivel
```

```json
{
  "saldoDisponivel": 3710.10,
  "saldoRealizado": 3800.00,
  "mesAtual": {
    "mes": 8, "ano": 2026,
    "receitasRealizadas": 5000.00, "receitasPrevistas": 0.00,
    "despesasRealizadas": 1200.00, "despesasPrevistas": 89.90,
    "totalReceitas": 5000.00, "totalDespesas": 1289.90, "saldoDoMes": 3710.10
  },
  "proximosMeses": [ { "mes": 9, "ano": 2026, ... } ]
}
```

São **dois saldos diferentes**, e a distinção é o coração do produto:

- **`saldoDisponivel`** — tudo até o fim do mês atual, **inclusive o que ainda não saiu**. Responde "quanto sobra depois de pagar tudo deste mês".
- **`saldoRealizado`** — só o confirmado. Responde "quanto tenho agora".

Lançamentos de meses seguintes **não** afetam nenhum dos dois; aparecem em `proximosMeses`
(sempre 3 meses, mesmo sem movimento).

### Previsão e cenários

```
GET /api/previsao?meses=6&cenario=PROVAVEL&ajusteReceita=&ajusteDespesa=
```

`meses` aceita **apenas 6 ou 12** (outro valor responde 422). `cenario` é `PROVAVEL` (padrão),
`OTIMISTA` ou `PESSIMISTA`.

```json
{ "cenario": "OTIMISTA",
  "percentualAjusteReceita": 10, "percentualAjusteDespesa": 10,
  "meses": [
    { "mes": 9, "ano": 2026, "saldoInicial": 1000.00,
      "totalReceitasPrevistas": 5500.00, "totalDespesasPrevistas": 1800.00,
      "saldoProjetado": 4700.00, "transacoes": [ ... ] }
  ] }
```

A projeção começa no **mês seguinte** e encadeia: o `saldoProjetado` de um mês é o
`saldoInicial` do próximo. O `saldoInicial` do primeiro vem do `saldoDisponivel`.

Os totais vêm ajustados pelo cenário, mas **as transações dentro de cada mês mantêm o valor
registrado** — o ajuste é agregado. Use `percentualAjusteReceita`/`Despesa` do cabeçalho para
explicar a diferença na tela.

`ajusteReceita` e `ajusteDespesa` na query sobrescrevem a preferência salva **sem persistir** —
é o modo de pré-visualização, ideal para um slider.

```
GET /api/preferencia-cenario
PUT /api/preferencia-cenario   { "percentualAjusteReceita": 20, "percentualAjusteDespesa": 5 }
```

Usuário que nunca configurou recebe `10` e `10` sem que nada tenha sido gravado.

### Fluxo de caixa

```
GET /api/fluxo-caixa?mesesPassados=6&mesesFuturos=6
```

```json
{ "saldoAnterior": 0,
  "meses": [
    { "mes": 7, "ano": 2026, "entradas": 5000.00, "saidas": 4200.00,
      "saldoDoMes": 800.00, "saldoAcumulado": 800.00 }
  ] }
```

Série contínua para gráfico de linha: passado realizado e futuro previsto no mesmo eixo, com
meses sem movimento aparecendo zerados. `saldoAnterior` é o que existia antes da janela — some-o
mentalmente ao início da curva, senão o gráfico começa do zero como se não houvesse passado.
Cada lado aceita até 24 meses.

### Investimentos e meta de aporte

| Método | Rota |
|---|---|
| GET / POST | `/api/investimentos` |
| PUT / DELETE | `/api/investimentos/{id}` |
| GET / PUT / DELETE | `/api/meta-aporte` |

A listagem devolve a carteira consolidada:

```json
{ "totalInvestido": 51000.00, "rentabilidadeMediaPonderada": 11.27, "quantidade": 2,
  "investimentos": [ { "id": 1, "nome": "CDB Banco X", "tipo": "RENDA_FIXA",
                       "valorInvestido": 50000.00, "rentabilidadeInformada": 11.00 } ] }
```

Dado **declarativo**: não há cotação de mercado, o usuário informa valor e rentabilidade. A
rentabilidade aceita negativo e a média é ponderada pelo valor investido.

A meta de aporte é um único valor por usuário:

```json
GET /api/meta-aporte  →  { "valor": null, "definida": false }
```

### Metas financeiras — `/api/metas`

| Método | Rota |
|---|---|
| GET / POST | `/api/metas` |
| PUT / DELETE | `/api/metas/{id}` |

```json
{ "id": 1, "nome": "Viagem", "valorAtual": 2500.00, "valorObjetivo": 10000.00,
  "percentualConcluido": 25.00, "valorRestante": 7500.00, "concluida": false,
  "prazo": "2026-12-31", "diasAtePrazo": 137, "prazoVencido": false,
  "descricao": "Japão" }
```

Todos os derivados vêm calculados. Meta superada mostra percentual **acima de 100** com
`valorRestante: 0.00` — uma barra de progresso precisa tratar isso para não estourar o layout.
`prazoVencido` já considera a conclusão: meta atingida não aparece vencida mesmo com prazo
passado. Sem prazo, os três campos de data são omitidos.

Atualizar o progresso é um `PUT` com o novo `valorAtual` — não há endpoint de aporte incremental.

---

## 5. Enums

```ts
type TipoTransacao   = 'RECEITA' | 'DESPESA';
type StatusTransacao = 'PREVISTA' | 'CONFIRMADA' | 'ATRASADA';  // ATRASADA só na leitura
type TipoCategoria   = 'RECEITA' | 'DESPESA' | 'AMBOS';
type TipoConta       = 'CONTA_CORRENTE' | 'CONTA_POUPANCA' | 'CARTAO_CREDITO' | 'CARTEIRA';
type Periodicidade   = 'SEMANAL' | 'MENSAL' | 'ANUAL';
type TipoInvestimento = 'RENDA_FIXA' | 'ACOES' | 'FIIS' | 'CRIPTO' | 'TESOURO';
type Cenario         = 'PROVAVEL' | 'OTIMISTA' | 'PESSIMISTA';
type PeriodoDeBusca  = 'TODOS' | 'MES_ATUAL' | 'PROXIMOS_30_DIAS' | 'PROXIMOS_90_DIAS';
```

Valor de enum inválido responde **400**, não 500.

---

## 6. O que construir no Angular

### Gerar os tipos em vez de escrever à mão

O schema OpenAPI está publicado. Vale gerar os modelos:

```bash
npx openapi-typescript https://clareza-api.onrender.com/v3/api-docs -o src/app/api/tipos.ts
```

Assim os 26 contratos ficam tipados e uma renomeação no backend vira erro de compilação, não bug
em produção.

### Peças mínimas

| Peça | Responsabilidade |
|---|---|
| `AuthService` | login, registro, guardar token, expor usuário atual |
| Interceptor de token | injetar `Authorization: Bearer` em toda chamada |
| Interceptor de erro | 401 → logout e redirect; 422 → exibir `mensagem`; 400 → mapear `campos[]` |
| `AuthGuard` | proteger rotas internas |
| Serviços por recurso | um por área: transações, categorias, contas, metas… |

O interceptor de erro é o que mais economiza código: com o formato de erro sendo único em toda a
API, um único ponto trata validação, regra de negócio e sessão expirada.

### Bootstrap da aplicação

Havendo token guardado, chame `GET /api/auth/eu` antes de renderizar as rotas protegidas. Se
responder 401, o token expirou — limpe e mande para o login. Isso evita a tela piscar com dados
de uma sessão morta.

### Ordem sugerida de telas

1. **Login e registro** — desbloqueia todo o resto
2. **Visão geral** — `/api/visao-geral` em uma chamada só, valida o fluxo ponta a ponta
3. **Lançamentos** — listagem com filtros, criar, editar, confirmar; é a tela mais usada
4. **Categorias e contas** — cadastros de apoio
5. **Calendário e vencimentos**
6. **Previsão e fluxo de caixa** — as telas de gráfico
7. **Metas e investimentos**

---

## 7. Armadilhas conhecidas

**Cold start de até um minuto.** API e banco hibernam no plano gratuito. Prepare estado de
carregamento e evite timeout curto no HttpClient na primeira chamada.

**Token expira em 60 minutos e não há refresh.** O usuário será deslogado durante o uso. O
tratamento de 401 no interceptor não é detalhe — é o que separa "deslogou" de "a tela quebrou".

**`ATRASADA` muda sozinha.** É derivada da data a cada leitura. Uma lista em cache pode exibir
status desatualizado depois da virada do dia.

**Campos ausentes, não nulos.** Tipos com `?` e verificação antes de formatar.

**"Hoje" é `America/Sao_Paulo`.** Datas calculadas no navegador podem divergir da API perto da
meia-noite — quando a diferença importar, prefira o que a API devolveu.

**CORS por origem exata.** `http://localhost:4200` está liberado; qualquer outra porta ou a URL
de produção precisa ser adicionada na variável do Render.

**Números em ponto flutuante.** Os valores chegam como `number`. Para somar dinheiro no cliente,
cuidado com a aritmética do JavaScript — a boa notícia é que quase todo total já vem calculado
pela API (saldos, totais do mês, percentuais, acumulados).

---

## 8. Como o backend foi construído

Contexto útil se você precisar alterar a API durante o desenvolvimento do frontend.

**Stack:** Java 8, Spring Boot 2.7.18, PostgreSQL 16 com Flyway, arquitetura hexagonal.
As versões são deliberadas — Java 8 define a linha do Spring Boot, que define a do Flyway, que
limita o PostgreSQL a 16.

**Camadas:** `domain` (regras puras, sem Spring nem JPA) → `application` (casos de uso e portas)
→ `infrastructure` (controllers, JPA, segurança). Controller nunca toca repositório direto.

**Banco:** 8 migrations Flyway. O schema replica as invariantes do domínio em `CHECK` —
por exemplo, a coluna `status` de transação **só aceita** `PREVISTA` e `CONFIRMADA`, tornando
impossível gravar `ATRASADA`.

**Testes:** 307, sendo os de integração contra PostgreSQL real via Testcontainers. Nenhum
depende do relógio da máquina: usam o mesmo `Clock` da aplicação.

**CI/CD:** GitHub Actions roda build e testes a cada push; passando na `main`, dispara o deploy
no Render. Banco no Neon.

**Decisões que moldaram a API:**

- `ATRASADA` derivado na leitura, nunca persistido
- Ocorrências recorrentes materializadas em 12 meses, para serem lançamentos comuns
- Recusa de login sempre com a mesma mensagem
- 422 reservado para regra de negócio, separado do 400 de validação
- Recurso de outro usuário responde 404, não 403
