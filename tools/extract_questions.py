#!/usr/bin/env python3
"""Извлекает вопросы, варианты ответов, картинки и ключ из PDF экзамена ОФСЛА в JSON.

Запуск из корня проекта:
    .venv/bin/python tools/extract_questions.py
"""

import json
import re
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = ROOT / "doc" / "pilot_svs_115_bez_otvetov.pdf"
OUT_DIR = ROOT / "data"
IMG_DIR = OUT_DIR / "img"

IMAGE_DPI = 150
MIN_IMAGE_SIDE = 40  # картинки 32x32 — иконки радиокнопок
FOOTER_Y = 805  # ниже — номер страницы
SAME_ROW_EPS = 2.0
TEXT_SIZES = (10, 11, 12)  # кегль текста вопроса; варианты — 8, заголовки разделов — 13

# Колонки вёрстки (x в pt)
X_NUM_MAX = 85  # номер варианта / пункта сопоставления
X_MATCH_MARK = (85, 100)  # "__" у пунктов сопоставления
X_RIGHT_COL = 300  # правая колонка сопоставления "[k] ..."

# Колонки таблицы ключей
KEY_X_NUM_MAX = 100
KEY_X_ANSWER_MAX = 270

RE_HEADER = re.compile(r"^№(\d+)\s*\((?:Балл\s*)?\d+\)$")
RE_RIGHT_OPT = re.compile(r"^\[(\d+)\]\s*(.*)$")
RE_PAIR = re.compile(r"^(\d+)\s*-\s*(\d+)$")
RE_CAPTION = re.compile(r"^[\d\s]+$")

# Точечные исправления битого текстового слоя (кириллица вместо латиницы и т.п.).
# Ключ — (номер вопроса, поле), где поле: "text", "option:N", "item:N".
TEXT_FIXES = {
    # "RМК/" набрано кириллическими М и К
    (12, "option:3"): ("RМК/", "RMK/"),
    # "Сx" с кириллической С
    **{(qid, "text"): ("Сx", "Cx") for qid in (92, 94, 95, 96)},
}


# Варианты-метки на картинках ("А", "В", "С") местами набраны кириллицей, а "D" — латиницей
CYR_TO_LAT = str.maketrans("АВСЕНКМОРТХ", "ABCEHKMOPTX")


def norm_space(s):
    return re.sub(r"\s+", " ", s).strip()


def join_lines(lines):
    """Склеивает строки абзаца, убирая переносы по дефису."""
    out = ""
    for s in (norm_space(x) for x in lines):
        if not s:
            continue
        if out.endswith("-") and not out.endswith(" -") and s[:1].islower():
            out = out[:-1] + s
        else:
            out = f"{out} {s}" if out else s
    return out


def read_rows(page):
    """Строки страницы: dict(y0, y1, x, size, text); фрагменты одного ряда
    в пределах одной колонки склеиваются (текст вопроса выровнен по ширине и режется на слова)."""
    raw = []
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0:
            continue
        for ln in b["lines"]:
            text = "".join(s["text"] for s in ln["spans"])
            if not text.strip():
                continue
            x0, y0, _, y1 = ln["bbox"]
            if y0 > FOOTER_Y:
                continue
            raw.append(dict(x=x0, y0=y0, y1=y1, size=round(ln["spans"][0]["size"]), text=text))
    raw.sort(key=lambda r: (round(r["y0"]), r["x"]))
    rows = []
    for r in raw:
        prev = rows[-1] if rows else None
        # склеиваем только текст вопроса: у вариантов номер и текст — разные колонки
        if (prev and r["size"] in TEXT_SIZES and prev["size"] == r["size"]
                and abs(prev["y0"] - r["y0"]) < SAME_ROW_EPS):
            prev["text"] += " " + r["text"]
            continue
        rows.append(r)
    return rows


def read_images(page):
    imgs = []
    for info in page.get_image_info():
        if min(info["width"], info["height"]) < MIN_IMAGE_SIDE:
            continue
        imgs.append(pymupdf.Rect(info["bbox"]))
    return imgs


def find_key_page(doc):
    for i, page in enumerate(doc):
        for r in read_rows(page):
            if r["size"] == 13 and r["text"].strip() == "Ключи":
                return i
    raise SystemExit("Не найдена страница «Ключи»")


def collect_questions(doc, key_page):
    """Раскладывает строки и картинки страниц с вопросами по вопросам."""
    title = None
    sections = []
    section = None
    questions = []
    cur = None
    last_was_heading = False
    for pno in range(key_page):
        page = doc[pno]
        items = [("row", r["y0"], r) for r in read_rows(page)]
        items += [("img", rect.y0, rect) for rect in read_images(page)]
        items.sort(key=lambda it: it[1])
        for kind, _, obj in items:
            if kind == "img":
                if cur is None:
                    raise SystemExit(f"Картинка вне вопроса на стр. {pno + 1}")
                cur["images"].append((pno, obj))
                continue
            r = obj
            text = r["text"].strip()
            if r["size"] == 13:
                if title is None:
                    title = text
                elif cur is None and section is not None and last_was_heading:
                    # заголовок раздела в две строки
                    section = sections[-1] = f"{section} {text}"
                else:
                    section = text
                    sections.append(section)
                    cur = None
                last_was_heading = True
                continue
            last_was_heading = False
            m = RE_HEADER.match(text)
            if m:
                cur = dict(id=int(m.group(1)), section=section, rows=[], images=[])
                questions.append(cur)
                continue
            if cur is not None:
                cur["rows"].append((pno, r))
    return title, sections, questions


def nearest(markers, pno, r):
    """Маркер (номер варианта) на той же странице, ближайший по вертикальному центру."""
    cy = (r["y0"] + r["y1"]) / 2
    same_page = [m for m in markers if m["page"] == pno]
    if not same_page:
        return markers[-1] if markers else None
    return min(same_page, key=lambda m: abs((m["y0"] + m["y1"]) / 2 - cy))


def parse_question(q):
    """Разбирает строки вопроса на текст, варианты / пункты сопоставления, область картинки."""
    rows = q["rows"]
    is_matching = any(r["text"].strip() == "__" and X_MATCH_MARK[0] <= r["x"] < X_MATCH_MARK[1]
                      for _, r in rows)

    text_lines = []
    captions = []
    markers = []  # номера вариантов (левая колонка)
    body = []  # строки текста вариантов (x >= 100, x < правой колонки)
    right = []  # правая колонка сопоставления
    headers = []
    for pno, r in rows:
        t = r["text"].strip()
        if r["size"] in TEXT_SIZES:
            if RE_CAPTION.match(t) and q["images"]:
                captions.append((pno, r))
            else:
                text_lines.append(t)
        elif r["x"] < X_NUM_MAX and t.isdigit():
            markers.append(dict(page=pno, y0=r["y0"], y1=r["y1"], num=int(t), lines=[]))
        elif is_matching and X_MATCH_MARK[0] <= r["x"] < X_MATCH_MARK[1] and t == "__":
            continue
        elif is_matching and r["x"] >= X_RIGHT_COL:
            right.append((pno, r))
        else:
            body.append((pno, r))

    for pno, r in body:
        m = nearest(markers, pno, r)
        # у сопоставления строки заголовка таблицы стоят выше первого пункта
        if is_matching and (m is None or (m["page"] == pno and r["y1"] < m["y0"] - SAME_ROW_EPS
                                          and m is markers[0])):
            headers.append(r)
            continue
        if m is None:
            raise SystemExit(f"№{q['id']}: текст варианта без номера: {r['text']!r}")
        m["lines"].append(r["text"])

    columns = None
    right_opts = []
    for pno, r in right:
        t = r["text"].strip()
        mo = RE_RIGHT_OPT.match(t)
        if mo:
            right_opts.append(dict(id=int(mo.group(1)), lines=[mo.group(2)]))
        elif right_opts:
            right_opts[-1]["lines"].append(t)
        else:
            headers.append(r)
    if headers:
        headers.sort(key=lambda r: r["x"])
        columns = [norm_space(h["text"]) for h in headers]

    numbered = [dict(id=m["num"], text=join_lines(m["lines"])) for m in markers]
    result = dict(text=join_lines(text_lines))
    if is_matching:
        result["columns"] = columns
        result["items"] = numbered
        result["options"] = [dict(id=o["id"], text=join_lines(o["lines"])) for o in right_opts]
    else:
        result["options"] = numbered
    result["captions"] = captions
    return result


def render_image(doc, q, captions):
    """Рендерит область картинок вопроса — объединённый bbox вместе с подписями."""
    by_page = {}
    for pno, rect in q["images"]:
        by_page.setdefault(pno, pymupdf.Rect(rect))
        by_page[pno] |= rect
    for pno, r in captions:
        if pno in by_page:
            by_page[pno] |= pymupdf.Rect(r["x"], r["y0"], r["x"] + 1, r["y1"])
    if len(by_page) > 1:
        raise SystemExit(f"№{q['id']}: картинки на нескольких страницах {sorted(by_page)}")
    (pno, rect), = by_page.items()
    name = f"q{q['id']}.png"
    doc[pno].get_pixmap(clip=rect, dpi=IMAGE_DPI).save(IMG_DIR / name)
    return f"img/{name}"


def parse_key(doc, key_page):
    """Таблица «Ключи»: номер вопроса -> список номеров или dict сопоставления."""
    key = {}
    for pno in range(key_page, len(doc)):
        rows = read_rows(doc[pno])
        nums = [r for r in rows if r["x"] < KEY_X_NUM_MAX and r["text"].strip().isdigit()]
        answers = [r for r in rows if KEY_X_NUM_MAX <= r["x"] < KEY_X_ANSWER_MAX
                   and r["size"] == 8 and r["text"].strip() != "Вариант теста №1"]
        answers.sort(key=lambda r: r["y0"])
        # блоки пар "a - b", идущих подряд с a = 1, 2, 3...
        blocks = []
        for r in answers:
            mo = RE_PAIR.match(r["text"].strip())
            if not mo:
                blocks.append([r])
                continue
            a = int(mo.group(1))
            last = blocks[-1] if blocks else None
            if (last and RE_PAIR.match(last[-1]["text"].strip())
                    and int(RE_PAIR.match(last[-1]["text"].strip()).group(1)) == a - 1):
                last.append(r)
            else:
                blocks.append([r])
        for n in nums:
            qid = int(n["text"])
            # номер стоит по центру блока: при чётном числе пар — между строками
            cy = (n["y0"] + n["y1"]) / 2
            block = next((b for b in blocks if b[0]["y0"] - SAME_ROW_EPS < cy < b[-1]["y1"] + SAME_ROW_EPS),
                         None)
            if block is None:
                raise SystemExit(f"Ключ: нет ответа для №{qid} (стр. {pno + 1})")
            if RE_PAIR.match(block[0]["text"].strip()):
                pairs = [RE_PAIR.match(r["text"].strip()).groups() for r in block]
                key[qid] = {a: int(b) for a, b in pairs}
            else:
                key[qid] = [int(x) for x in re.split(r"\s*,\s*", block[0]["text"].strip())]
    return key


def apply_fixes(q):
    for o in q["options"]:
        if len(o["text"]) == 1 and o["text"].translate(CYR_TO_LAT) != o["text"]:
            o["text"] = o["text"].translate(CYR_TO_LAT)
    for (qid, field), (old, new) in TEXT_FIXES.items():
        if qid != q["id"]:
            continue
        if field == "text":
            target = q
        else:
            kind, num = field.split(":")
            coll = q["options"] if kind == "option" else q["items"]
            target = next(o for o in coll if o["id"] == int(num))
        if old not in target["text"]:
            print(f"WARN: исправление {qid}/{field} не применено: {old!r} не найдено", file=sys.stderr)
            continue
        target["text"] = target["text"].replace(old, new)


def mixed_script_tokens(s):
    return [w for w in re.findall(r"\w+", s)
            if re.search(r"[A-Za-z]", w) and re.search(r"[А-Яа-яЁё]", w)]


def validate(questions, key):
    errors = []
    ids = [q["id"] for q in questions]
    expected = list(range(1, max(ids) + 1))
    if ids != expected:
        errors.append(f"номера вопросов не 1..{max(ids)} подряд: "
                      f"пропущены {sorted(set(expected) - set(ids))}")
    if set(key) != set(ids):
        errors.append(f"ключ не совпадает с вопросами: {sorted(set(key) ^ set(ids))}")
    for q in questions:
        where = f"№{q['id']}"
        if not q["text"]:
            errors.append(f"{where}: пустой текст вопроса")
        opt_ids = [o["id"] for o in q["options"]]
        if len(opt_ids) < 2 or opt_ids != list(range(1, len(opt_ids) + 1)):
            errors.append(f"{where}: варианты {opt_ids}")
        if any(not o["text"] for o in q["options"]):
            errors.append(f"{where}: пустой вариант")
        if q["type"] == "matching":
            item_ids = [i["id"] for i in q["items"]]
            if set(q["correct"]) != {str(i) for i in item_ids}:
                errors.append(f"{where}: ключ {q['correct']} не соответствует пунктам {item_ids}")
            if not set(q["correct"].values()) <= set(opt_ids):
                errors.append(f"{where}: ключ {q['correct']} ссылается на несуществующий вариант")
        elif not set(q["correct"]) <= set(opt_ids):
            errors.append(f"{where}: ключ {q['correct']} вне вариантов {opt_ids}")
        for field, s in [("text", q["text"])] + [(f"option {o['id']}", o["text"]) for o in q["options"]]:
            if mixed_script_tokens(s):
                print(f"WARN: {where} {field}: смешанные алфавиты {mixed_script_tokens(s)}",
                      file=sys.stderr)
    return errors


def main():
    doc = pymupdf.open(PDF_PATH)
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    for old in IMG_DIR.glob("q*.png"):
        old.unlink()

    key_page = find_key_page(doc)
    title, sections, raw_questions = collect_questions(doc, key_page)
    key = parse_key(doc, key_page)

    questions = []
    for rq in raw_questions:
        parsed = parse_question(rq)
        image = render_image(doc, rq, parsed.pop("captions")) if rq["images"] else None
        q = dict(id=rq["id"], section=rq["section"], type=None, text=parsed["text"], image=image)
        if "items" in parsed:
            q["columns"] = parsed["columns"]
            q["items"] = parsed["items"]
        q["options"] = parsed["options"]
        answer = key.get(rq["id"])
        if isinstance(answer, dict):
            q["type"] = "matching"
            q["correct"] = {str(a): b for a, b in answer.items()}
        else:
            q["type"] = "multiple" if answer and len(answer) > 1 else "single"
            q["correct"] = answer or []
        apply_fixes(q)
        questions.append(q)

    errors = validate(questions, key)
    for e in errors:
        print(f"ERROR: {e}", file=sys.stderr)

    out = dict(source=PDF_PATH.name, title=title, sections=sections, questions=questions)
    (OUT_DIR / "questions.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Вопросов: {len(questions)}")
    for s in sections:
        print(f"  {s}: {sum(q['section'] == s for q in questions)}")
    for t in ("single", "multiple", "matching"):
        print(f"  {t}: {sum(q['type'] == t for q in questions)}")
    print(f"  с картинками: {sum(bool(q['image']) for q in questions)}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
