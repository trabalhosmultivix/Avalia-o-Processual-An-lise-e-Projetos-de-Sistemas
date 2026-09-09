"""
Geração do PDF do Certificado de Participação (Faculdade Multivix).

Usamos reportlab (puro Python, sem dependência de binários externos como
wkhtmltopdf) para desenhar o certificado em memória e devolver os bytes
prontos para download.
"""
from io import BytesIO

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas

AZUL_MULTIVIX = HexColor("#0B2E63")
DOURADO = HexColor("#B8860B")
CINZA = HexColor("#555555")


def gerar_pdf_certificado(dados: dict) -> bytes:
    """
    `dados` deve conter:
        nome_aluno, identificador_aluno, titulo_evento, data_evento (str já
        formatada), carga_horaria, codigo_certificado, hash_verificacao,
        nome_signatario, cargo_signatario, data_emissao (str formatada)
    """
    buffer = BytesIO()
    largura, altura = landscape(A4)
    c = canvas.Canvas(buffer, pagesize=landscape(A4))

    # ─── Moldura decorativa ────────────────────────────────────────────────
    c.setStrokeColor(AZUL_MULTIVIX)
    c.setLineWidth(3)
    c.rect(1.2 * cm, 1.2 * cm, largura - 2.4 * cm, altura - 2.4 * cm)
    c.setStrokeColor(DOURADO)
    c.setLineWidth(1)
    c.rect(1.5 * cm, 1.5 * cm, largura - 3 * cm, altura - 3 * cm)

    # ─── Cabeçalho institucional ───────────────────────────────────────────
    c.setFillColor(AZUL_MULTIVIX)
    c.setFont("Helvetica-Bold", 26)
    c.drawCentredString(largura / 2, altura - 3.3 * cm, "FACULDADE MULTIVIX")

    c.setFillColor(CINZA)
    c.setFont("Helvetica", 11)
    c.drawCentredString(
        largura / 2, altura - 4.0 * cm,
        "Sistema de Gestão de Eventos e Inscrições Acadêmicas",
    )

    c.setFillColor(DOURADO)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(largura / 2, altura - 5.6 * cm, "CERTIFICADO DE PARTICIPAÇÃO")

    # ─── Corpo do certificado ──────────────────────────────────────────────
    c.setFillColor(HexColor("#222222"))
    c.setFont("Helvetica", 13)
    texto_intro = "Certificamos que"
    c.drawCentredString(largura / 2, altura - 8.0 * cm, texto_intro)

    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(AZUL_MULTIVIX)
    c.drawCentredString(largura / 2, altura - 9.0 * cm, dados["nome_aluno"])

    c.setFont("Helvetica", 12)
    c.setFillColor(HexColor("#222222"))
    identificador_txt = f"(matrícula {dados['identificador_aluno']})"
    c.drawCentredString(largura / 2, altura - 9.7 * cm, identificador_txt)

    corpo = (
        f"participou do evento \u201c{dados['titulo_evento']}\u201d, realizado em "
        f"{dados['data_evento']}, promovido pela Faculdade Multivix, "
        f"com carga horária total de {dados['carga_horaria']} horas."
    )
    _desenhar_paragrafo_centralizado(
        c, corpo, largura / 2, altura - 11.0 * cm, largura - 8 * cm,
        font="Helvetica", size=13, leading=19,
    )

    # ─── Assinatura / selo da administração ────────────────────────────────
    centro_x = largura / 2
    y_assinatura = 4.6 * cm

    c.setStrokeColor(HexColor("#333333"))
    c.setLineWidth(0.8)
    c.line(centro_x - 4.5 * cm, y_assinatura, centro_x + 4.5 * cm, y_assinatura)

    # Nome do signatário desenhado em itálico, simulando uma assinatura
    c.setFont("Helvetica-Oblique", 15)
    c.setFillColor(AZUL_MULTIVIX)
    c.drawCentredString(centro_x, y_assinatura + 0.25 * cm, dados["nome_signatario"])

    c.setFont("Helvetica", 10)
    c.setFillColor(CINZA)
    c.drawCentredString(centro_x, y_assinatura - 0.5 * cm, dados["cargo_signatario"])
    c.drawCentredString(centro_x, y_assinatura - 1.0 * cm, "Faculdade Multivix — Direção Acadêmica")

    # Selo circular (carimbo) ao lado da assinatura
    selo_x = centro_x + 8.5 * cm
    selo_y = y_assinatura + 0.6 * cm
    c.saveState()
    c.setStrokeColor(DOURADO)
    c.setLineWidth(1.4)
    c.circle(selo_x, selo_y, 1.9 * cm, stroke=1, fill=0)
    c.setLineWidth(0.6)
    c.circle(selo_x, selo_y, 1.6 * cm, stroke=1, fill=0)
    c.setFont("Helvetica-Bold", 7.5)
    c.setFillColor(DOURADO)
    c.drawCentredString(selo_x, selo_y + 0.55 * cm, "FACULDADE")
    c.drawCentredString(selo_x, selo_y + 0.05 * cm, "MULTIVIX")
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(selo_x, selo_y - 0.5 * cm, "CERTIFICADO")
    c.drawCentredString(selo_x, selo_y - 0.95 * cm, "OFICIAL")
    c.restoreState()

    # ─── Rodapé: código do certificado e verificação de autenticidade ─────
    c.setFont("Helvetica", 9)
    c.setFillColor(CINZA)
    c.drawCentredString(
        centro_x, 2.6 * cm,
        f"Código do certificado: {dados['codigo_certificado']}    |    "
        f"Emitido em {dados['data_emissao']}",
    )
    c.drawCentredString(
        centro_x, 2.15 * cm,
        f"Código de verificação de autenticidade: {dados['hash_verificacao']}",
    )
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(
        centro_x, 1.75 * cm,
        "A autenticidade deste certificado pode ser conferida no sistema da Faculdade Multivix.",
    )

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


def _desenhar_paragrafo_centralizado(c, texto, x_centro, y_topo, largura_max, font, size, leading):
    """Quebra `texto` em linhas que cabem em `largura_max` e desenha
    centralizadas a partir de `y_topo`, descendo `leading` a cada linha."""
    c.setFont(font, size)
    palavras = texto.split()
    linhas, linha_atual = [], ""
    for palavra in palavras:
        candidata = f"{linha_atual} {palavra}".strip()
        if c.stringWidth(candidata, font, size) <= largura_max:
            linha_atual = candidata
        else:
            linhas.append(linha_atual)
            linha_atual = palavra
    if linha_atual:
        linhas.append(linha_atual)

    y = y_topo
    for linha in linhas:
        c.drawCentredString(x_centro, y, linha)
        y -= leading
