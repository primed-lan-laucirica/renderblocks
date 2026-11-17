#!/usr/bin/env python3
"""
Proximal v1.108.0 Embedding, Vector Quantization & Seed-Similarity Scorer:
- Encodes every verified video with BAAI/bge-small-en-v1.5 (384-d L2-normalized)
- Scores against the 4 Reference Seed sets (Numberblocks, Wonderblocks, Preschool Prep, Homeschool Pop)
- Projects embeddings + 80 search query prototypes onto a 64-D SVD subspace, quantized to int8 (base64)
  for sub-millisecond on-device semantic vector search & multi-video taste centroids
- Builds a diversified 8-NN similarity graph
- Writes packages/games/proximal/src/data/catalog.json & Drive research reports
"""
from __future__ import annotations

import base64
import json
import math
import re
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

VEC_DIM = 64

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

# Semantic query vocabulary mapped into the same 64-D vector space for offline semantic search
QUERY_PROTOTYPES = {
    "counting": "counting numbers 1 to 10 1 to 20 1 to 100 for kids",
    "numbers": "meet the numbers number sense numeracy blocks",
    "zero": "zero nothing empty set counting zero",
    "subitize": "subitizing ten frames number bonds quick recognition",
    "bonds": "number bonds part part whole making ten",
    "addition": "addition adding numbers plus sums putting together",
    "doubles": "adding doubles near doubles mental math",
    "subtraction": "subtraction taking away minus difference regrouping",
    "facts": "math facts drills flashcards fluency addition subtraction multiplication division",
    "skip": "skip counting by 2s 3s 4s 5s 10s song",
    "place": "place value ones tens hundreds thousands base ten",
    "teens": "teen numbers 11 12 13 14 15 16 17 18 19 twenty",
    "roman": "roman numerals I V X L C",
    "even": "even and odd numbers parity",
    "compare": "comparing numbers greater than less than equal to alligator",
    "multiply": "multiplication times tables equal groups repeated addition arrays",
    "squares": "square numbers 4 9 16 25 36 cubes",
    "divide": "division sharing equally quotient remainder long division",
    "fractions": "fractions halves thirds fourths quarters numerator denominator parts of a whole",
    "decimals": "decimals tenths hundredths decimal point percentages",
    "percent": "percentages ratios proportions",
    "shapes": "2D and 3D shapes circle square triangle rectangle hexagon cube sphere cylinder",
    "geometry": "geometry angles lines symmetry perimeter area volumepolygons",
    "time": "telling time analog digital clock hours minutes",
    "money": "counting money coins pennies nickels dimes quarters dollars",
    "measure": "measurement length inches centimeters weight capacity ruler",
    "graphs": "bar graphs tally marks pictographs data tables",
    "patterns": "patterns sequences what comes next repeating growing patterns",
    "coding": "coding for kids loops sequences algorithms debugging Wonderblocks Go and Stop",
    "logic": "logic puzzles problem solving critical thinking riddles",
    "sorting": "sorting classifying matching by color size shape",
    "colours": "learning colors primary secondary mixing rainbow Colourblocks",
    "phonics": "phonics letter sounds blending reading spelling Alphablocks",
    "singapore": "Singapore math bar model concrete pictorial abstract",
    "algebra": "algebra variables equations unknowns functions polynomials",
    "calculus": "calculus limits derivatives integrals rate of change",
    "vectors": "vectors matrices linear transformations dot cross product",
    "probability": "probability statistics expected value normal distribution Bayes",
    "proof": "mathematical proof logic set theory infinity",
    "preschool": "preschool toddler early math counting shapes gentle",
    "kindergarten": "kindergarten math counting addition subtraction number sense",
    "elementary": "elementary primary school math lesson 1st 2nd 3rd 4th grade",
}

SEASONAL_RE = re.compile(
    r"\b(halloween|spooky|trick or treat|christmas|santa|festive|easter|valentine|back to school|summer vacation)\b",
    re.I,
)


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


def quantize_int8_b64(vec_matrix: np.ndarray) -> str:
    """L2-normalizes rows and encodes as int8 [-127..127] base64."""
    norms = np.linalg.norm(vec_matrix, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1.0, norms)
    unit = vec_matrix / norms
    q = np.clip(np.round(unit * 127.0), -127, 127).astype(np.int8)
    return base64.b64encode(q.tobytes()).decode("ascii")


def main() -> None:
    raw = json.loads(HARVESTED.read_text(encoding="utf-8"))
    videos: list[dict] = raw["videos"]
    n = len(videos)
    print(f"Loaded {n} verified embeddable videos from {HARVESTED}")

    texts = [build_embed_text(v) for v in videos]
    proto_keys = sorted(QUERY_PROTOTYPES.keys())
    proto_texts = [QUERY_PROTOTYPES[k] for k in proto_keys]

    print("Loading SentenceTransformer('BAAI/bge-small-en-v1.5')...")
    model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    emb = np.asarray(
        model.encode(texts, batch_size=64, show_progress_bar=True, normalize_embeddings=True),
        dtype=np.float32,
    )
    proto_emb = np.asarray(
        model.encode(proto_texts, batch_size=64, show_progress_bar=False, normalize_embeddings=True),
        dtype=np.float32,
    )

    # Compute 64-D SVD basis on centered video embeddings so on-device cosine preserves neighborhood geometry
    mean_vec = np.mean(emb, axis=0, keepdims=True)
    centered = emb - mean_vec
    _, _, vt = np.linalg.svd(centered, full_matrices=False)
    basis = vt[:VEC_DIM].T  # [384, 64]

    proj_videos = (emb - mean_vec) @ basis  # [N, 64]
    proj_protos = (proto_emb - mean_vec) @ basis  # [P, 64]

    # Full 384-D pairwise cosine similarity matrix [N, N] for ground-truth seed scores & k-NN
    sim_matrix = emb @ emb.T

    seed_indices_by_anchor: dict[str, np.ndarray] = {}
    all_seed_list: list[int] = []
    for anchor_id, _ in SEED_ANCHORS:
        idxs = [i for i, v in enumerate(videos) if v.get("seedAnchor") == anchor_id]
        seed_indices_by_anchor[anchor_id] = np.array(idxs, dtype=np.int32)
        all_seed_list.extend(idxs)
        print(f"  Seed anchor '{anchor_id}': {len(idxs)} reference videos")
    all_seed_indices = np.array(all_seed_list, dtype=np.int32)

    # Track original index along with each item so we sort proj_videos in matching order
    indexed_items = []
    for i, v in enumerate(videos):
        row = sim_matrix[i].copy()
        row[i] = -1.0

        anchor_scores: dict[str, float] = {}
        for anchor_id, _ in SEED_ANCHORS:
            anchor_scores[anchor_id] = round(topk_mean(row, seed_indices_by_anchor[anchor_id], k=5), 4)

        best_anchor = max(anchor_scores.items(), key=lambda kv: kv[1])[0]
        overall_seed_sim = round(topk_mean(row, all_seed_indices, k=5), 4)

        seed_sims = row[all_seed_indices]
        best_seed_pos = int(np.argmax(seed_sims))
        nearest_seed_idx = int(all_seed_indices[best_seed_pos])
        nearest_seed_id = videos[nearest_seed_idx]["id"]

        # Diversified 8-NN related videos (max 2 from any single channelKey so related row bridges channels!)
        order = np.argsort(-row)
        related_ids: list[str] = []
        ch_counts: dict[str, int] = defaultdict(int)
        for j in order:
            if j == i:
                continue
            cand = videos[int(j)]
            ck = cand["channelKey"]
            if ch_counts[ck] >= 2:
                continue
            ch_counts[ck] += 1
            related_ids.append(cand["id"])
            if len(related_ids) >= 8:
                break

        views = max(1, int(v.get("viewCount") or 0))
        view_norm = min(1.0, math.log10(views + 10) / 7.2)
        seed_bonus = 0.05 if v["role"] == "seed" else 0.0
        # Prefer crisp standalone concept episodes over marathon compilations & seasonal party mixes
        format_adj = 0.045 if v["format"] == "episode" else -0.04
        seasonal_adj = -0.06 if SEASONAL_RE.search(v["title"]) else 0.0
        score = round(
            100.0 * (0.66 * overall_seed_sim + 0.22 * view_norm + seed_bonus + format_adj + seasonal_adj),
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
        if SEASONAL_RE.search(v["title"]):
            item["seasonal"] = True
        if v.get("start") is not None:
            item["start"] = int(v["start"])
        if v.get("end") is not None:
            item["end"] = int(v["end"])
        if v.get("symbolsRanks"):
            item["symbolsRanks"] = v["symbolsRanks"]
        desc = (v.get("description") or "").strip()
        if desc:
            item["summary"] = desc[:200]
        indexed_items.append((i, item))

    indexed_items.sort(key=lambda pair: (-pair[1]["score"], -pair[1]["seedSim"]))
    sorted_indices = [pair[0] for pair in indexed_items]
    catalog_items = [pair[1] for pair in indexed_items]
    sorted_proj_videos = proj_videos[sorted_indices]

    vectors_b64 = quantize_int8_b64(sorted_proj_videos)
    proto_map = {}
    for idx_p, key in enumerate(proto_keys):
        proto_map[key] = quantize_int8_b64(proj_protos[idx_p : idx_p + 1])

    CATALOG_OUT.parent.mkdir(parents=True, exist_ok=True)
    catalog_payload = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "model": "BAAI/bge-small-en-v1.5",
        "vecDim": VEC_DIM,
        "vectorsB64": vectors_b64,
        "queryProtos": proto_map,
        "totalVideos": len(catalog_items),
        "seedCount": sum(1 for x in catalog_items if x["role"] == "seed"),
        "candidateCount": sum(1 for x in catalog_items if x["role"] == "candidate"),
        "videos": catalog_items,
    }
    CATALOG_OUT.write_text(json.dumps(catalog_payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {CATALOG_OUT} ({CATALOG_OUT.stat().st_size / 1024:.1f} KB, {len(catalog_items)} videos, {VEC_DIM}-D vectors included)")

    if DRIVE_DIR.exists():
        id_to_item = {x["id"]: x for x in catalog_items}
        by_channel: dict[str, list[dict]] = defaultdict(list)
        for x in catalog_items:
            by_channel[x["channelKey"]].append(x)

        lines = [
            "# Proximal MVP Channel Set, Similarity Corpus & Frontier Map (v1.108.0 — Nov 17 2026)",
            "",
            f"- **Total verified embeddable videos**: **{len(catalog_items)}** "
            f"(**{catalog_payload['seedCount']}** seed reference videos across 4 anchors + "
            f"**{catalog_payload['candidateCount']}** candidate videos across 18 expansion sources)",
            f"- **Embedding & on-device vector index**: `BAAI/bge-small-en-v1.5` (384-d offline → `{VEC_DIM}`-d int8 SVD subspace bundled on-device for instant semantic search & personal taste centroids)",
            "- **Format rule**: Standalone lessons prioritized in Frontier/Explore; full compilations/packs included and filterable; YouTube Shorts (<60s), promos, non-embeddable videos, and off-topic uploads excluded.",
            "",
            "## 1. Channel Inventory & Seed-Similarity Alignment",
            "",
            "| Channel Collection | Role | Group | Videos (Ep / Pack) | Mean Seed Sim | Closest Seed Anchor |",
            "|---|---|---|---:|---:|---|",
        ]
        for ck, items in sorted(by_channel.items(), key=lambda kv: (0 if kv[1][0]["role"] == "seed" else 1, -np.mean([z["seedSim"] for z in kv[1]]))):
            ep = sum(1 for z in items if z["format"] == "episode")
            comp = sum(1 for z in items if z["format"] == "compilation")
            mean_sim = float(np.mean([z["seedSim"] for z in items]))
            top_anchor = Counter(z["seedAnchor"] for z in items).most_common(1)[0][0]
            ch_display = "Symbols Deep Dives (3Blue1Brown, Mathologer, etc.)" if ck == "symbols-dives" else items[0]["channel"]
            lines.append(
                f"| {ch_display} (`{ck}`) | {items[0]['role']} | {GROUP_LABELS.get(items[0]['group'], items[0]['group'])} "
                f"| {len(items)} ({ep} / {comp}) | {mean_sim:.3f} | `{top_anchor}` |"
            )

        lines += [
            "",
            "## 2. Concept Coverage Across Corpus",
            "",
            "| Concept | Videos | Standalone Episodes | Compilations | Seed Videos | Candidate Videos |",
            "|---|---:|---:|---:|---:|---:|",
        ]
        for cid, clabel in CONCEPT_LABELS.items():
            c_all = [x for x in catalog_items if cid in x["concepts"]]
            c_ep = sum(1 for x in c_all if x["format"] == "episode")
            c_seed = sum(1 for x in c_all if x["role"] == "seed")
            lines.append(f"| {clabel} (`{cid}`) | {len(c_all)} | {c_ep} | {len(c_all) - c_ep} | {c_seed} | {len(c_all) - c_seed} |")

        lines += [
            "",
            "## 3. Top 35 Non-Seed Standalone Candidate Lessons by Reference Similarity",
            "",
            "| Sim | Candidate Lesson | Channel | Matched Anchor | Nearest Seed Reference |",
            "|---:|---|---|---|---|",
        ]
        top_cands = sorted(
            [x for x in catalog_items if x["role"] == "candidate" and x["format"] == "episode" and not x.get("seasonal")],
            key=lambda x: -x["seedSim"],
        )[:35]
        for x in top_cands:
            seed_ref = id_to_item.get(x["nearestSeedId"])
            seed_title = f"{seed_ref['title']} ({seed_ref['channel']})" if seed_ref else x["nearestSeedId"]
            lines.append(
                f"| {x['seedSim']:.3f} | [{x['title']}](https://www.youtube.com/watch?v={x['id']}) | {x['channel']} | `{x['seedAnchor']}` | {seed_title} |"
            )

        report_path = DRIVE_DIR / "Proximal-channel-corpus-v1.md"
        report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        export_copy = {k: v for k, v in catalog_payload.items() if k != "vectorsB64"}
        json_export = DRIVE_DIR / "proximal-reference-catalog.json"
        json_export.write_text(json.dumps(export_copy, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote Drive research report: {report_path}")
        print(f"Wrote Drive catalog export: {json_export}")


if __name__ == "__main__":
    main()
