import argparse
import hashlib
import json
import os
import pathlib
import time
from datetime import timedelta

import openai
from dotenv import find_dotenv, load_dotenv
from tqdm import tqdm

from . import llm
from .langs import SUPPORTED_LANGS


def locale_dir(*, trans_dir, lang) -> pathlib.Path:
    return trans_dir / lang


def translation_path(*, trans_dir, lang, ns):
    return locale_dir(trans_dir=trans_dir, lang=lang) / f"{ns}.json"


def load_translations(*, trans_dir, lang, ns):
    path = translation_path(trans_dir=trans_dir, lang=lang, ns=ns)
    try:
        with open(path, "r", encoding="utf8") as h:
            return json.load(h)
    except FileNotFoundError:
        return {}


def write_translations(*, trans_dir, lang, ns, translations):
    d = locale_dir(trans_dir=trans_dir, lang=lang)
    if not d.exists():
        d.mkdir(parents=True, exist_ok=True)

    with open(
        translation_path(
            trans_dir=trans_dir,
            lang=lang,
            ns=ns,
        ),
        "w",
        encoding="utf8",
    ) as h:
        json.dump(translations, h, ensure_ascii=False, indent=2)


def load_source(source_trans):
    with open(source_trans, "r", encoding="utf8") as h:
        source = json.load(h)
    return source


def h(text):
    return hashlib.sha1(text.encode()).hexdigest()


def source_entries(dir):
    for file in dir.glob("*.json"):
        yield file


def main() -> None:
    parser = argparse.ArgumentParser(description="Translate text")
    parser.add_argument(
        "--trans-dir",
        type=pathlib.Path,
        required=True,
        help="Directory for translation output",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="gpt-4.1-nano-2025-04-14",
        help="LLM model to use for translation",
    )

    args = parser.parse_args()

    trans_dir = args.trans_dir
    cache_file = trans_dir / "cache.json"
    if cache_file.exists():
        cache = json.load(open(cache_file, "r"))
    else:
        cache = {}

    def sync_cache():
        with open(cache_file, "w") as h:
            json.dump(cache, h, indent=2)

    load_dotenv(dotenv_path=find_dotenv(usecwd=True))
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set in .env")

    client = llm.Client(
        openai_client=openai.OpenAI(api_key=api_key),
        model=args.model,
    )

    total_entries = 0
    num_trans_langs = len(SUPPORTED_LANGS)
    for source in source_entries(trans_dir / "main"):
        entries = load_source(source)
        total_entries += len(entries)
    total_translations = total_entries * num_trans_langs

    primary_lang: str | None = cache.get("lang")

    source = next(source_entries(trans_dir / "main"))
    if not primary_lang:
        sample = "\n".join(list(entries.values())[:10][:500])
        primary_lang = llm.detect_lang(client=client, text=sample)
        assert primary_lang, "Failed to detect primary language"
        tqdm.write(f"Detected language: {primary_lang}")
        cache["lang"] = primary_lang
        sync_cache()

    if primary_lang in SUPPORTED_LANGS:
        total_translations -= total_entries

    processed = 0
    start_time = time.time()
    with tqdm(
        total=total_translations,
        ncols=80,
        dynamic_ncols=True,
        desc="Translating",
        unit="entry",
    ) as pbar:
        for source in source_entries(trans_dir / "main"):
            ns = source.stem
            entries = load_source(source)

            write_translations(
                trans_dir=trans_dir,
                lang=primary_lang,
                ns=ns,
                translations=entries,
            )

            for lang_code, lang_name in SUPPORTED_LANGS.items():
                if lang_code == primary_lang:
                    tqdm.write(
                        f"Skipping translation for primary language: {lang_name} ({lang_code})"
                    )
                    continue

                # These will be saved to the locale file
                ns_translations = load_translations(
                    trans_dir=trans_dir,
                    lang=lang_code,
                    ns=ns,
                )
                cache_entries = cache.setdefault("entries", {})
                tqdm.write(f"Translating to {lang_name} ({lang_code})...")

                for key, to_translate in entries.items():
                    cur_translation = ns_translations.get(key)
                    cache_entry = cache_entries.setdefault(key, {})

                    input_hash = h(to_translate)

                    langs_hashes = cache_entry.setdefault("hashes", {})
                    lang_hashes = langs_hashes.setdefault(lang_code, {})

                    in_hash = lang_hashes.get("input")
                    out_hash = lang_hashes.get("output")

                    if not cur_translation:
                        needs_translation = True
                    else:
                        in_matches = in_hash == input_hash
                        out_matches = out_hash == h(cur_translation)
                        hashes_match = in_matches and out_matches
                        needs_translation = not hashes_match

                    if needs_translation:
                        try:
                            time.sleep(0.5)
                            updated_translation = llm.translate(
                                client=client,
                                dest_code=lang_code,
                                to_translate=to_translate,
                            )
                            assert updated_translation, "Translation failed"

                        except KeyboardInterrupt:
                            tqdm.write("Translation interrupted by user, quitting")
                            exit()

                        except:  # noqa
                            tqdm.write(
                                f"    Failed to translate `{key}`, using english"
                            )
                            updated_translation = to_translate
                        else:
                            tqdm.write(
                                f'    Translated `{key}` to "{updated_translation}"'
                            )

                        out_hash = h(updated_translation)
                        lang_hashes["output"] = out_hash
                        lang_hashes["input"] = input_hash
                    else:
                        updated_translation = cur_translation

                    ns_translations[key] = updated_translation

                    write_translations(
                        trans_dir=trans_dir,
                        lang=lang_code,
                        ns=ns,
                        translations=ns_translations,
                    )
                    sync_cache()
                    processed += 1

                    # Progress bar update and ETA
                    elapsed = time.time() - start_time
                    if processed > 0:
                        rate = elapsed / processed
                        remaining = total_translations - processed
                        eta = timedelta(seconds=int(rate * remaining))
                        pbar.set_postfix({"ETA": str(eta)})
                    pbar.update(1)


if __name__ == "__main__":
    main()
