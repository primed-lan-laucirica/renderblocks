#!/usr/bin/env python3
"""
Proximal Master Corpus Embedder & Report Generator

Reads `tools/proximal/cache/master-harvested.json`, encodes all verified videos
with `BAAI/bge-small-en-v1.5` (384-D L2-normalized), computes:
  1. Full 384-D normalized embeddings (`master-embeddings.npz`, float16 + SVD 64-D basis + int8 projections)
  2. Diversified 10-NN semantic similarity graph across channels & subjects
  3. Clean `master-corpus.json` (in local cache & Drive `RenderBlocks/Proximal/proximal-master-corpus.json`)
  4. Coverage matrix report `RenderBlocks/Proximal/Proximal-corpus-v2.md` (Subject x Level Band, Concepts, Channels)
"""
from __future__ import annotations

import json
import math
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

HERE = Path(__file__).resolve().parent
CACHE_DIR = HERE / "cache"
HARVESTED = CACHE_DIR / "master-harvested.json"
CORPUS_OUT = CACHE_DIR / "master-corpus.json"
EMB_OUT = CACHE_DIR / "master-embeddings.npz"
DRIVE_DIR = Path("/mnt/d/PrimeDSharedGDrive/RenderBlocks/Proximal")

VEC_DIM_COMPACT = 64

SUBJECT_LABELS = {
    "math": "Mathematics",
    "ela": "Reading, Phonics & Language",
    "science": "Science & Engineering",
    "cs-logic": "Logic, Coding & AI",
    "world-history": "World, Geography & History",
    "arts-music": "Art, Color & Music",
}

LEVEL_BANDS = [
    ("prek", "Preschool (PreK)"),
    ("k_2", "Early Primary (K–2)"),
    ("g3_5", "Upper Elementary (3–5)"),
    ("g6_8", "Middle School (6–8)"),
    ("hs", "High School (9–12)"),
    ("university", "University & Frontier"),
]

BAND_LABELS = dict(LEVEL_BANDS)


def build_embed_text(v: dict) -> str:
    subjects_str = ", ".join(SUBJECT_LABELS.get(s, s) for s in v.get("subjects", []))
    concepts_str = ", ".join(v.get("concepts", []))
    band = BAND_LABELS.get(v.get("levelBand", "k_2"), v.get("levelBand", ""))
    desc = (v.get("description") or "").strip()
    if len(desc) > 280:
        desc = desc[:280]
    fmt = "compilation" if v.get("format") == "compilation" else "lesson"
    return (
        f"{v['title']}. Channel: {v['channel']}. "
        f"Subject: {subjects_str}. Concepts: {concepts_str}. "
        f"Level: {band} ({fmt}). {desc}"
    ).strip()


def quantize_int8(mat: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1.0, norms)
    unit = mat / norms
    return np.clip(np.round(unit * 127.0), -127, 127).astype(np.int8)


def main() -> None:
    raw = json.loads(HARVESTED.read_text(encoding="utf-8"))
    videos: list[dict] = raw["videos"]
    n = len(videos)
    print(f"Loaded {n} verified videos from {HARVESTED}")

    texts = [build_embed_text(v) for v in videos]
    print("Loading SentenceTransformer('BAAI/bge-small-en-v1.5')...")
    model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    emb = np.asarray(
        model.encode(texts, batch_size=64, show_progress_bar=True, normalize_embeddings=True),
        dtype=np.float32,
    )

    # Compute 64-D SVD basis on centered embeddings (saved so incremental additions project identically)
    mean_vec = np.mean(emb, axis=0, keepdims=True)
    centered = emb - mean_vec
    _, _, vt = np.linalg.svd(centered, full_matrices=False)
    basis = vt[:VEC_DIM_COMPACT].T.astype(np.float32)  # [384, 64]
    proj_64 = (centered @ basis).astype(np.float32)

    # Compute diversified 10-NN related IDs in chunks to stay memory-efficient even at 10k+ videos
    print("Computing diversified 10-NN semantic neighbor graph...")
    chunk = 512
    related_all: list[list[str]] = [[] for _ in range(n)]
    ids_list = [v["id"] for v in videos]
    ch_keys = [v["channelKey"] for v in videos]

    for start in range(0, n, chunk):
        end = min(n, start + chunk)
        sims = emb[start:end] @ emb.T  # [chunk, N]
        top_k = min(60, n)
        part_idx = np.argpartition(-sims, top_k - 1, axis=1)[:, :top_k]
        for local_i in range(end - start):
            global_i = start + local_i
            cands = part_idx[local_i]
            cands = cands[np.argsort(-sims[local_i, cands])]
            rel: list[str] = []
            ch_counts: dict[str, int] = defaultdict(int)
            for j in cands:
                j_int = int(j)
                if j_int == global_i:
                    continue
                ck = ch_keys[j_int]
                if ch_counts[ck] >= 2:
                    continue
                ch_counts[ck] += 1
                rel.append(ids_list[j_int])
                if len(rel) >= 10:
                    break
            related_all[global_i] = rel

    # Build clean corpus entries
    corpus_videos: list[dict] = []
    for i, v in enumerate(videos):
        views = max(1, int(v.get("viewCount") or 0))
        entry = {
            "id": v["id"],
            "title": v["title"],
            "channel": v["channel"],
            "channelKey": v["channelKey"],
            "role": v.get("role", "curated"),
            "subjects": v["subjects"],
            "primarySubject": v["subjects"][0] if v.get("subjects") else "math",
            "concepts": v["concepts"],
            "needs": v.get("needs", []),
            "levelBand": v["levelBand"],
            "duration": int(v["duration"]),
            "format": v.get("format", "episode"),
            "views": views,
            "related": related_all[i],
            "firstSeenAt": v.get("firstSeenAt"),
        }
        if v.get("seasonal"):
            entry["seasonal"] = True
        if v.get("start") is not None:
            entry["start"] = int(v["start"])
        if v.get("end") is not None:
            entry["end"] = int(v["end"])
        if v.get("symbolsRanks"):
            entry["symbolsRanks"] = v["symbolsRanks"]
        if v.get("curatedSource"):
            entry["curatedSource"] = v["curatedSource"]
        desc = (v.get("description") or "").strip()
        if desc:
            entry["summary"] = desc[:220]
        corpus_videos.append(entry)

    # Sort deterministically by primarySubject, levelBand order, then popularity
    band_rank = {b[0]: idx for idx, b in enumerate(LEVEL_BANDS)}
    order = sorted(
        range(n),
        key=lambda i: (
            corpus_videos[i]["primarySubject"],
            band_rank.get(corpus_videos[i]["levelBand"], 99),
            0 if corpus_videos[i]["format"] == "episode" else 1,
            -corpus_videos[i]["views"],
        ),
    )

    sorted_videos = [corpus_videos[i] for i in order]
    sorted_ids = np.array([v["id"] for v in sorted_videos], dtype="<U16")
    sorted_emb_f16 = emb[order].astype(np.float16)
    sorted_proj_int8 = quantize_int8(proj_64[order])

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Summary stats
    by_subject = Counter(v["primarySubject"] for v in sorted_videos)
    by_band = Counter(v["levelBand"] for v in sorted_videos)
    by_channel = Counter(v["channelKey"] for v in sorted_videos)
    by_concept = Counter(c for v in sorted_videos for c in v["concepts"])

    payload = {
        "schemaVersion": 2,
        "generatedAt": now_iso,
        "embeddingModel": "BAAI/bge-small-en-v1.5",
        "embeddingDim": 384,
        "compactDim": VEC_DIM_COMPACT,
        "totalVideos": len(sorted_videos),
        "totalChannels": len(by_channel),
        "countsBySubject": dict(by_subject),
        "countsByLevelBand": dict(by_band),
        "videos": sorted_videos,
    }

    CORPUS_OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    np.savez_compressed(
        EMB_OUT,
        ids=sorted_ids,
        embeddings_384=sorted_emb_f16,
        embeddings_64_int8=sorted_proj_int8,
        svd_mean=mean_vec.squeeze(0).astype(np.float32),
        svd_basis=basis,
    )
    print(f"Wrote {CORPUS_OUT} ({CORPUS_OUT.stat().st_size / (1024*1024):.2f} MB, {len(sorted_videos)} videos)")
    print(f"Wrote {EMB_OUT} ({EMB_OUT.stat().st_size / (1024*1024):.2f} MB)")

    # Write Drive export + markdown coverage report
    if DRIVE_DIR.exists():
        drive_json = DRIVE_DIR / "proximal-master-corpus.json"
        drive_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        # Subject x LevelBand cross-tab
        cross: dict[tuple[str, str], int] = Counter(
            (v["primarySubject"], v["levelBand"]) for v in sorted_videos
        )

        lines = [
            f"# Proximal Master Video Corpus v2 ({now_iso[:10]})",
            "",
            "Uncapped, multi-subject educational YouTube pool spanning **Preschool (PreK) through University & Frontier** — ready for the Proximal frontier-curation algorithm.",
            "",
            f"- **Total verified embeddable videos:** **{len(sorted_videos):,}** across **{len(by_channel)}** curated sources",
            f"- **Standalone lessons vs compilations:** **{sum(1 for v in sorted_videos if v['format']=='episode'):,}** lessons · **{sum(1 for v in sorted_videos if v['format']=='compilation'):,}** compilations/packs",
            "- **Embeddings:** `BAAI/bge-small-en-v1.5` (384-D normalized `float16` + 64-D SVD `int8` basis saved in `tools/proximal/cache/master-embeddings.npz`)",
            "- **Verification:** YouTube `oEmbed` verified, Shorts (`<60s`), promos, non-English duplicates, and author impersonators removed.",
            "",
            "## 1. Coverage Matrix — Primary Subject × Level Band",
            "",
            "| Subject | PreK | K–2 | Grades 3–5 | Grades 6–8 | High School | University / Frontier | Total |",
            "|---|---:|---:|---:|---:|---:|---:|---:|",
        ]
        for sid, slabel in SUBJECT_LABELS.items():
            row_vals = [cross[(sid, b)] for b, _ in LEVEL_BANDS]
            lines.append(
                f"| {slabel} (`{sid}`) | "
                + " | ".join(f"{x:,}" for x in row_vals)
                + f" | **{sum(row_vals):,}** |"
            )
        col_totals = [by_band[b] for b, _ in LEVEL_BANDS]
        lines.append(
            "| **Total** | "
            + " | ".join(f"**{x:,}**" for x in col_totals)
            + f" | **{len(sorted_videos):,}** |"
        )

        lines += [
            "",
            "## 2. Concept Coverage (Multi-Label)",
            "",
            "| Concept ID | Videos | PreK–G2 | G3–G8 | HS–University |",
            "|---|---:|---:|---:|---:|",
        ]
        for cid, cnt in by_concept.most_common():
            early = sum(1 for v in sorted_videos if cid in v["concepts"] and v["levelBand"] in ("prek", "k_2"))
            mid = sum(1 for v in sorted_videos if cid in v["concepts"] and v["levelBand"] in ("g3_5", "g6_8"))
            high = sum(1 for v in sorted_videos if cid in v["concepts"] and v["levelBand"] in ("hs", "university"))
            lines.append(f"| `{cid}` | {cnt:,} | {early:,} | {mid:,} | {high:,} |")

        lines += [
            "",
            "## 3. Channel Inventory",
            "",
            "| Channel (`channelKey`) | Primary Subject | Videos | Level Bands Covered |",
            "|---|---|---:|---|",
        ]
        ch_videos: dict[str, list[dict]] = defaultdict(list)
        for v in sorted_videos:
            ch_videos[v["channelKey"]].append(v)
        for ck, items in sorted(ch_videos.items(), key=lambda kv: -len(kv[1])):
            bands_present = [b for b, _ in LEVEL_BANDS if any(x["levelBand"] == b for x in items)]
            ch_name = items[0]["channel"] if ck not in ("symbols-dives", "great-stories-curated") else ck
            top_subj = Counter(x["primarySubject"] for x in items).most_common(1)[0][0]
            lines.append(
                f"| {ch_name} (`{ck}`) | `{top_subj}` | {len(items):,} | {', '.join(bands_present)} |"
            )

        drive_md = DRIVE_DIR / "Proximal-corpus-v2.md"
        drive_md.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"Wrote Drive JSON: {drive_json} ({drive_json.stat().st_size / (1024*1024):.2f} MB)")
        print(f"Wrote Drive report: {drive_md}")


if __name__ == "__main__":
    main()
