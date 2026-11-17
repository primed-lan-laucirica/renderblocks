#!/usr/bin/env python3
"""
Computes neural embeddings (BAAI/bge-small-en-v1.5, 384-d L2-normalized) over the
harvested video corpus, scores every video against the 4 Reference Seed sets
(Numberblocks, Wonderblocks, Preschool & Primary Prep Math, Homeschool Pop Math),
builds a diversified k-NN similarity graph, writes the bundled Proximal catalog,
and generates the Research Channel & Similarity Report in Drive/Proximal.
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
ROOT = HERE.parent.parent
HARVESTED = HERE / "cache" / "harvested.json"
CATALOG_OUT = ROOT / "packages" / "games" / "proximal" / "src" / "data" / "catalog.json"
DRIVE_DIR = Path("/mnt/d/PrimeDSharedGDrive/RenderBlocks/Proximal")

SEED_ANCHORS = [
    ("numberblocks", "Numberblocks"),
    ("wonderblocks", "Wonderblocks"),
    ("preschool-prep", "Preschool & Primary Prep"),
    ("homeschool-pop", "Homeschool Pop Math"),
]

CONCEPT_LABELS = {
    "counting": "Counting & Numbers",
    "number-sense": "Number Sense & Subitizing",
    "skip-counting": "Skip Counting",
    "addition": "Addition",
    "subtraction": "Subtraction",
    "math-facts": "Math Facts Fluency",
    "place-value": "Place Value & Base 10",
    "multiplication": "Multiplication & Arrays",
    "division": "Division & Sharing",
    "fractions": "Fractions, Decimals & Percent",
    "shapes-geometry": "Shapes & Geometry",
    "measurement-time-money": "Time, Money & Measurement",
    "patterns-coding": "Patterns, Logic & Coding",
    "phonics-reading": "Phonics & Letter Sounds",
    "colours-sorting": "Colours & Sorting",
    "deep-math": "Higher Math & Symbols",
}

GROUP_LABELS = {
    "seed": "Reference Seeds",
    "structured_k5": "Structured K–5 Math",
    "visual_story": "Visual Story & Pattern Math",
    "fluency_songs": "Math Facts & Fluency Songs",
    "learningblocks_siblings": "Learning Blocks Universe",
    "symbols_bridge": "Symbols Deep Dives (Upper Horizon)",
}


def build_embed_text(v: dict) -> str:
    concepts_human = ", ".join(CONCEPT_LABELS.get(c, c) for c in v.get("concepts", []))
    desc = (v.get("description") or "").strip()
    if len(desc) > 280:
        desc = desc[:280]
    stage = v.get("stage", "primary")
    fmt = "compilation" if v.get("format") == "compilation" else "lesson episode"
    return (
        f"{v['title']}. Channel: {v['channel']}. "
        f"Topics: {concepts_human}. Level: {stage} {fmt}. "
        f"{desc}"
    ).strip()


def topk_mean(sim_row: np.ndarray, indices: np.ndarray, k: int = 5) -> float:
    if len(indices) == 0:
        return 0.0
    vals = sim_row[indices]
    if len(vals) <= k:
        return float(np.mean(vals))
    part = np.partition(vals, -k)[-k:]
    return float(np.mean(part))


def main() -> None:
    raw = json.loads(HARVESTED.read_text(encoding="utf-8"))
    videos: list[dict] = raw["videos"]
    n = len(videos)
    print(f"Loaded {n} verified embeddable videos from {HARVESTED}")

    texts = [build_embed_text(v) for v in videos]
    print("Loading SentenceTransformer('BAAI/bge-small-en-v1.5')...")
    model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    emb = model.encode(
        texts,
        batch_size=64,
        show_progress_bar=True,
        normalize_embeddings=True,
    )
    emb = np.asarray(emb, dtype=np.float32)

    # Full pairwise cosine similarity matrix [N, N]
    sim_matrix = emb @ emb.T

    seed_indices_by_anchor: dict[str, np.ndarray] = {}
    all_seed_list: list[int] = []
    for anchor_id, _ in SEED_ANCHORS:
        idxs = [i for i, v in enumerate(videos) if v.get("seedAnchor") == anchor_id]
        seed_indices_by_anchor[anchor_id] = np.array(idxs, dtype=np.int32)
        all_seed_list.extend(idxs)
        print(f"  Seed anchor '{anchor_id}': {len(idxs)} reference videos")
    all_seed_indices = np.array(all_seed_list, dtype=np.int32)

    catalog_items = []
    for i, v in enumerate(videos):
        row = sim_matrix[i].copy()
        row[i] = -1.0  # exclude self

        # Per-anchor top-5 nearest reference similarity
        anchor_scores: dict[str, float] = {}
        for anchor_id, _ in SEED_ANCHORS:
            anchor_scores[anchor_id] = round(topk_mean(row, seed_indices_by_anchor[anchor_id], k=5), 4)

        best_anchor = max(anchor_scores.items(), key=lambda kv: kv[1])[0]
        overall_seed_sim = round(topk_mean(row, all_seed_indices, k=5), 4)

        # Nearest single seed video (excluding self)
        seed_sims = row[all_seed_indices]
        best_seed_pos = int(np.argmax(seed_sims))
        nearest_seed_idx = int(all_seed_indices[best_seed_pos])
        nearest_seed_id = videos[nearest_seed_idx]["id"]

        # Diversified k-NN related videos (up to 8, max 3 from any single channelKey)
        order = np.argsort(-row)
        related_ids: list[str] = []
        ch_counts: dict[str, int] = defaultdict(int)
        for j in order:
            if j == i:
                continue
            cand = videos[int(j)]
            ck = cand["channelKey"]
            if ch_counts[ck] >= 3:
                continue
            ch_counts[ck] += 1
            related_ids.append(cand["id"])
            if len(related_ids) >= 8:
                break

        # Composite quality + reference alignment score in [0..100]
        views = max(1, int(v.get("viewCount") or 0))
        view_norm = min(1.0, math.log10(views + 10) / 7.2)
        seed_bonus = 0.06 if v["role"] == "seed" else 0.0
        comp_penalty = -0.02 if v["format"] == "compilation" else 0.02
        score = round(
            100.0 * (0.68 * overall_seed_sim + 0.22 * view_norm + seed_bonus + comp_penalty),
            1,
        )

        item = {
            "id": v["id"],
            "title": v["title"],
            "channel": v["channel"],
            "channelKey": v["channelKey"],
            "role": v["role"],
            "group": v["group"],
            "seedAnchor": v.get("seedAnchor") or best_anchor,
            "nearestSeedId": nearest_seed_id,
            "seedSim": overall_seed_sim,
            "anchorSims": {
                "nb": round(anchor_scores["numberblocks"], 3),
                "wb": round(anchor_scores["wonderblocks"], 3),
                "pp": round(anchor_scores["preschool-prep"], 3),
                "hp": round(anchor_scores["homeschool-pop"], 3),
            },
            "score": score,
            "duration": int(v["duration"]),
            "format": v["format"],
            "stage": v["stage"],
            "concepts": v["concepts"],
            "needs": v.get("needs", []),
            "views": views,
            "related": related_ids,
        }
        if v.get("start") is not None:
            item["start"] = int(v["start"])
        if v.get("end") is not None:
            item["end"] = int(v["end"])
        if v.get("symbolsRanks"):
            item["symbolsRanks"] = v["symbolsRanks"]
        desc = (v.get("description") or "").strip()
        if desc:
            item["summary"] = desc[:220]
        catalog_items.append(item)

    # Sort best-scored first
    catalog_items.sort(key=lambda x: (-x["score"], -x["seedSim"]))

    CATALOG_OUT.parent.mkdir(parents=True, exist_ok=True)
    catalog_payload = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "model": "BAAI/bge-small-en-v1.5",
        "totalVideos": len(catalog_items),
        "seedCount": sum(1 for x in catalog_items if x["role"] == "seed"),
        "candidateCount": sum(1 for x in catalog_items if x["role"] == "candidate"),
        "videos": catalog_items,
    }
    CATALOG_OUT.write_text(json.dumps(catalog_payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {CATALOG_OUT} ({CATALOG_OUT.stat().st_size / 1024:.1f} KB, {len(catalog_items)} videos)")

    # Write Research Artifacts to Drive/Proximal if mounted
    if DRIVE_DIR.exists():
        id_to_item = {x["id"]: x for x in catalog_items}
        by_channel: dict[str, list[dict]] = defaultdict(list)
        for x in catalog_items:
            by_channel[x["channelKey"]].append(x)

        lines = [
            "# Proximal Channel Set & Similarity Reference Corpus (Nov 17 2026)",
            "",
            f"- **Total verified embeddable videos**: **{len(catalog_items)}** "
            f"(**{catalog_payload['seedCount']}** seed reference videos across 4 anchors + "
            f"**{catalog_payload['candidateCount']}** candidate videos across 18 expansion sources)",
            "- **Embedding model**: `BAAI/bge-small-en-v1.5` (384-d L2-normalized vectors)",
            "- **Format rule**: Standalone lessons + full compilations included; YouTube Shorts (<60s), promos, non-embeddable videos, and off-topic uploads excluded.",
            "",
            "## 1. Channel Inventory & Seed-Similarity Alignment",
            "",
            "| Channel | Role | Group | Videos (Ep / Comp) | Mean Seed Sim | Closest Seed Anchor |",
            "|---|---|---|---:|---:|---|",
        ]
        for ck, items in sorted(by_channel.items(), key=lambda kv: (0 if kv[1][0]["role"] == "seed" else 1, -np.mean([z["seedSim"] for z in kv[1]]))):
            ep = sum(1 for z in items if z["format"] == "episode")
            comp = sum(1 for z in items if z["format"] == "compilation")
            mean_sim = float(np.mean([z["seedSim"] for z in items]))
            top_anchor = Counter(z["seedAnchor"] for z in items).most_common(1)[0][0]
            lines.append(
                f"| {items[0]['channel']} (`{ck}`) | {items[0]['role']} | {GROUP_LABELS.get(items[0]['group'], items[0]['group'])} "
                f"| {len(items)} ({ep} / {comp}) | {mean_sim:.3f} | `{top_anchor}` |"
            )

        lines += [
            "",
            "## 2. Concept Coverage Across Corpus",
            "",
            "| Concept | Videos | Seed Videos | Candidate Videos |",
            "|---|---:|---:|---:|",
        ]
        for cid, clabel in CONCEPT_LABELS.items():
            c_all = [x for x in catalog_items if cid in x["concepts"]]
            c_seed = sum(1 for x in c_all if x["role"] == "seed")
            lines.append(f"| {clabel} (`{cid}`) | {len(c_all)} | {c_seed} | {len(c_all) - c_seed} |")

        lines += [
            "",
            "## 3. Top 30 Non-Seed Candidate Videos by Reference Similarity",
            "",
            "| Sim | Candidate Video | Channel | Matched Anchor | Nearest Seed Video |",
            "|---:|---|---|---|---|",
        ]
        top_cands = sorted([x for x in catalog_items if x["role"] == "candidate"], key=lambda x: -x["seedSim"])[:30]
        for x in top_cands:
            seed_ref = id_to_item.get(x["nearestSeedId"])
            seed_title = f"{seed_ref['title']} ({seed_ref['channel']})" if seed_ref else x["nearestSeedId"]
            lines.append(
                f"| {x['seedSim']:.3f} | [{x['title']}](https://www.youtube.com/watch?v={x['id']}) | {x['channel']} | `{x['seedAnchor']}` | {seed_title} |"
            )

        report_path = DRIVE_DIR / "Proximal-channel-corpus-v1.md"
        report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        json_export = DRIVE_DIR / "proximal-reference-catalog.json"
        json_export.write_text(json.dumps(catalog_payload, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote Drive research report: {report_path}")
        print(f"Wrote Drive catalog export: {json_export}")


if __name__ == "__main__":
    main()
