from dataclasses import dataclass

import openai

from . import parser
from .langs import SUPPORTED_LANGS


@dataclass
class Client:
    openai_client: openai.OpenAI
    model: str = "gpt-4o"


def complete(
    *,
    client: Client,
    prompt: str,
):
    response = client.openai_client.chat.completions.create(
        model=client.model,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
    )
    resp = response.choices[0].message.content or ""
    return resp


def translate(
    *,
    client: Client,
    dest_code: str,
    to_translate: str,
    desc: str | None = None,
):
    dest_lang = SUPPORTED_LANGS[dest_code]
    if desc:
        context = f"<context>{desc}</context>"
    else:
        context = ""

    prompt = f"""
Translate the text in the <text>...</text> tag below from \
English to {dest_lang} ({dest_code}):

<translate>
    {context}
    <text>{to_translate}</text>
</translate>

* Try to preserve the original meaning and intent of the text.
* If emojis exist in the text, try to keep them in the translation.
* Preserve all numeric tags, like <1>, <2>, etc. \
These are i18next html placeholders.
* Do not translate text inside of double curly brace templates: {{{{...}}}}. \
These are i18next template placeholders and we need to leave them as-is.
* Do not translate the context, only the contents of <text>...</text>.

Format your response as the following XML document:

<translated>
    <text>...</text>
</translated>
""".strip()

    resp = complete(client=client, prompt=prompt)
    resp = parser.escape_placeholder_tags(resp)
    doc = parser.find_and_parse_xml(resp, root_tag="translated")

    text = doc.find("text")
    if text is not None:
        translated = parser.render_inner(text)
        translated = parser.unescape_placeholder_tags(translated)
        return translated.strip()
    return None


def detect_lang(*, client: Client, text: str) -> str | None:
    prompt = f"""
You are a language detection model. Given the text below, determine the ISO 639
language code (like 'en', 'fr', 'es', etc.) of the text:

<detect>
{text}
</detect>

Format your response as the following XML document:
<detected>
    <lang>...</lang>
</detected>
""".strip()

    resp = complete(client=client, prompt=prompt)
    doc = parser.find_and_parse_xml(resp, root_tag="detected")

    lang = doc.find("lang")
    if lang is not None:
        detected = parser.render_inner(lang)
        detected = parser.unescape_placeholder_tags(detected)
        return detected.strip().lower()
    return None
