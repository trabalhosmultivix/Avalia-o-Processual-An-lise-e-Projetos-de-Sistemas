# Sistema de Gestão de Eventos e Inscrições Acadêmicas — Faculdade Multivix

Projeto completo: front-end (HTML/CSS/JS puro) já ligado ao backend real
(Flask + SQLite). São **dois servidores rodando ao mesmo tempo**: o backend
(API) e o front-end (as telas). Sem os dois juntos, não funciona.

```
projeto/
  backend/    → API Flask + banco SQLite (porta 5000)
  frontend/   → telas HTML/CSS/JS (porta 5500, via Live Server)
```

## Passo a passo (VS Code)

### 1. Suba o backend

No terminal do VS Code:

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Deixe esse terminal aberto — ele mostra `Running on http://127.0.0.1:5000`.
Na primeira execução ele já cria e popula o banco (`backend/instance/eventos.db`)
com dados de demonstração.

### 2. Suba o front-end

Instale a extensão **Live Server** no VS Code (se ainda não tiver). Depois:
clique com o botão direito em `frontend/index.html` → **"Open with Live
Server"**.

Isso abre o navegador em algo como `http://127.0.0.1:5500/index.html` —
essa é a tela do sistema.

### 3. Teste

Contas já cadastradas:

| Perfil        | Login                                    | Senha    |
|---------------|-------------------------------------------|----------|
| Administrador | `carla.menezes@multivix.edu.br` ou `ADM-045` | admin123 |
| Estudante     | `ana.costa@multivix.edu.br` ou `2023104032`  | 1234     |

Ou clique em **"Ainda não tem conta? Criar cadastro"** na tela de login para
criar um perfil novo.

Fluxo sugerido para testar tudo de ponta a ponta:
1. Entre como **Administrador** → "Eventos" → clique no ícone 🔑 de um
   evento → "Abrir check-in agora" → copie o código mostrado.
2. Saia e entre como **Estudante** → "Eventos" → inscreva-se em um evento
   (ou use um em que já esteja inscrito) → "Minhas Inscrições" → "Fazer
   check-in" → cole o código.
3. Depois do check-in, clique em "Emitir certificado" e depois em "Baixar
   certificado (PDF)" — o PDF é gerado na hora pelo backend e baixa de
   verdade.

## Se algo não funcionar

- **Erro de CORS / "Failed to fetch" no console do navegador**: confirme
  que o backend está rodando (passo 1) e que você abriu o front-end via
  Live Server (não só dando duplo clique no `index.html` — precisa ser
  servido por http://, não `file://`).
- **Login não persiste depois de F5**: confirme que o backend está no ar;
  o front-end restaura a sessão chamando `GET /api/auth/me` a cada
  carregamento de página.
- Detalhes de cada rota da API, regras de negócio e modelo de dados estão
  em `backend/README.md`.
