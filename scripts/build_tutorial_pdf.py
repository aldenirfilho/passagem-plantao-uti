#!/usr/bin/env python3
"""Gera o Tutorial Ilustrado Passagem UTI v4 em PDF widescreen.

Uso:
    python3 scripts/build_tutorial_pdf.py

Saída estável:
    output/pdf/Tutorial_Ilustrado_Passagem_UTI_v4.pdf
"""

from __future__ import annotations

import math
from pathlib import Path

from reportlab.lib.colors import Color, HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Tutorial_Ilustrado_Passagem_UTI_v4.pdf"
WIDTH = 960.0
HEIGHT = 540.0
MARGIN = 44.0

BG = HexColor("#04111C")
BG_2 = HexColor("#071827")
PANEL = HexColor("#0B2233")
PANEL_2 = HexColor("#0E2A3B")
INK = HexColor("#EAFBFF")
MUTED = HexColor("#91ACBA")
MUTED_2 = HexColor("#B9D0DA")
CYAN = HexColor("#4CEAD9")
CYAN_2 = HexColor("#12B9D3")
BLUE = HexColor("#748CFF")
GREEN = HexColor("#63E39D")
AMBER = HexColor("#FFC46A")
RED = HexColor("#FF7888")
LINE = Color(0.45, 0.79, 0.83, alpha=0.18)
LINE_STRONG = Color(0.28, 0.91, 0.85, alpha=0.42)


def register_fonts() -> tuple[str, str]:
    regular_candidates = [
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/dejavu/DejaVuSans.ttf"),
    ]
    bold_candidates = [
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        Path("/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"),
    ]
    regular = next((path for path in regular_candidates if path.exists()), None)
    bold = next((path for path in bold_candidates if path.exists()), None)
    if regular and bold:
        pdfmetrics.registerFont(TTFont("TutorialSans", str(regular)))
        pdfmetrics.registerFont(TTFont("TutorialSans-Bold", str(bold)))
        return "TutorialSans", "TutorialSans-Bold"
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = register_fonts()


def with_alpha(color, alpha: float) -> Color:
    return Color(color.red, color.green, color.blue, alpha=alpha)


def rounded_box(c: canvas.Canvas, x: float, y: float, w: float, h: float, *,
                fill=PANEL, stroke=LINE, radius: float = 14, line_width: float = 0.8) -> None:
    c.saveState()
    c.setLineWidth(line_width)
    c.setStrokeColor(stroke)
    c.setFillColor(fill)
    c.roundRect(x, y, w, h, radius, stroke=1, fill=1)
    c.restoreState()


def draw_background(c: canvas.Canvas, page_number: int, *, accent=CYAN) -> None:
    c.setFillColor(BG)
    c.rect(0, 0, WIDTH, HEIGHT, stroke=0, fill=1)
    c.setFillColor(with_alpha(BG_2, 0.92))
    c.circle(WIDTH - 70, HEIGHT - 50, 245, stroke=0, fill=1)
    c.setStrokeColor(with_alpha(accent, 0.08))
    c.setLineWidth(0.8)
    c.circle(WIDTH - 90, HEIGHT - 70, 205, stroke=1, fill=0)
    c.circle(WIDTH - 90, HEIGHT - 70, 150, stroke=1, fill=0)
    c.setStrokeColor(with_alpha(BLUE, 0.08))
    c.ellipse(-110, -170, 330, 150, stroke=1, fill=0)
    # Campo estelar determinístico.
    c.setFillColor(with_alpha(INK, 0.30))
    for i in range(34):
        x = float((i * 149 + page_number * 53) % 930 + 15)
        y = float((i * 83 + page_number * 29) % 510 + 15)
        r = 0.45 + (i % 3) * 0.22
        c.circle(x, y, r, stroke=0, fill=1)


def footer(c: canvas.Canvas, page_number: int, total_pages: int = 17) -> None:
    c.setStrokeColor(with_alpha(INK, 0.10))
    c.setLineWidth(0.6)
    c.line(MARGIN, 24, WIDTH - MARGIN, 24)
    c.setFont(FONT_BOLD, 7.2)
    c.setFillColor(MUTED)
    c.drawString(MARGIN, 11, "PASSAGEM UTI V4  |  TUTORIAL ILUSTRADO TURBO TEMI PREMIUM")
    c.drawRightString(WIDTH - MARGIN, 11, f"{page_number:02d}/{total_pages:02d}")


def fit_text(c: canvas.Canvas, text: str, max_width: float, font_name: str,
             start_size: float, minimum: float = 7.0) -> float:
    size = start_size
    while size > minimum and pdfmetrics.stringWidth(text, font_name, size) > max_width:
        size -= 0.5
    return size


def wrap_lines(text: str, max_width: float, font_name: str, size: float) -> list[str]:
    words = text.split()
    if not words:
        return [""]
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if pdfmetrics.stringWidth(candidate, font_name, size) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def draw_wrapped(c: canvas.Canvas, text: str, x: float, top_y: float, max_width: float,
                 *, font_name=FONT, size: float = 10.0, color=MUTED_2,
                 leading: float | None = None, max_lines: int | None = None) -> float:
    leading = leading or size * 1.32
    lines = wrap_lines(text, max_width, font_name, size)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while last and pdfmetrics.stringWidth(f"{last}...", font_name, size) > max_width:
            last = last[:-1]
        lines[-1] = f"{last}..."
    c.setFillColor(color)
    c.setFont(font_name, size)
    y = top_y
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_kicker(c: canvas.Canvas, number: str, label: str, y: float = 492) -> None:
    c.setStrokeColor(LINE_STRONG)
    c.setFillColor(with_alpha(CYAN, 0.08))
    c.circle(MARGIN + 13, y + 1, 13, stroke=1, fill=1)
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 7.0)
    c.drawCentredString(MARGIN + 13, y - 1.5, number)
    c.setFont(FONT_BOLD, 7.4)
    c.drawString(MARGIN + 36, y - 2, label.upper())


def draw_heading(c: canvas.Canvas, number: str, label: str, title: str, subtitle: str,
                 *, title_size: float = 27.0, accent=CYAN) -> float:
    draw_kicker(c, number, label)
    c.setFillColor(INK)
    size = fit_text(c, title, WIDTH - 2 * MARGIN, FONT_BOLD, title_size, 21)
    c.setFont(FONT_BOLD, size)
    c.drawString(MARGIN, 448, title)
    draw_wrapped(c, subtitle, MARGIN, 425, WIDTH - 2 * MARGIN, size=9.5, color=MUTED, max_lines=2)
    c.setStrokeColor(with_alpha(accent, 0.18))
    c.line(MARGIN, 399, WIDTH - MARGIN, 399)
    return 382


def draw_pill(c: canvas.Canvas, text: str, x: float, y: float, *, color=CYAN,
              width: float | None = None) -> float:
    text_w = pdfmetrics.stringWidth(text, FONT_BOLD, 7.0)
    w = width or text_w + 18
    c.setStrokeColor(with_alpha(color, 0.38))
    c.setFillColor(with_alpha(color, 0.09))
    c.roundRect(x, y, w, 21, 10.5, stroke=1, fill=1)
    c.setFillColor(color)
    c.setFont(FONT_BOLD, 7.0)
    c.drawCentredString(x + w / 2, y + 7, text)
    return w


def draw_icon_circle(c: canvas.Canvas, x: float, y: float, label: str, *, color=CYAN,
                     radius: float = 18, size: float = 9.5) -> None:
    c.setStrokeColor(with_alpha(color, 0.40))
    c.setFillColor(with_alpha(color, 0.09))
    c.circle(x, y, radius, stroke=1, fill=1)
    c.setFillColor(color)
    c.setFont(FONT_BOLD, size)
    c.drawCentredString(x, y - size * 0.34, label)


def draw_numbered_card(c: canvas.Canvas, x: float, y: float, w: float, h: float,
                       number: str, title: str, body: str, *, color=CYAN) -> None:
    rounded_box(c, x, y, w, h)
    draw_icon_circle(c, x + 28, y + h - 29, number, color=color, radius=14, size=7.5)
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 11.0)
    c.drawString(x + 50, y + h - 24, title)
    draw_wrapped(c, body, x + 18, y + h - 52, w - 36, size=8.1, color=MUTED, max_lines=4)


def draw_bullet_list(c: canvas.Canvas, items: list[str], x: float, top_y: float,
                     max_width: float, *, size: float = 8.5, color=MUTED_2,
                     bullet_color=CYAN, gap: float = 4.0) -> float:
    y = top_y
    for item in items:
        lines = wrap_lines(item, max_width - 20, FONT, size)
        c.setFillColor(bullet_color)
        c.circle(x + 4, y + 2.5, 2.2, stroke=0, fill=1)
        c.setFillColor(color)
        c.setFont(FONT, size)
        line_y = y
        for line in lines:
            c.drawString(x + 15, line_y, line)
            line_y -= size * 1.3
        y = line_y - gap
    return y


def find_logo() -> Path | None:
    candidates = [
        ROOT / "assets" / "logo-passagem-uti-aero.png",
        ROOT / "assets" / "logo-header-256.png",
        ROOT / "assets" / "logo-passagem-uti.png",
    ]
    return next((path for path in candidates if path.exists()), None)


def draw_logo(c: canvas.Canvas, x: float, y: float, size: float) -> None:
    logo = find_logo()
    if logo:
        c.drawImage(ImageReader(str(logo)), x, y, width=size, height=size,
                    preserveAspectRatio=True, anchor="c", mask="auto")
        return
    # Fallback vetorial sem dependência de arquivo.
    c.setStrokeColor(CYAN)
    c.setFillColor(PANEL)
    c.roundRect(x + size * 0.28, y + size * 0.08, size * 0.44, size * 0.84,
                size * 0.08, stroke=1, fill=1)
    for index in range(10):
        segment_y = y + size * 0.13 + index * size * 0.071
        c.setFillColor(CYAN if index < 8 else with_alpha(CYAN, 0.2))
        c.roundRect(x + size * 0.33, segment_y, size * 0.34, size * 0.045,
                    size * 0.012, stroke=0, fill=1)


def page_cover(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    # Órbitas e logotipo.
    center_x, center_y = 735, 285
    c.setStrokeColor(with_alpha(CYAN, 0.22))
    c.setLineWidth(1.1)
    c.ellipse(center_x - 180, center_y - 72, center_x + 180, center_y + 72, stroke=1, fill=0)
    c.saveState()
    c.translate(center_x, center_y)
    c.rotate(-23)
    c.ellipse(-170, -62, 170, 62, stroke=1, fill=0)
    c.restoreState()
    draw_logo(c, center_x - 118, center_y - 118, 236)
    for index, angle in enumerate(range(0, 360, 36), start=1):
        rad = math.radians(angle)
        px = center_x + math.cos(rad) * 178
        py = center_y + math.sin(rad) * 108
        draw_icon_circle(c, px, py, f"L{index}", radius=12, size=6.5)

    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 7.5)
    c.drawString(MARGIN, 477, "NEXUS CARE  |  CONTINUIDADE ASSISTENCIAL")
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 42)
    c.drawString(MARGIN, 404, "PASSAGEM")
    c.setFillColor(CYAN)
    c.drawString(MARGIN, 360, "UTI V4")
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 25)
    c.drawString(MARGIN, 306, "Tutorial Ilustrado")
    c.setFillColor(MUTED_2)
    c.setFont(FONT, 12)
    c.drawString(MARGIN, 278, "10 leitos. 10 linhas. Nenhuma pendência invisível.")
    draw_wrapped(
        c,
        "Instalação, fluxo assistencial, Radar, notificações locais, read-back, temas e Modo Turbo.",
        MARGIN,
        245,
        470,
        size=10,
        color=MUTED,
        max_lines=2,
    )
    x = MARGIN
    for text, color in [("CHAVE PROTEGIDA", GREEN), ("DADOS SINTÉTICOS", CYAN), ("WIDESCREEN 16:9", BLUE)]:
        x += draw_pill(c, text, x, 184, color=color) + 8
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(MARGIN, 142, "Ferramenta de apoio à comunicação. Revisão médica obrigatória.")
    footer(c, page)


def page_route(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "00", "Rota de aprendizagem", "Domine o essencial em quatro missões.",
                 "Leia na ordem ou abra somente a etapa necessária durante o plantão.")
    cards = [
        ("01", "Instalar", "Mac, chave já existente e primeiro início.", CYAN),
        ("02", "Preparar", "Dez leitos, três áreas e material clínico.", BLUE),
        ("03", "Operar", "Timeline, Radar, notificações e Modo Turbo.", GREEN),
        ("04", "Entregar", "Read-back, cópia, impressão e exportação.", AMBER),
    ]
    w = 205
    for index, (number, title, body, color) in enumerate(cards):
        x = MARGIN + index * (w + 17)
        draw_numbered_card(c, x, 218, w, 142, number, title, body, color=color)
        c.setStrokeColor(with_alpha(color, 0.12))
        c.circle(x + w - 14, 224, 50, stroke=1, fill=0)
    rounded_box(c, MARGIN, 76, WIDTH - 2 * MARGIN, 112, fill=with_alpha(PANEL, 0.84))
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 8)
    c.drawString(MARGIN + 20, 163, "ATALHO DE 60 SEGUNDOS")
    quick = ["Terminal aberto", "GPT localizado", "Cabeçalho preenchido", "L1-L10 revisados"]
    for index, text in enumerate(quick):
        x = MARGIN + 22 + index * 210
        draw_icon_circle(c, x + 15, 119, str(index + 1), radius=14, size=7)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 8.5)
        c.drawString(x + 38, 122, text)
        if index < 3:
            c.setStrokeColor(with_alpha(CYAN, 0.25))
            c.line(x + 180, 119, x + 198, 119)
    footer(c, page)


def page_install(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "01", "Instalação no macOS", "Uma configuração inicial. Depois, dois cliques.",
                 "A mesma chave já existente é reutilizada sem ser copiada para o aplicativo.")
    rounded_box(c, MARGIN, 93, 430, 284)
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 7)
    c.drawString(MARGIN + 20, 352, "CAMINHO PROTEGIDO NO FINDER")
    folders = [
        ("Seu usuário", 0, False),
        ("Documents", 1, False),
        ("API KEY", 2, False),
        ("passagem-plantao-uti", 3, False),
        (".env", 4, True),
    ]
    y = 320
    for label, level, is_key in folders:
        x = MARGIN + 22 + level * 24
        w = 330 - level * 24
        fill = with_alpha(CYAN, 0.09) if is_key else with_alpha(INK, 0.025)
        stroke = LINE_STRONG if is_key else LINE
        rounded_box(c, x, y - 24, w, 34, fill=fill, stroke=stroke, radius=8)
        c.setFillColor(CYAN if is_key else MUTED_2)
        c.setFont(FONT_BOLD, 8.5)
        c.drawString(x + 12, y - 12, label)
        if is_key:
            c.setFont(FONT, 6.5)
            c.drawRightString(x + w - 10, y - 12, "arquivo oculto")
        y -= 40
    rounded_box(c, MARGIN + 18, 103, 394, 31, fill=with_alpha(BG, 0.52), radius=8)
    c.setFillColor(CYAN)
    c.setFont(FONT, 7.4)
    c.drawString(MARGIN + 31, 115, "~/Documents/API KEY/passagem-plantao-uti/.env")

    right_x = 501
    steps = [
        ("1", "Confirmar Node.js", "node --version  |  versão 20 ou superior"),
        ("2", "Entrar na pasta", "Digite cd, espaço e arraste a pasta do app"),
        ("3", "Autorizar uma vez", "chmod +x start-mac.command"),
        ("4", "Iniciar", "./start-mac.command  |  manual: npm start"),
    ]
    y = 327
    for number, title, body in steps:
        draw_numbered_card(c, right_x, y - 58, 415, 61, number, title, body)
        y -= 69
    draw_pill(c, "NÃO EXIBIR O SEGREDO", right_x + 276, 350, color=RED, width=139)
    footer(c, page)


def page_start(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "02", "Primeiro início", "Confirme três sinais antes de usar.",
                 "O Terminal permanece aberto durante a sessão; parar o servidor não apaga os leitos.")
    rounded_box(c, MARGIN, 185, 392, 190, fill=HexColor("#06121D"))
    c.setFillColor(with_alpha(INK, 0.08))
    c.rect(MARGIN, 342, 392, 33, stroke=0, fill=1)
    for index, color in enumerate([RED, AMBER, GREEN]):
        c.setFillColor(color)
        c.circle(MARGIN + 18 + index * 15, 358, 4, stroke=0, fill=1)
    c.setFillColor(MUTED)
    c.setFont(FONT_BOLD, 7)
    c.drawRightString(MARGIN + 375, 355, "TERMINAL")
    terminal = [
        ("$ ./start-mac.command", MUTED_2),
        ("Passagem UTI disponível em", MUTED),
        ("http://127.0.0.1:4173", CYAN),
        ("OpenAI API: configurada", GREEN),
    ]
    y = 313
    for text, color in terminal:
        c.setFillColor(color)
        c.setFont(FONT_BOLD if color in [CYAN, GREEN] else FONT, 9)
        c.drawString(MARGIN + 22, y, text)
        y -= 25

    c.setStrokeColor(with_alpha(CYAN, 0.35))
    c.line(452, 280, 492, 280)
    c.setFillColor(CYAN)
    c.circle(472, 280, 3, stroke=0, fill=1)

    rounded_box(c, 506, 185, 410, 190)
    rounded_box(c, 523, 332, 376, 27, fill=with_alpha(INK, 0.04), radius=8)
    c.setFillColor(MUTED_2)
    c.setFont(FONT, 7.8)
    c.drawString(536, 342, "127.0.0.1:4173")
    draw_icon_circle(c, 550, 277, "P", radius=22, size=12)
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 13)
    c.drawString(582, 284, "PASSAGEM UTI")
    c.setFillColor(MUTED)
    c.setFont(FONT, 7.5)
    c.drawString(582, 269, "10 leitos  |  10 linhas")
    draw_pill(c, "GPT PRONTO", 779, 272, color=GREEN, width=105)
    c.setFillColor(MUTED)
    c.setFont(FONT, 7)
    c.drawString(530, 216, "Chave localizada. A primeira análise valida acesso e cota.")

    cards = [
        ("1", "Mesmo endereço", "Use sempre 127.0.0.1:4173."),
        ("2", "Terminal aberto", "Mantenha a janela durante o uso."),
        ("3", "Como parar", "Pressione Control + C no Terminal."),
    ]
    for index, item in enumerate(cards):
        draw_numbered_card(c, MARGIN + index * 296, 67, 279, 94, *item)
    footer(c, page)


def draw_battery(c: canvas.Canvas, x: float, y: float, label: str, charge: int,
                 *, critical: bool = False, active: bool = False) -> None:
    stroke = with_alpha(RED, 0.55) if critical else (LINE_STRONG if active else LINE)
    rounded_box(c, x, y, 75, 165, fill=with_alpha(PANEL, 0.82), stroke=stroke, radius=11)
    c.setStrokeColor(stroke)
    c.setFillColor(BG)
    c.roundRect(x + 22, y + 44, 31, 91, 7, stroke=1, fill=1)
    fill_color = RED if critical else CYAN
    fill_h = max(4, 81 * charge / 100)
    c.setFillColor(fill_color)
    c.roundRect(x + 26, y + 48, 23, fill_h, 4, stroke=0, fill=1)
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 8)
    c.drawCentredString(x + 37.5, y + 145, label)
    c.setFillColor(MUTED_2)
    c.setFont(FONT_BOLD, 6.5)
    c.drawCentredString(x + 37.5, y + 28, f"{charge}%")
    c.setFillColor(MUTED)
    c.setFont(FONT, 5.5)
    c.drawCentredString(x + 37.5, y + 14, "DEMO" if charge else "VAZIO")


def page_beds(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "03", "Cockpit dos 10 leitos", "Cada bateria mostra preparo, não gravidade.",
                 "Selecione L1 a L10. O percentual cresce com o preenchimento da passagem.")
    metrics = [("3", "recebidos", GREEN), ("7", "pendências", AMBER), ("1", "crítico", RED)]
    for index, (value, label, color) in enumerate(metrics):
        x = WIDTH - MARGIN - 96 * (3 - index)
        rounded_box(c, x, 353, 88, 37, fill=with_alpha(color, 0.07), stroke=with_alpha(color, 0.25), radius=9)
        c.setFillColor(color)
        c.setFont(FONT_BOLD, 11)
        c.drawString(x + 10, 367, value)
        c.setFillColor(MUTED)
        c.setFont(FONT, 6.5)
        c.drawString(x + 28, 368, label)
    charges = [82, 63, 91, 54, 28, 76, 41, 68, 36, 0]
    for index, charge in enumerate(charges):
        draw_battery(c, MARGIN + index * 86.5, 166, f"L{index + 1}", charge,
                     critical=index == 2, active=index == 0)
    rounded_box(c, MARGIN, 64, WIDTH - 2 * MARGIN, 78, fill=with_alpha(AMBER, 0.05),
                stroke=with_alpha(AMBER, 0.25), radius=13)
    draw_icon_circle(c, MARGIN + 34, 103, "!", color=AMBER, radius=15, size=10)
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN + 61, 112, "Leitura correta")
    draw_wrapped(c, "A bateria indica completude da passagem. O estado clínico é marcado separadamente pelo médico: Estável, Atenção, Crítico ou Não definido.",
                 MARGIN + 61, 94, WIDTH - 2 * MARGIN - 82, size=8, color=MUTED_2, max_lines=2)
    footer(c, page)


def page_areas(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "04", "Três áreas por leito", "Capturar. Organizar. Executar.",
                 "O fluxo separa conteúdo bruto, documentos e ações do próximo plantão.")
    cards = [
        ("01", "Renderizar", "Texto bruto, dez tópicos, alertas e linha do tempo.", "GPT", CYAN),
        ("02", "Exames & arquivos", "Cofre local, seleção de anexos e prévias.", "PDF", BLUE),
        ("03", "Checklist", "Pendências rastreáveis e read-back do receptor.", "OK", GREEN),
    ]
    card_w = 258
    for index, (number, title, body, icon, color) in enumerate(cards):
        x = MARGIN + index * 307
        rounded_box(c, x, 137, card_w, 226, stroke=with_alpha(color, 0.28), radius=18)
        c.setFillColor(color)
        c.setFont(FONT_BOLD, 7)
        c.drawString(x + 21, 335, number)
        draw_icon_circle(c, x + 47, 280, icon, color=color, radius=26, size=9)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 15)
        c.drawString(x + 21, 226, title)
        draw_wrapped(c, body, x + 21, 200, card_w - 42, size=9, color=MUTED, max_lines=3)
        c.setStrokeColor(with_alpha(color, 0.10))
        c.circle(x + card_w - 12, 148, 67, stroke=1, fill=0)
        if index < 2:
            c.setStrokeColor(with_alpha(CYAN, 0.35))
            c.line(x + card_w + 8, 250, x + card_w + 41, 250)
            c.setFillColor(CYAN)
            c.circle(x + card_w + 25, 250, 2.5, stroke=0, fill=1)
    draw_pill(c, "UM LEITO  |  TRÊS ÁREAS  |  UM ÚNICO FLUXO", 333, 83, color=CYAN, width=294)
    footer(c, page)


def page_render(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "05", "Gerar os 10 tópicos", "Do conteúdo bruto para uma saída revisável.",
                 "O GPT organiza os fatos fornecidos e sinaliza dados relevantes ausentes.")
    left_x, right_x = MARGIN, 534
    rounded_box(c, left_x, 145, 350, 229)
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 7)
    c.drawString(left_x + 18, 348, "ENTRADA BRUTA")
    rounded_box(c, left_x + 18, 197, 314, 132, fill=with_alpha(BG, 0.52), radius=10)
    y = 306
    source_lines = [
        ("Paciente demo, 58 anos.", INK, FONT_BOLD),
        ("Admitido por insuficiência respiratória...", MUTED_2, FONT),
        ("Intercorrência documentada às 14h...", MUTED_2, FONT),
        ("Plano: reavaliar após resultado...", MUTED_2, FONT),
    ]
    for text, color, font in source_lines:
        c.setFillColor(color)
        c.setFont(font, 7.7)
        c.drawString(left_x + 32, y, text)
        y -= 25
    rounded_box(c, left_x + 18, 160, 314, 29, fill=CYAN, stroke=CYAN, radius=8)
    c.setFillColor(BG)
    c.setFont(FONT_BOLD, 8)
    c.drawCentredString(left_x + 175, 171, "RENDERIZAR EM 10 TÓPICOS")

    # Núcleo de transformação.
    draw_icon_circle(c, 472, 260, "GPT", color=CYAN, radius=33, size=10)
    c.setStrokeColor(with_alpha(CYAN, 0.32))
    c.line(403, 260, 439, 260)
    c.line(505, 260, 523, 260)
    c.circle(472, 260, 43, stroke=1, fill=0)

    rounded_box(c, right_x, 145, 382, 229)
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 7)
    c.drawString(right_x + 18, 348, "SAÍDA EXECUTÁVEL  |  10/10")
    topics = ["Identificação e contexto", "Diagnósticos e problemas", "Últimas 24h", "Neurológico", "Respiratório", "Demais tópicos 06-10"]
    y = 316
    for index, topic in enumerate(topics):
        rounded_box(c, right_x + 18, y - 23, 346, 27, fill=with_alpha(INK, 0.025), radius=7)
        c.setFillColor(CYAN)
        c.setFont(FONT_BOLD, 6.5)
        number = f"{index + 1:02d}" if index < 5 else "06-10"
        c.drawString(right_x + 28, y - 13, number)
        c.setFillColor(MUTED_2)
        c.setFont(FONT, 7.6)
        c.drawString(right_x + 72, y - 13, topic)
        y -= 29

    steps = [("1", "Ler"), ("2", "Conferir números"), ("3", "Editar"), ("4", "Aceitar pendências")]
    for index, (number, text) in enumerate(steps):
        x = MARGIN + index * 218
        rounded_box(c, x, 70, 202, 52, fill=with_alpha(PANEL, 0.82), radius=11)
        draw_icon_circle(c, x + 26, 96, number, radius=12, size=6.5)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 8)
        c.drawString(x + 47, 93, text)
    footer(c, page)


def page_topics(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "05B", "Contrato clínico", "A ordem fixa das 10 linhas.",
                 "Quando um dado relevante não existe no material, a saída deve sinalizar NÃO INFORMADO.")
    topics = [
        "Identificação e contexto",
        "Diagnósticos e problemas ativos",
        "Últimas 24h / intercorrências",
        "Neurológico, sedação e dor",
        "Respiratório e via aérea",
        "Hemodinâmica, renal e metabólico",
        "Infecção, antimicrobianos e culturas",
        "Nutrição, dispositivos e profilaxias",
        "Plano e metas do próximo plantão",
        "Pendências, gatilhos e riscos",
    ]
    for index, topic in enumerate(topics):
        column = 0 if index < 5 else 1
        row = index if index < 5 else index - 5
        x = MARGIN + column * 448
        y = 333 - row * 54
        rounded_box(c, x, y, 425, 44, fill=with_alpha(PANEL, 0.80), radius=10)
        draw_icon_circle(c, x + 24, y + 22, f"{index + 1:02d}", radius=12, size=6.2)
        c.setFillColor(INK)
        size = fit_text(c, topic, 360, FONT_BOLD, 9.3, 7.8)
        c.setFont(FONT_BOLD, size)
        c.drawString(x + 47, y + 18.5, topic)
    rounded_box(c, MARGIN, 52, WIDTH - 2 * MARGIN, 48, fill=with_alpha(AMBER, 0.055),
                stroke=with_alpha(AMBER, 0.26), radius=11)
    c.setFillColor(AMBER)
    c.setFont(FONT_BOLD, 7.3)
    c.drawString(MARGIN + 17, 76, "REGRA DE SEGURANÇA")
    c.setFillColor(MUTED_2)
    c.setFont(FONT, 7.8)
    c.drawString(MARGIN + 148, 76, "Preserve números, unidades, datas e horários. Não execute a saída sem revisão médica.")
    footer(c, page)


def page_files(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "06", "Exames e arquivos", "Guarde localmente. Envie somente o necessário.",
                 "Anexos marcados entram na análise apenas quando o médico clica em Renderizar.")
    rounded_box(c, MARGIN, 173, 322, 198, fill=with_alpha(PANEL, 0.84), stroke=LINE_STRONG, radius=16)
    c.setStrokeColor(with_alpha(CYAN, 0.38))
    c.setDash(4, 4)
    c.roundRect(MARGIN + 14, 187, 294, 170, 13, stroke=1, fill=0)
    c.setDash()
    draw_icon_circle(c, MARGIN + 161, 303, "+", radius=23, size=15)
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 11)
    c.drawCentredString(MARGIN + 161, 262, "Arraste ou clique")
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 6.5)
    c.drawCentredString(MARGIN + 161, 241, "PDF  |  FOTO  |  TEXTO  |  DOCX")
    c.setFillColor(MUTED)
    c.setFont(FONT, 7)
    c.drawCentredString(MARGIN + 161, 219, "Até 8 anexos selecionados por análise")

    file_x = 389
    files = [
        ("RX", "radiografia_demo.png", "2,1 MB  |  incluir no GPT", CYAN, True),
        ("PDF", "evolucao_demo.pdf", "1,8 MB  |  somente local", RED, False),
    ]
    y = 290
    for icon, name, meta, color, selected in files:
        rounded_box(c, file_x, y - 26, 527, 82, fill=with_alpha(PANEL, 0.84), radius=13)
        rounded_box(c, file_x + 12, y - 14, 62, 58, fill=color, stroke=color, radius=10)
        c.setFillColor(BG if color == CYAN else INK)
        c.setFont(FONT_BOLD, 9)
        c.drawCentredString(file_x + 43, y + 9, icon)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 9)
        c.drawString(file_x + 90, y + 18, name)
        c.setFillColor(MUTED)
        c.setFont(FONT, 7.2)
        c.drawString(file_x + 90, y - 2, meta)
        c.setStrokeColor(LINE_STRONG if selected else LINE)
        c.setFillColor(CYAN if selected else BG)
        c.rect(file_x + 482, y + 4, 13, 13, stroke=1, fill=1)
        if selected:
            c.setFillColor(BG)
            c.setFont(FONT_BOLD, 8)
            c.drawCentredString(file_x + 488.5, y + 7, "x")
        y -= 96

    limits = [("8", "anexos"), ("15 MB", "por arquivo"), ("22 MB", "total"), ("120 mil", "caracteres")]
    for index, (value, label) in enumerate(limits):
        x = MARGIN + index * 218
        rounded_box(c, x, 74, 202, 72, fill=with_alpha(PANEL, 0.80), radius=12)
        c.setFillColor(CYAN)
        c.setFont(FONT_BOLD, 15)
        c.drawString(x + 16, 108, value)
        c.setFillColor(MUTED)
        c.setFont(FONT, 7.5)
        c.drawString(x + 16, 88, label)
    footer(c, page)


def page_execution(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "07", "Execução durante o plantão", "Pendência rastreável + atualização cronológica.",
                 "O checklist mostra o que falta; a timeline registra o que mudou.")
    left_x, right_x = MARGIN, 503
    rounded_box(c, left_x, 76, 413, 299)
    draw_icon_circle(c, left_x + 28, 346, "OK", color=GREEN, radius=15, size=7)
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 6.5)
    c.drawString(left_x + 53, 352, "CHECKLIST")
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 12)
    c.drawString(left_x + 53, 334, "Pendências e metas")
    checks = [
        ("Reavaliar gasometria", "18h ou piora clínica", "ALTA", RED, False),
        ("Conferir acesso central", "concluído às 15h", "MÉDIA", AMBER, True),
        ("Revisar resultado documentado", "sugestão aguardando aceite", "IA", BLUE, False),
    ]
    y = 287
    for title, meta, tag, color, done in checks:
        rounded_box(c, left_x + 17, y - 34, 379, 55, fill=with_alpha(INK, 0.022), radius=9)
        c.setStrokeColor(with_alpha(color, 0.5))
        c.setFillColor(color if done else BG)
        c.rect(left_x + 30, y - 12, 12, 12, stroke=1, fill=1)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 8)
        c.drawString(left_x + 55, y - 5, title)
        c.setFillColor(MUTED)
        c.setFont(FONT, 6.5)
        c.drawString(left_x + 55, y - 20, meta)
        draw_pill(c, tag, left_x + 325, y - 18, color=color, width=55)
        y -= 66
    c.setFillColor(with_alpha(INK, 0.07))
    c.roundRect(left_x + 18, 94, 377, 6, 3, stroke=0, fill=1)
    c.setFillColor(GREEN)
    c.roundRect(left_x + 18, 94, 188, 6, 3, stroke=0, fill=1)
    c.setFillColor(MUTED)
    c.setFont(FONT, 6.5)
    c.drawString(left_x + 18, 81, "1 de 2 pendências ativas concluída")

    rounded_box(c, right_x, 76, 413, 299)
    draw_icon_circle(c, right_x + 28, 346, "T", color=CYAN, radius=15, size=8)
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 6.5)
    c.drawString(right_x + 53, 352, "LINHA DO TEMPO")
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 12)
    c.drawString(right_x + 53, 334, "O que mudou")
    events = [
        ("15:42  |  EXAME", "Gasometria coletada; resultado pendente."),
        ("14:10  |  CONDUTA", "Conduta documentada pela equipe assistente."),
        ("12:35  |  CONTATO", "Família atualizada; dúvidas esclarecidas."),
    ]
    y = 287
    for index, (meta, text) in enumerate(events):
        c.setFillColor(CYAN)
        c.circle(right_x + 29, y, 4, stroke=0, fill=1)
        if index < len(events) - 1:
            c.setStrokeColor(with_alpha(CYAN, 0.24))
            c.line(right_x + 29, y - 5, right_x + 29, y - 56)
        c.setFillColor(CYAN)
        c.setFont(FONT_BOLD, 6.5)
        c.drawString(right_x + 48, y + 6, meta)
        c.setFillColor(MUTED_2)
        c.setFont(FONT, 7.6)
        c.drawString(right_x + 48, y - 12, text)
        y -= 68
    draw_pill(c, "ENTRA NA PRÓXIMA RENDERIZAÇÃO", right_x + 87, 88, color=CYAN, width=240)
    footer(c, page)


def page_radar_notifications(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "08", "Radar + notificações locais", "Prioridades visíveis. Atalhos diretos ao leito.",
                 "Ambos organizam dados registrados; nenhum deles monitora sinais vitais ou detecta deterioração.")
    rounded_box(c, MARGIN, 71, 511, 307)
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 6.5)
    c.drawString(MARGIN + 18, 352, "RADAR OPERACIONAL")
    radar_metrics = [("6", "com dados"), ("1", "crítico"), ("4", "alertas"), ("7", "pendências")]
    for index, (value, label) in enumerate(radar_metrics):
        x = MARGIN + 18 + index * 115
        rounded_box(c, x, 310, 105, 31, fill=with_alpha(INK, 0.025), radius=7)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 8)
        c.drawString(x + 8, 321, value)
        c.setFillColor(MUTED)
        c.setFont(FONT, 5.7)
        c.drawString(x + 23, 321, label)
    radar_rows = [
        ("L3", "PACIENTE DEMO C", "CRÍTICO", "2 alertas | 2 pendências altas", RED),
        ("L2", "PACIENTE DEMO B", "ATENÇÃO", "1 alerta | 2 lacunas", AMBER),
        ("L1", "PACIENTE DEMO A", "ESTÁVEL", "recebido | sem pendência alta", GREEN),
    ]
    y = 259
    for bed, patient, state, detail, color in radar_rows:
        rounded_box(c, MARGIN + 18, y - 35, 475, 53, fill=with_alpha(color, 0.045),
                    stroke=with_alpha(color, 0.27), radius=9)
        draw_icon_circle(c, MARGIN + 43, y - 8, bed, color=color, radius=15, size=7)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 7.5)
        c.drawString(MARGIN + 69, y, patient)
        c.setFillColor(color)
        c.setFont(FONT_BOLD, 6)
        c.drawString(MARGIN + 69, y - 16, state)
        c.setFillColor(MUTED)
        c.setFont(FONT, 6.5)
        c.drawRightString(MARGIN + 475, y - 8, detail)
        y -= 65

    panel_x = 577
    rounded_box(c, panel_x, 71, 339, 307)
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 6.5)
    c.drawString(panel_x + 18, 352, "CENTRAL LOCAL DE NOTIFICAÇÕES")
    draw_pill(c, "3 NOVAS", panel_x + 250, 341, color=CYAN, width=70)
    draw_pill(c, "TODAS", panel_x + 18, 305, color=CYAN, width=61)
    draw_pill(c, "NÃO LIDAS", panel_x + 86, 305, color=MUTED_2, width=76)
    c.setFillColor(MUTED)
    c.setFont(FONT, 5.2)
    c.drawString(panel_x + 174, 313, "render | IA | pendência alta | read-back | Turbo | falhas")
    notices = [
        ("L3 | estado crítico", "salto ao leito", RED),
        ("L2 | lacunas da IA", "salto à saída", AMBER),
        ("L1 | read-back confirmado", "evento lido", GREEN),
        ("Turbo | 2 leitos concluídos", "evento operacional", BLUE),
    ]
    y = 269
    for title, detail, color in notices:
        rounded_box(c, panel_x + 18, y - 31, 303, 43, fill=with_alpha(INK, 0.022), radius=8)
        c.setFillColor(color)
        c.circle(panel_x + 31, y - 9, 3, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 7)
        c.drawString(panel_x + 43, y - 5, title)
        c.setFillColor(MUTED)
        c.setFont(FONT, 5.8)
        c.drawString(panel_x + 43, y - 19, detail)
        y -= 46
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 6.3)
    c.drawString(panel_x + 18, 88, "Marcar lidas")
    c.drawRightString(panel_x + 321, 88, "Limpar lidas")
    footer(c, page)


def page_readback(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "09", "Read-back", "Quem recebe confirma o que compreendeu.",
                 "O aceite exige dez linhas completas, identificação do receptor e três conferências.")
    draw_icon_circle(c, 128, 275, "E", color=CYAN, radius=40, size=17)
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 6.5)
    c.drawCentredString(128, 218, "EMISSOR")
    c.setFillColor(MUTED)
    c.setFont(FONT, 7)
    c.drawCentredString(128, 201, "passagem revisada")

    c.setStrokeColor(with_alpha(CYAN, 0.38))
    c.line(185, 275, 337, 275)
    c.setFillColor(CYAN)
    for x in [219, 260, 301]:
        c.circle(x, 275, 2.5, stroke=0, fill=1)
    c.setFont(FONT_BOLD, 6)
    c.drawCentredString(261, 290, "10 LINHAS + RISCOS + PENDÊNCIAS")

    rounded_box(c, 355, 101, 561, 271, stroke=LINE_STRONG, radius=17)
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 7)
    c.drawString(375, 345, "MÉDICO RECEPTOR")
    fields = [("Nome", "MÉDICO RECEPTOR DEMO", 375, 283), ("CRM / UF", "CRM-UF 00000", 652, 283)]
    for label, value, x, y in fields:
        rounded_box(c, x, y, 250 if x == 375 else 241, 48, fill=with_alpha(BG, 0.45), radius=9)
        c.setFillColor(MUTED)
        c.setFont(FONT, 6.2)
        c.drawString(x + 12, y + 31, label)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 7.5)
        c.drawString(x + 12, y + 14, value)
    checks = ["Revisei as 10 linhas", "Conferi alertas e lacunas", "Compreendi pendências e gatilhos"]
    y = 249
    for text in checks:
        c.setFillColor(GREEN)
        c.rect(378, y - 3, 11, 11, stroke=0, fill=1)
        c.setFillColor(BG)
        c.setFont(FONT_BOLD, 7)
        c.drawCentredString(383.5, y, "x")
        c.setFillColor(MUTED_2)
        c.setFont(FONT, 8)
        c.drawString(401, y, text)
        y -= 31
    rounded_box(c, 375, 121, 518, 38, fill=GREEN, stroke=GREEN, radius=9)
    c.setFillColor(BG)
    c.setFont(FONT_BOLD, 8)
    c.drawCentredString(634, 135, "CONFIRMAR RECEBIMENTO")

    rounded_box(c, MARGIN, 53, WIDTH - 2 * MARGIN, 35, fill=with_alpha(AMBER, 0.055),
                stroke=with_alpha(AMBER, 0.28), radius=9)
    c.setFillColor(AMBER)
    c.setFont(FONT_BOLD, 7)
    c.drawString(MARGIN + 14, 66, "PROTEÇÃO AUTOMÁTICA")
    c.setFillColor(MUTED_2)
    c.setFont(FONT, 7)
    c.drawString(MARGIN + 150, 66, "Qualquer alteração assistencial posterior invalida o aceite e exige nova conferência.")
    footer(c, page)


def page_speed(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "10", "Velocidade operacional", "Comando rápido para um leito. Turbo para vários.",
                 "Os dois recursos usam o mesmo servidor local e a mesma chave protegida.")
    rounded_box(c, MARGIN, 64, 414, 313)
    draw_icon_circle(c, MARGIN + 31, 345, "K", color=CYAN, radius=17, size=10)
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 6.5)
    c.drawString(MARGIN + 56, 351, "COMMAND / CONTROL + K")
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 12)
    c.drawString(MARGIN + 56, 331, "Ações rápidas")
    rounded_box(c, MARGIN + 17, 282, 380, 32, fill=with_alpha(BG, 0.45), radius=8)
    c.setFillColor(MUTED)
    c.setFont(FONT, 7)
    c.drawString(MARGIN + 29, 294, "Buscar ação ou leito...")
    commands = [("RAD", "Abrir Radar"), ("GPT", "Renderizar L3"), ("!", "Criar pendência alta"), ("L8", "Ir para L8")]
    y = 245
    for index, (icon, text) in enumerate(commands):
        fill = with_alpha(CYAN, 0.065) if index == 0 else with_alpha(INK, 0.015)
        stroke = LINE_STRONG if index == 0 else LINE
        rounded_box(c, MARGIN + 17, y - 22, 380, 38, fill=fill, stroke=stroke, radius=8)
        draw_icon_circle(c, MARGIN + 38, y - 3, icon, radius=11, size=5.5)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 7.5)
        c.drawString(MARGIN + 58, y - 6, text)
        y -= 45
    c.setFillColor(MUTED)
    c.setFont(FONT, 6.5)
    c.drawCentredString(MARGIN + 207, 79, "Setas navegam  |  Enter executa  |  Esc fecha")

    rounded_box(c, 487, 64, 429, 313)
    c.setStrokeColor(with_alpha(CYAN, 0.30))
    c.circle(701, 292, 56, stroke=1, fill=0)
    c.circle(701, 292, 69, stroke=1, fill=0)
    draw_icon_circle(c, 701, 292, "3x", color=CYAN, radius=42, size=15)
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 6.5)
    c.drawCentredString(701, 217, "MODO TURBO")
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 14)
    c.drawCentredString(701, 195, "Até 3 análises simultâneas")
    c.setFillColor(with_alpha(INK, 0.07))
    c.roundRect(530, 166, 342, 7, 3.5, stroke=0, fill=1)
    c.setFillColor(CYAN)
    c.roundRect(530, 166, 239, 7, 3.5, stroke=0, fill=1)
    c.setFillColor(MUTED_2)
    c.setFont(FONT_BOLD, 7)
    c.drawCentredString(701, 147, "7 de 10 processados  |  último: L7")
    draw_bullet_list(c, ["Confirma antes de iniciar", "Ignora entradas sem alteração", "Permite cancelar", "Cada leito novo pode gerar custo da API"],
                     543, 123, 325, size=7.2, gap=1)
    footer(c, page)


def page_theme_outputs(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "11", "Conforto e entrega", "Sistema, Claro ou Escuro. Copiar, imprimir ou exportar.",
                 "A preferência visual fica local; cada saída tem uma finalidade diferente.")
    themes = [
        ("SISTEMA", "acompanha o macOS", CYAN, PANEL),
        ("CLARO", "ambiente iluminado", CYAN_2, HexColor("#EEF5F6")),
        ("ESCURO", "plantão noturno", BLUE, HexColor("#071827")),
    ]
    for index, (title, subtitle, color, fill) in enumerate(themes):
        x = MARGIN + index * 292
        rounded_box(c, x, 245, 276, 126, fill=fill, stroke=with_alpha(color, 0.30), radius=15)
        c.setFillColor(color if title != "CLARO" else HexColor("#087F8A"))
        c.setFont(FONT_BOLD, 8)
        c.drawString(x + 17, 345, title)
        c.setFillColor(MUTED if title != "CLARO" else HexColor("#4F6E78"))
        c.setFont(FONT, 6.7)
        c.drawString(x + 17, 329, subtitle)
        window_fill = with_alpha(INK, 0.055) if title != "CLARO" else HexColor("#FFFFFF")
        rounded_box(c, x + 17, 263, 242, 50, fill=window_fill, stroke=with_alpha(color, 0.18), radius=9)
        c.setFillColor(with_alpha(color, 0.22))
        c.roundRect(x + 31, 293, 154, 6, 3, stroke=0, fill=1)
        c.roundRect(x + 31, 278, 110, 6, 3, stroke=0, fill=1)

    outputs = [
        ("COPY", "Copiar leito", "10 linhas + eventos + pendências"),
        ("ALL", "Copiar plantão", "cabeçalho + leitos com dados"),
        ("PDF", "Imprimir", "volte à aba Renderizar"),
        ("JSON", "Exportar", "sem conteúdo dos anexos"),
    ]
    for index, (icon, title, body) in enumerate(outputs):
        x = MARGIN + index * 218
        rounded_box(c, x, 76, 202, 137, fill=with_alpha(PANEL, 0.82), radius=13)
        draw_icon_circle(c, x + 32, 176, icon, radius=16, size=6.5)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 9)
        c.drawString(x + 17, 142, title)
        draw_wrapped(c, body, x + 17, 122, 168, size=7.2, color=MUTED, max_lines=3)
    c.setFillColor(AMBER)
    c.setFont(FONT_BOLD, 6.7)
    c.drawString(MARGIN, 54, "ATENÇÃO: exportar não é restaurar; a interface atual não importa o JSON.")
    footer(c, page)


def page_privacy(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "12", "Privacidade e segurança", "Local primeiro. Envio deliberado. Revisão humana.",
                 "A arquitetura reduz exposição acidental, mas não substitui política institucional ou base legal.")
    nodes = [
        (125, "1", "Navegador local", "leitos e anexos no IndexedDB", CYAN),
        (480, "2", "Servidor local", "chave fora da interface", GREEN),
        (835, "3", "OpenAI API", "anexos selecionados | store: false", BLUE),
    ]
    for x, number, title, body, color in nodes:
        rounded_box(c, x - 110, 218, 220, 142, fill=with_alpha(PANEL, 0.84),
                    stroke=with_alpha(color, 0.30), radius=17)
        draw_icon_circle(c, x, 316, number, color=color, radius=20, size=10)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 10)
        c.drawCentredString(x, 275, title)
        draw_wrapped(c, body, x - 88, 253, 176, size=7, color=MUTED, max_lines=2)
    for x1, x2, label in [(235, 370, "somente ao clicar"), (590, 725, "envio selecionado")]:
        c.setStrokeColor(with_alpha(CYAN, 0.32))
        c.line(x1, 287, x2, 287)
        c.setFillColor(CYAN)
        c.circle((x1 + x2) / 2, 287, 2.5, stroke=0, fill=1)
        c.setFillColor(MUTED)
        c.setFont(FONT, 5.8)
        c.drawCentredString((x1 + x2) / 2, 299, label)
    rules = [
        "A chave não aparece no navegador, JSON, tutorial ou GitHub.",
        "Use o mesmo perfil e 127.0.0.1:4173 para manter o armazenamento.",
        "Revise toda saída antes de transmitir ou executar uma conduta.",
        "Proteja exportações e confirme política institucional e LGPD.",
    ]
    for index, rule in enumerate(rules):
        column = index % 2
        row = index // 2
        x = MARGIN + column * 448
        y = 139 - row * 58
        rounded_box(c, x, y, 425, 48, fill=with_alpha(INK, 0.018), radius=10)
        draw_icon_circle(c, x + 24, y + 24, f"{index + 1:02d}", radius=11, size=5.8)
        draw_wrapped(c, rule, x + 46, y + 29, 360, size=7.4, color=MUTED_2, max_lines=2)
    footer(c, page)


def page_troubleshooting(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page)
    draw_heading(c, "13", "Resgate rápido", "Problema -> causa -> próxima ação.",
                 "Execute somente o resgate relacionado ao sintoma visível.")
    rows = [
        ("Node.js não encontrado", "node --version; instale Node 20+ e reabra o Terminal."),
        ("Permissão negada", "chmod +x start-mac.command dentro da pasta do app."),
        ("Chave não encontrada", "Confira o caminho, .env e se o arquivo não virou .env.txt."),
        ("Servidor indisponível", "Mantenha o Terminal aberto e execute npm start."),
        ("Chave recusada ou sem cota", "Confira chave e faturamento do projeto da OpenAI API."),
        ("Resposta descartada", "O leito mudou durante a análise; revise e renderize novamente."),
        ("Anexos ausentes", "Use o mesmo navegador, perfil e 127.0.0.1:4173."),
        ("Nada mudou", "O app evita gasto repetido; force somente se necessário."),
    ]
    rounded_box(c, MARGIN, 69, WIDTH - 2 * MARGIN, 306, fill=with_alpha(PANEL, 0.84), radius=16)
    c.setFillColor(with_alpha(CYAN, 0.07))
    c.roundRect(MARGIN, 338, WIDTH - 2 * MARGIN, 37, 16, stroke=0, fill=1)
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 6.8)
    c.drawString(MARGIN + 16, 352, "SINAL")
    c.drawString(MARGIN + 288, 352, "RESGATE")
    y = 319
    for index, (signal, rescue) in enumerate(rows):
        if index % 2:
            c.setFillColor(with_alpha(INK, 0.018))
            c.rect(MARGIN + 1, y - 25, WIDTH - 2 * MARGIN - 2, 33, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 7.2)
        c.drawString(MARGIN + 16, y - 10, signal)
        c.setFillColor(MUTED_2)
        size = fit_text(c, rescue, 550, FONT, 7.0, 6.2)
        c.setFont(FONT, size)
        c.drawString(MARGIN + 288, y - 10, rescue)
        c.setStrokeColor(LINE)
        c.line(MARGIN + 1, y - 25, WIDTH - MARGIN - 1, y - 25)
        y -= 32
    footer(c, page)


def page_final(c: canvas.Canvas, page: int) -> None:
    draw_background(c, page, accent=GREEN)
    c.setStrokeColor(with_alpha(GREEN, 0.18))
    c.circle(WIDTH / 2, 314, 100, stroke=1, fill=0)
    c.circle(WIDTH / 2, 314, 123, stroke=1, fill=0)
    draw_logo(c, WIDTH / 2 - 76, 238, 152)
    c.setFillColor(CYAN)
    c.setFont(FONT_BOLD, 7)
    c.drawCentredString(WIDTH / 2, 198, "CHECKLIST DE DECOLAGEM")
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 27)
    c.drawCentredString(WIDTH / 2, 165, "Pronto para o próximo plantão.")
    checks = ["Servidor local", "GPT localizado", "Cabeçalho", "Leitos revisados", "Pendências aceitas", "Read-back"]
    total_w = 780
    start_x = (WIDTH - total_w) / 2
    for index, text in enumerate(checks):
        x = start_x + index * 130
        rounded_box(c, x, 108, 118, 31, fill=with_alpha(GREEN, 0.06),
                    stroke=with_alpha(GREEN, 0.24), radius=15)
        c.setFillColor(GREEN)
        c.circle(x + 15, 123.5, 3, stroke=0, fill=1)
        c.setFont(FONT_BOLD, 6.2)
        c.drawString(x + 25, 121, text)
    c.setFillColor(MUTED)
    c.setFont(FONT, 7.5)
    c.drawCentredString(WIDTH / 2, 73, "Ferramenta de apoio. Não substitui prontuário, prescrição, avaliação à beira-leito ou julgamento médico.")
    footer(c, page)


PAGES = [
    page_cover,
    page_route,
    page_install,
    page_start,
    page_beds,
    page_areas,
    page_render,
    page_topics,
    page_files,
    page_execution,
    page_radar_notifications,
    page_readback,
    page_speed,
    page_theme_outputs,
    page_privacy,
    page_troubleshooting,
    page_final,
]


def build_pdf() -> Path:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = canvas.Canvas(str(OUTPUT), pagesize=(WIDTH, HEIGHT), pageCompression=1)
    document.setTitle("Tutorial Ilustrado Passagem UTI v4")
    document.setAuthor("Passagem UTI - NEXUS CARE")
    document.setSubject("Manual visual de instalação e uso seguro")
    document.setKeywords("UTI, passagem de plantão, tutorial, read-back, Radar, Turbo TEMI")
    for page_number, renderer in enumerate(PAGES, start=1):
        renderer(document, page_number)
        document.showPage()
    document.save()

    reader = PdfReader(str(OUTPUT))
    if len(reader.pages) != len(PAGES):
        raise RuntimeError(f"PDF incompleto: {len(reader.pages)} páginas; esperado {len(PAGES)}.")
    if OUTPUT.stat().st_size < 50_000:
        raise RuntimeError("PDF gerado parece pequeno demais para conter o tutorial ilustrado.")
    return OUTPUT


if __name__ == "__main__":
    path = build_pdf()
    print(f"PDF criado: {path}")
    print(f"Páginas: {len(PAGES)}")
    print(f"Tamanho: {path.stat().st_size} bytes")
