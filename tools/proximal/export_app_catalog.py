#!/usr/bin/env python3
"""
Exports the verified 7,519-video uncapped master corpus (`master-corpus.json` +
`master-embeddings.npz`) into `packages/games/proximal/src/data/catalog.json`
with 64-D quantized int8 vectors, 85+ multi-subject semantic query prototypes,
and seed-anchor similarity scores ready for on-device execution.
"""
from __future__ import annotations

import base64
import json
import math
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE_DIR = HERE / "cache"
MASTER_CORPUS = CACHE_DIR / "master-corpus.json"
MASTER_EMB = CACHE_DIR / "master-embeddings.npz"
CATALOG_OUT = ROOT / "packages" / "games" / "proximal" / "src" / "data" / "catalog.json"

SEED_ANCHORS = [
    ("numberblocks", "nb"),
    ("wonderblocks", "wb"),
    ("preschool-prep", "pp"),
    ("homeschool-pop", "hp"),
]

# Multi-subject semantic query prototypes projected into the exact same 64-D SVD space
QUERY_PROTOTYPES = {
    # Math
    "counting": "counting numbers 1 to 10 1 to 20 1 to 100 for kids",
    "numbers": "meet the numbers number sense numeracy blocks",
    "subitize": "subitizing ten frames number bonds quick recognition",
    "addition": "addition adding numbers plus sums doubles making ten",
    "subtraction": "subtraction taking away minus difference regrouping",
    "facts": "math facts drills flashcards fluency addition subtraction multiplication division",
    "skip": "skip counting by 2s 3s 4s 5s 10s song",
    "place": "place value ones tens hundreds thousands base ten",
    "multiply": "multiplication times tables equal groups arrays factors primes",
    "divide": "division sharing equally quotient remainder long division",
    "fractions": "fractions halves thirds fourths quarters numerator denominator decimals",
    "decimals": "decimals tenths hundredths percentages ratios proportions",
    "shapes": "2D and 3D shapes circle square triangle rectangle polygon geometry",
    "geometry": "geometry angles lines symmetry perimeter area volume trigonometry",
    "time": "telling time analog clock hours minutes calendar seasons",
    "money": "counting money coins pennies nickels dimes quarters dollars",
    "measure": "measurement length inches centimeters weight capacity bar graphs",
    "algebra": "algebra variables equations integers polynomials functions quadratics",
    "calculus": "calculus limits derivatives integrals differential equations",
    "vectors": "vectors matrices linear algebra eigenvalues transformations fourier",
    "probability": "probability statistics combinatorics bayes normal distribution",
    "proof": "mathematical proof number theory infinity set theory topology",
    # Reading, Phonics & Language (ELA)
    "phonics": "phonics letter sounds alphabet abc cvc blending alphablocks",
    "digraphs": "digraphs consonant blends silent e magic e vowel teams r-controlled",
    "reading": "learn to read sight words syllables decoding spelling rules",
    "grammar": "grammar parts of speech nouns verbs adjectives adverbs punctuation sentences",
    "vocabulary": "vocabulary prefixes suffixes root words morphology context clues",
    "stories": "reading comprehension fairy tales fables poetry literature storytelling",
    "linguistics": "linguistics etymology writing systems history of the alphabet language",
    # Science & Engineering
    "animals": "animals mammals birds insects dinosaurs ocean wildlife habitats ecosystems",
    "plants": "plants seeds flowers trees photosynthesis pollination life cycles",
    "dinosaurs": "dinosaurs fossils paleontology prehistoric earth evolution",
    "body": "human body five senses brain heart lungs skeleton immune system health",
    "weather": "weather rain snow clouds water cycle seasons storms climate",
    "earth": "earth geology volcanoes earthquakes rocks minerals landforms oceans tectonics",
    "space": "solar system planets sun moon stars galaxies black holes universe astronomy",
    "physics": "forces motion gravity magnets simple machines energy light sound waves physics",
    "quantum": "quantum mechanics relativity spacetime cosmology astrophysics",
    "chemistry": "states of matter solids liquids gases atoms molecules periodic table chemistry",
    "biology": "cells dna genetics evolution natural selection biology microbes",
    "engineering": "engineering design machines robots bridges airplanes how things work",
    # Logic, Coding & AI
    "patterns": "patterns sequences repeating growing patterns wonderblocks",
    "coding": "coding for kids loops algorithms debugging block coding programming",
    "logic": "logic puzzles riddles paradoxes classification analogies critical thinking",
    "computers": "computer science binary cpu hardware internet cryptography algorithms",
    "ai": "artificial intelligence machine learning neural networks transformers deep learning",
    # World, Geography & History
    "geography": "geography maps continents oceans countries states communities landmarks",
    "origins": "montessori great stories big history origin of the universe life humans writing numbers",
    "history": "world history ancient egypt greece rome medieval civilizations explorers",
    "civics": "civics government democracy constitution economics trade money",
    # Art, Color & Music
    "colors": "colors colourblocks primary secondary mixing rainbow visual perception",
    "music": "music rhythm tempo melody instruments composers chords music theory",
    "art": "art history painting sculpture drawing architecture artists museums",
    # Level cues
    "preschool": "preschool toddler early childhood gentle songs counting shapes colors",
    "kindergarten": "kindergarten 1st grade 2nd grade elementary lesson",
    "highschool": "high school ap advanced course lecture",
    "university": "university frontier deep dive intuition proof",
}


def topk_mean(sim_row: np.ndarray, indices: np.ndarray, k: int = 5) -> float:
    if len(indices) == 0:
        return 0.0
    vals = sim_row[indices]
    if len(vals) <= k:
        return float(np.mean(vals))
    part = np.partition(vals, -k)[-k:]
    return float(np.mean(part))


def quantize_int8_b64(mat: np.ndarray) -> str:
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1.0, norms)
    unit = mat / norms
    q = np.clip(np.round(unit * 127.0), -127, 127).astype(np.int8)
    return base64.b64encode(q.tobytes()).decode("ascii")


def main() -> None:
    corpus = json.loads(MASTER_CORPUS.read_text(encoding="utf-8"))
    npz = np.load(MASTER_EMB)

    videos: list[dict] = corpus["videos"]
    emb_384 = npz["embeddings_384"].astype(np.float32)
    proj_int8 = npz["embeddings_64_int8"].astype(np.int8)
    svd_mean = npz["svd_mean"].astype(np.float32)
    svd_basis = npz["svd_basis"].astype(np.float32)

    n = len(videos)
    assert emb_384.shape[0] == n, f"Mismatch: {emb_384.shape[0]} vs {n}"
    print(f"Loaded {n} master corpus videos + 384-D/64-D embeddings.")

    # Project multi-subject query prototypes into the exact same 64-D SVD basis
    proto_keys = sorted(QUERY_PROTOTYPES.keys())
    proto_texts = [QUERY_PROTOTYPES[k] for k in proto_keys]
    print(f"Encoding {len(proto_keys)} multi-subject semantic query prototypes...")
    model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    proto_emb = np.asarray(
        model.encode(proto_texts, batch_size=64, show_progress_bar=False, normalize_embeddings=True),
        dtype=np.float32,
    )
    proj_protos = (proto_emb - svd_mean[None, :]) @ svd_basis
    proto_map = {
        key: quantize_int8_b64(proj_protos[i : i + 1]) for i, key in enumerate(proto_keys)
    }

    # Compute seed-anchor similarities against the 4 original seed channels
    seed_idx_by_anchor: dict[str, np.ndarray] = {}
    all_seed_idx_list: list[int] = []
    for anchor_id, _ in SEED_ANCHORS:
        idxs = [i for i, v in enumerate(videos) if v["channelKey"] == anchor_id]
        seed_idx_by_anchor[anchor_id] = np.array(idxs, dtype=np.int32)
        all_seed_idx_list.extend(idxs)
    all_seed_indices = np.array(all_seed_idx_list, dtype=np.int32)
    seed_matrix = emb_384[all_seed_indices]  # [S, 384]

    # Pre-slice per-anchor matrices for fast chunked similarity
    anchor_mats = {aid: emb_384[idxs] for aid, idxs in seed_idx_by_anchor.items()}

    print("Scoring corpus videos against seed anchors and popularity/format priors...")
    app_videos: list[dict] = []
    chunk = 512
    for start in range(0, n, chunk):
        end = min(n, start + chunk)
        block = emb_384[start:end]  # [C, 384]
        all_seed_sims = block @ seed_matrix.T  # [C, S]
        per_anchor_sims = {aid: block @ mat.T for aid, mat in anchor_mats.items()}

        for li in range(end - start):
            gi = start + li
            v = videos[gi]
            is_seed = v.get("role") == "seed" and v["channelKey"] in ("numberblocks", "wonderblocks", "preschool-prep", "homeschool-pop")

            a_scores: dict[str, float] = {}
            for aid, short_k in SEED_ANCHORS:
                row_a = per_anchor_sims[aid][li]
                # Exclude self if this video is inside that anchor
                if v["channelKey"] == aid:
                    row_a = row_a[row_a < 0.999]
                if len(row_a) == 0:
                    a_scores[aid] = 0.0
                else:
                    k = min(5, len(row_a))
                    a_scores[aid] = round(float(np.mean(np.partition(row_a, -k)[-k:])), 3)

            best_anchor = v["channelKey"] if is_seed else max(a_scores.items(), key=lambda kv: kv[1])[0]
            row_all = all_seed_sims[li].copy()
            if is_seed:
                row_all[row_all > 0.999] = -1.0
            k_all = min(5, len(row_all))
            overall_sim = round(float(np.mean(np.partition(row_all, -k_all)[-k_all:])), 3)
            nearest_seed_id = videos[int(all_seed_indices[int(np.argmax(row_all))])]["id"]

            views = max(1, int(v.get("views") or 1))
            view_norm = min(1.0, math.log10(views + 10) / 7.2)
            seed_bonus = 0.04 if is_seed else 0.0
            fmt_adj = 0.05 if v.get("format") == "episode" else -0.04
            seas_adj = -0.07 if v.get("seasonal") else 0.0
            # Balanced quality score: strong view/authority prior + seed alignment + episode clarity
            score = round(100.0 * (0.42 * overall_sim + 0.44 * view_norm + seed_bonus + fmt_adj + seas_adj), 1)

            item = {
                "id": v["id"],
                "title": v["title"],
                "channel": v["channel"],
                "channelKey": v["channelKey"],
                "role": "seed" if is_seed else "candidate",
                "subjects": v["subjects"],
                "primarySubject": v["primarySubject"],
                "levelBand": v["levelBand"],
                "seedAnchor": best_anchor,
                "nearestSeedId": nearest_seed_id,
                "seedSim": max(0.01, overall_sim),
                "anchorSims": {
                    "nb": a_scores["numberblocks"],
                    "wb": a_scores["wonderblocks"],
                    "pp": a_scores["preschool-prep"],
                    "hp": a_scores["homeschool-pop"],
                },
                "score": score,
                "duration": int(v["duration"]),
                "format": v.get("format", "episode"),
                "concepts": v["concepts"],
                "needs": v.get("needs", []),
                "views": views,
                "related": v.get("related", [])[:8],
            }
            if v.get("seasonal"):
                item["seasonal"] = True
            if v.get("start") is not None:
                item["start"] = int(v["start"])
            if v.get("end") is not None:
                item["end"] = int(v["end"])
            if v.get("symbolsRanks"):
                item["symbolsRanks"] = v["symbolsRanks"]
            if v.get("summary"):
                item["summary"] = v["summary"][:160]
            app_videos.append(item)

    # Sort videos by quality score descending, keeping proj_int8 strictly row-aligned!
    order = sorted(range(n), key=lambda i: (-app_videos[i]["score"], -app_videos[i]["views"]))
    sorted_videos = [app_videos[i] for i in order]
    sorted_int8 = proj_int8[order]
    vectors_b64 = base64.b64encode(sorted_int8.tobytes()).decode("ascii")

    seed_count = sum(1 for x in sorted_videos if x["role"] == "seed")
    payload = {
        "generatedAt": corpus["generatedAt"],
        "model": corpus["embeddingModel"],
        "vecDim": int(sorted_int8.shape[1]),
        "vectorsB64": vectors_b64,
        "queryProtos": proto_map,
        "totalVideos": len(sorted_videos),
        "seedCount": seed_count,
        "candidateCount": len(sorted_videos) - seed_count,
        "videos": sorted_videos,
    }

    CATALOG_OUT.parent.mkdir(parents=True, exist_ok=True)
    CATALOG_OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {CATALOG_OUT} ({CATALOG_OUT.stat().st_size / (1024*1024):.2f} MB, {len(sorted_videos)} videos, {seed_count} seeds, {len(proto_map)} query prototypes)")


if __name__ == "__main__":
    main()
