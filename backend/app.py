"""
Sistema de Gestão de Eventos e Inscrições Acadêmicas — Faculdade Multivix
Backend Flask + SQLite.

Como rodar:
    pip install -r requirements.txt
    python app.py

O servidor sobe em http://localhost:5000 e cria/popula o banco SQLite
automaticamente em instance/eventos.db na primeira execução.
"""
import os
from datetime import timedelta

from flask import Flask, jsonify

from db import close_db, init_db

def _origem_e_permitida(origem: str) -> bool:
    """Libera qualquer porta em localhost/127.0.0.1 (Live Server, http-server
    etc. costumam variar de porta). Ajuste esta função se for publicar o
    front-end em outro domínio."""
    return origem.startswith("http://localhost:") or origem.startswith("http://127.0.0.1:")


def create_app():
    app = Flask(__name__)

    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "chave-de-desenvolvimento-troque-em-producao")
    app.config["JSON_AS_ASCII"] = False
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=8)
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    # Em produção com HTTPS, defina SESSION_COOKIE_SECURE = True.
    app.config["SESSION_COOKIE_SECURE"] = os.environ.get("COOKIE_SECURE", "0") == "1"

    app.teardown_appcontext(close_db)

    with app.app_context():
        init_db()

    from routes.auth import bp as auth_bp
    from routes.perfil import bp as perfil_bp
    from routes.eventos import bp as eventos_bp
    from routes.inscricoes import bp as inscricoes_bp
    from routes.certificados import bp as certificados_bp
    from routes.admin import bp as admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(perfil_bp)
    app.register_blueprint(eventos_bp)
    app.register_blueprint(inscricoes_bp)
    app.register_blueprint(certificados_bp)
    app.register_blueprint(admin_bp)

    @app.after_request
    def aplicar_cors(response):
        origem = _origem_da_requisicao()
        if _origem_e_permitida(origem):
            response.headers["Access-Control-Allow-Origin"] = origem
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return response

    @app.route("/api/<path:_qualquer>", methods=["OPTIONS"])
    def preflight(_qualquer):
        return "", 204

    @app.get("/api/saude")
    def saude():
        return jsonify(status="ok", servico="Multivix Eventos API")

    @app.errorhandler(404)
    def nao_encontrado(_e):
        return jsonify(erro="Rota não encontrada."), 404

    @app.errorhandler(500)
    def erro_interno(e):
        return jsonify(erro="Erro interno do servidor.", detalhe=str(e)), 500

    return app


def _origem_da_requisicao():
    from flask import request
    return request.headers.get("Origin", "")


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
