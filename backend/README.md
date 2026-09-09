# Backend — Sistema de Gestão de Eventos e Inscrições Acadêmicas (Faculdade Multivix)

Backend real em **Flask + SQLite** (sem ORM — `sqlite3` puro da biblioteca
padrão) que implementa autenticação, cadastro, eventos, inscrições,
check-in presencial e emissão de certificado em PDF.

## Como rodar

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

O servidor sobe em `http://localhost:5000`. Na primeira execução ele cria
`instance/eventos.db` e o popula com os mesmos dados de demonstração do
protótipo front-end (contas abaixo).

| Perfil        | Login                          | Senha    |
|---------------|---------------------------------|----------|
| Administrador | carla.menezes@multivix.edu.br / ADM-045       | admin123 |
| Estudante     | ana.costa@multivix.edu.br / 2023104032        | 1234     |
| Estudante     | bruno.silva@multivix.edu.br / 2022108871       | 1234     |

Para apagar tudo e recomeçar do zero, basta deletar `instance/eventos.db`.

## Ligando ao front-end vanilla

O front-end atual (`js/data.js`) roda com dados em memória. Para integrá-lo
a este backend, troque as funções de `data.js` por chamadas `fetch()`
usando **`credentials: "include"`** (necessário para o cookie de sessão
funcionar entre origens diferentes), por exemplo:

```js
const API = "http://localhost:5000/api";

async function autenticar(tipo, identificacao, senha) {
  const resp = await fetch(`${API}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, identificacao, senha }),
  });
  if (!resp.ok) return null;
  const { usuario } = await resp.json();
  return usuario;
}

// Ao carregar a página, tenta restaurar a sessão (login persistido):
async function restaurarSessao() {
  const resp = await fetch(`${API}/auth/me`, { credentials: "include" });
  if (!resp.ok) return null;
  return (await resp.json()).usuario;
}
```

O CORS em `app.py` libera automaticamente qualquer porta em
`http://localhost:` ou `http://127.0.0.1:` — então funciona com Live Server
em qualquer porta, sem precisar editar nada.

## Modelo de dados (SQLite)

Ver `schema.sql` para o DDL completo. Tabelas: `usuarios`, `eventos`,
`inscricoes`, `checkins`, `certificados`, `reset_tokens`.

## Regras de negócio implementadas

- **Cadastro de perfil**: qualquer pessoa pode criar um perfil de
  `estudante` ou `administrador`. E-mail e identificador são únicos. A
  senha nunca é armazenada em texto puro — só o hash (`werkzeug.security`).
- **Login persistido sem guardar senha**: o login usa sessão nativa do
  Flask (cookie assinado). Só `usuario_id` fica na sessão. O front-end
  chama `GET /api/auth/me` ao carregar a página para saber se o cookie
  ainda é válido e continuar logado após um F5 — sem nunca reenviar ou
  reter a senha em lugar nenhum.
- **Uma inscrição ativa por aluno por evento**: garantida em dois níveis —
  checagem na aplicação e um índice único parcial no banco
  (`idx_inscricao_unica_ativa`, ignora inscrições canceladas).
- **Vagas**: inscrição é bloqueada se `vagas_ocupadas >= vagas`; ao
  cancelar uma inscrição confirmada, a vaga é liberada de volta.
- **Check-in do evento** (ver comentário completo em
  `routes/inscricoes.py`): cada evento tem um `codigo_checkin` de 6
  caracteres. No dia do evento, o administrador libera o check-in (manual,
  via toggle, ou automaticamente quando a data do evento é hoje) e
  divulga/projeta o código aos participantes. O aluno digita o código no
  app; o backend confere inscrição confirmada + check-in ainda não feito +
  liberação + código correto, e grava o check-in (uma vez só por
  inscrição). O admin também pode registrar presença manualmente.
- **Certificado só após check-in**: `POST /api/inscricoes/<id>/certificado`
  só emite se existir check-in para aquela inscrição. O PDF é gerado sob
  demanda (não fica salvo em disco) a partir dos dados gravados, contendo
  nome da Faculdade Multivix, nome do aluno, evento, data, carga horária,
  "assinatura" (nome/cargo do administrador que criou o evento, em fonte
  itálica) e um selo/carimbo institucional. Cada certificado tem um código
  de verificação (hash) que pode ser conferido publicamente.

## Rotas da API

Todas as rotas (exceto login/registro/verificação pública) exigem sessão
autenticada (cookie). Respostas de erro seguem `{"erro": "..."}`.

### Autenticação (`/api/auth`)
| Método | Rota | Quem | Descrição |
|---|---|---|---|
| POST | `/registrar` | público | Cria novo perfil (estudante/administrador) e já loga |
| POST | `/login` | público | `{tipo, identificacao, senha}` |
| POST | `/logout` | logado | Encerra a sessão |
| GET  | `/me` | logado | Retorna o usuário da sessão atual |
| POST | `/esqueci-senha` | público | Gera token de redefinição (retornado na resposta, simula envio por e-mail) |
| POST | `/redefinir-senha` | público | `{token, nova_senha}` |

### Perfil (`/api/perfil`)
| Método | Rota | Quem |
|---|---|---|
| GET | `` | logado |
| PUT | `` | logado — atualiza telefone/e-mail |

### Eventos (`/api/eventos`)
| Método | Rota | Quem | Descrição |
|---|---|---|---|
| GET | `` | logado | Lista (filtros `categoria`, `status`, `busca`) |
| GET | `/<id>` | logado | Detalhe |
| POST | `` | admin | Cria evento |
| PUT | `/<id>` | admin | Edita evento |
| DELETE | `/<id>` | admin | Exclui evento (cascata: inscrições/checkins/certificados) |
| GET | `/<id>/codigo-checkin` | admin | Código atual + se está liberado |
| POST | `/<id>/regenerar-codigo-checkin` | admin | Gera novo código |
| POST | `/<id>/alternar-checkin` | admin | Liga/desliga liberação do check-in |

### Inscrições e check-in (`/api`)
| Método | Rota | Quem |
|---|---|---|
| POST | `/eventos/<id>/inscrever` | estudante |
| GET | `/inscricoes/minhas` | estudante |
| GET | `/inscricoes` | admin — filtros `evento_id`, `status` |
| DELETE | `/inscricoes/<id>` | dono ou admin — cancela |
| POST | `/eventos/<id>/checkin` | estudante — `{codigo}` |
| POST | `/inscricoes/<id>/checkin-manual` | admin |
| GET | `/inscricoes/<id>/checkin` | dono ou admin — status |

### Certificados (`/api`)
| Método | Rota | Quem |
|---|---|---|
| POST | `/inscricoes/<id>/certificado` | estudante (dono) — emite/retorna |
| GET | `/certificados/meus` | estudante |
| GET | `/certificados` | admin — filtro `q` (nome/matrícula) |
| GET | `/certificados/<codigo>/pdf` | dono ou admin — baixa o PDF |
| GET | `/certificados/verificar/<codigo>` | público — checa autenticidade |

## Limitações conscientes (protótipo acadêmico)

- CORS liberado por lista fixa de origens em `app.py` — ajuste para o seu
  ambiente/produção.
- "Esqueci minha senha" devolve o token diretamente na resposta em vez de
  enviar e-mail de verdade (não há servidor de e-mail configurado).
- O PDF é gerado em memória a cada download — não fica salvo em disco.
