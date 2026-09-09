# Sistema de Gestão de Eventos e Inscrições Acadêmicas — Protótipo Front-end

Protótipo de interface em **HTML + CSS + JavaScript puro**, sem frameworks, sem
bibliotecas externas e sem ferramenta de build (Vite/webpack). Basta abrir no
navegador.

## Como abrir

**Opção 1 — Direto no navegador**
Dê duplo clique em `index.html`. Como o projeto não usa módulos ES (`import`/`export`)
nem faz requisições a arquivos externos, ele funciona até mesmo abrindo o arquivo
localmente (`file://`).

**Opção 2 — VS Code com Live Server (recomendado)**
1. Abra a pasta do projeto no VS Code (`File > Open Folder...`).
2. Instale a extensão **Live Server** (autor: Ritwick Dey), se ainda não tiver.
3. Clique com o botão direito em `index.html` → **Open with Live Server**.
4. O navegador abre automaticamente e recarrega a cada alteração salva.

Não precisa de `npm install`, Node.js ou qualquer terminal — é só HTML/CSS/JS.

## Login (protótipo)

Ao abrir o sistema, é exibida a tela de login, que pergunta primeiro **Administrador**
ou **Estudante**. O login só é aceito se corresponder exatamente ao tipo selecionado.

Contas de demonstração (dados em `js/data.js`):

| Perfil        | E-mail / ID                        | Senha      |
|---------------|-------------------------------------|------------|
| Estudante     | ana.costa@multivix.edu.br           | 1234       |
| Estudante     | bruno.silva@multivix.edu.br         | 1234       |
| Administrador | carla.menezes@multivix.edu.br       | admin123   |

Também é possível entrar com o "ID Aluno/Matrícula" (ex.: `2023104032`) ou o
"ID Administrador" (ex.: `ADM-045`) no lugar do e-mail.

## Estrutura

```
index.html          Tela de login + estrutura da aplicação (sidebar, topbar, conteúdo, modal)
css/style.css        Todo o estilo visual (inclui tela de login e perfil)
js/data.js           Dados em memória (usuários, eventos, inscrições, certificados) e funções de CRUD/autenticação
js/render.js         Funções que geram o HTML de cada tela (login e páginas)
js/modals.js         Lógica dos modais (login → n/a; novo/editar evento, exclusão, inscrição, esqueci senha)
js/app.js            Autenticação, roteamento por perfil e ligação dos event listeners
```

## Perfis de acesso

O conteúdo do **Administrador** é totalmente separado do conteúdo do **Estudante**;
cada perfil só enxerga os itens do seu próprio menu.

- **Estudante**: Dashboard (eventos participados), Eventos (buscar e se inscrever),
  Minhas Inscrições, Certificados, Apoio, Perfil.
- **Administrador**: Relatório Geral / Dashboard, Eventos (ver todos e criar novo
  evento), Certificados Gerados (busca por nome ou ID do aluno), Perfil.
- **Perfil** (ambos): nome, ID (aluno ou administrador), e-mail, telefone,
  "Esqueci minha senha" e "Sair" (logout).

## Regra de inscrição

Cada aluno (usuário logado) pode ter **apenas uma inscrição ativa por evento**.
Se ele tentar se inscrever novamente em um evento no qual já está inscrito, o
sistema bloqueia a ação e exibe um aviso — o botão de inscrição também já
aparece desabilitado como "Já inscrito ✓" na listagem de Eventos.

## Limitações atuais (protótipo)

- Os dados ficam **em memória**: ao recarregar a página (F5), tudo volta ao
  estado inicial definido em `js/data.js`, incluindo a sessão de login.
- Não há backend: nenhuma chamada de rede é feita. A autenticação e o "esqueci
  minha senha" são simulados localmente. A próxima etapa é integrar com a API
  Flask + SQLite definida no documento de visão do projeto.
- Geração real de certificados em PDF ainda não está implementada (o botão
  "Baixar PDF" é apenas ilustrativo).
