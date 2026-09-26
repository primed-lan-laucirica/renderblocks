# Sight-word dataset: sources, datasets, caveats

Built 2026-09-25 (PT). Output: `sight_words.csv` (1,064 unique words). You can rebuild it with `.venv/bin/python scripts/build.py`. Raw downloads are in `raw/` and stats are in `build_stats.json`.

## 1. Datasets found (ranked by usefulness as a backbone)

| Rank | Dataset | URL | Format | Words | License / copyright | Trust | Used for |
|---|---|---|---|---|---|---|---|
| 1 | **qdapDictionaries** (CRAN R pkg v1.0.7, T. Rinker): `Leveled_Dolch`, `Dolch`, `Fry_1000` | https://cran.r-project.org/package=qdapDictionaries (tarball: https://cran.r-project.org/src/contrib/qdapDictionaries_1.0.7.tar.gz) | `.rda`, read with python `rdata` | Leveled_Dolch 220 (word + level); Fry_1000 has 1000 entries but only **999 unique** ("hot" appears twice) | Package is GPL-2. Underlying Dolch list is generally treated as public domain. | High for Dolch (220, levels match 3 other sources except 1 word). **Fry_1000 is the older 1979/80 Fry edition** (contains "hot", "word", "crease", "equate", "populate"...). It differs from today's classroom Fry list by about 231 words. | **Backbone for the Dolch service words (levels).** One fix applied: `giving`→`going`. Fry_1000 was *not* used; see the note. |
| 2 | **Hugging Face `nltk-data-hub/dolch`** (the NLTK words-corpus Dolch file) | https://huggingface.co/datasets/nltk-data-hub/dolch | Parquet (word, pos) | 315 (220 service + 95 nouns), grouped by part of speech, no grade levels | Card says "Public domain: Dolch (1936)". HF metadata license: "other". | High | **Backbone for the 95 Dolch nouns.** One fix applied: `stock`→`stick`. Also used to cross-check the 220 service words. |
| 3 | **sightwords.com Fry lists** (frequency-ordered PDF + alphabetical PDF + updated 1st-100 PDF) | https://sightwords.com/sight-words/fry/ · https://sightwords.com/pdfs/word_lists/fry_frequency.pdf · https://sightwords.com/pdfs/word_lists/fry_all.pdf · https://sightwords.com/wp-content/uploads/fry_1st_100_Updated-2.pdf | Text-extractable PDF (pdftotext) | 1000 ranked (1000 unique). The alphabetical PDF matches it exactly. | The site's own presentation is copyrighted. Fry list: see the license note. | High. This is the modern Fry list most teachers use. | **Backbone for Fry rank.** Includes the site's own later correction to #88/#89 (see Fry section). |
| 4 | **Unique Teaching Resources** numbered Fry PDFs (10 × 100) | https://www.uniqueteachingresources.com/Fry-1000-Instant-Words.html (e.g. http://www.uniqueteachingresources.com/support-files/fryfirst100set.pdf) | PDF with explicit rank numbers | 998 parsed (2 numbers garbled in the PDF) | "©All Rights Reserved" | Medium-high. A slightly different Fry edition that uses inflected forms (e.g. "things", "animals"). | Exact rank cross-check of Fry. 965/1000 ranks agree. Its alternative entries are recorded in `other_lists`. |
| 5 | **mysticcoders/words-with-toddlers** (GitHub, `shared/word_lists/*.txt`) | https://github.com/mysticcoders/words-with-toddlers/tree/main/shared/word_lists | Plain text, one file per Dolch level / Fry hundred | Dolch 220+95, Fry 1000 (alphabetical within each hundred, so no exact rank) | MIT (repo). The underlying lists are Dolch/Fry. | Medium: 1 star, created 2026, one typo ("goingw") | Independent cross-check: all Dolch levels match. Fry hundreds match except the #88/#89/#482 update, which it also has. |
| 6 | Wikipedia "Dolch word list" | https://en.wikipedia.org/wiki/Dolch_word_list | Wikitext | Says 220 but lists 2nd Grade as 47 words (adds "left") and nouns as 97 (adds goat/woman/women, drops goodbye) | CC BY-SA | Medium. It deviates from the standard 220/95. | Cross-check only (it agrees on "going" and "stick"). |
| 7 | sightwords.com Dolch pages/PDFs | https://sightwords.com/sight-words/dolch/ · https://sightwords.com/pdfs/word_lists/dolch_nouns.pdf | HTML/PDF | 220 + 95 | Site copyright | High | Cross-check (nouns match HF except stock/stick; 1st grade has "going"). |
| — | Found but not used or evaluated in depth | sholvoir/vocabulary (`vocabulary.txt`, Dolch 315 + Fry 1000): https://github.com/sholvoir/vocabulary · R `lexicon::sw_fry_1000` (byte-identical to qdap Fry_1000) · nandobike/math_game `data/frywords.txt` (per-hundred, copied from sightwords.com) · Nickalus12/Readingsprout (MIT Flutter app with Dolch/Fry) · gist 844e2ee9a1bdd89cdacecb2c70552ba1 (JS arrays) | | | | | |

No Kaggle or data.gov dataset for Dolch/Fry turned up. I found no machine-readable (CSV/JSON) copy of the *modern* Fry list with exact ranks from an authoritative publisher, so Fry rank comes from parsing PDFs and cross-checking them.

### License notes (not legal advice)
- **Dolch** (Dolch 1936/1948) is widely treated as public domain.
- **Fry Instant Words** come from copyrighted publications: Fry 1980 in *The Reading Teacher*, and *1000 Instant Words* (1994/1997/2000). Educators reproduce them freely. Individual words are facts, but the selection and ordering may carry thin compilation copyright. Check this before a commercial release.
- **Preschool Prep** word lists come from public product descriptions. "Meet the Sight Words", the characters and the brand are trademarks/copyrights of Preschool Prep Company. Using the word lists is low-risk. Don't reuse their branding or characters.
- **CMUdict**: BSD-style license. **pyphen**: GPL/LGPL/MPL tri-license, with en_US hyphenation patterns.

## 2. Preschool Prep Company, "Meet the Sight Words"

Each level adds new words. The Easy Reader book sets repeat all earlier words (Level 2 books = 32 words, Level 3 books = 47 words), and the script checks this.

| Level | Words | Status | Sources |
|---|---|---|---|
| 1 | a, and, for, have, he, I, in, is, it, of, play, said, that, the, to, you (16) | **Verified** | Official: https://www.preschoolprepco.com/digital/bundles/sw1/2pack.php · Hoopla: https://www.hoopladigital.com/movie/meet-the-sight-words-level-1/15746497 · Oakland PL: https://oaklandlibrary.bibliocommons.com/v2/record/S981C15913953 |
| 2 | are, as, but, go, had, here, his, like, my, on, see, she, they, was, we, with (16) | **Verified** | Official L2 books (32 words = L1 + L2): https://www.preschoolprepco.com/h/p/msw2/level2.php · Apple app: https://apps.apple.com/us/app/sight-words-2-guessing-game/id443120665 · Hoopla/Richland: https://catalog.myrichlandlibrary.org/Hoopla/15746483 |
| 3 | all, at, be, by, from, her, him, look, one, or, some, there, this, up, word (15) | **Verified, with one caveat** | Official DVD page https://www.preschoolprepco.com/h/p/msw3/index.php and the Apple app show "**on**" where library copies of the DVD case (Spokane https://catalog.spokanelibrary.org/catalog/Record/bf92559a-6208-47f1-8e1e-e6832bca5e15, Richland https://catalog.myrichlandlibrary.org/Record/289042, Livebrary) show "**or**". I used "or": "on" is already a Level 2 word, and the L3 books list (TeachersParadise https://www.teachersparadise.com/co/p/preschool-prep-company-meet-the-sight-words-level-3-easy-reader-books-boxed-set-of-12-ppc207/) includes both "on" and "or". That retailer copy lists only 46 of the stated 47 words; the missing one is "there". |
| 4 | am, came, can, could, do, down, little, not, out, then, use, were, what, when, your (15) | **Verified** | Official: https://www.preschoolprepco.com/sightwords/meet-the-sight-words-4/index.php · Amazon: https://www.amazon.com/Meet-Sight-Words-Level-DVD/dp/B09RJL2J25 |
| 5 | about, an, did, each, get, how, if, many, other, so, their, them, which, will, would (15) | **Verified** | Official: https://www.preschoolprepco.com/sightwords/meet-the-sight-words-5/index.php · Hoopla/Richland: https://catalog.myrichlandlibrary.org/Hoopla/18127581 |
| 6 | now (1) | **Partial** | This is the only Level 6 word confirmed on an official page: https://preschoolprepkidsclub.com/programs/sight-words-6-now (Kids Club exclusive). The fan wiki (https://preschoolprep.fandom.com/wiki/Meet_the_Sight_Words_-_Level_6) also lists no, these, me, ask, has, come, very, yes. Official URLs for those words returned nothing, so they are **not** tagged as Level 6 in the CSV. |

**Gaps:**
- The Sight Words **Flashcards** set, the Sight Words Workbook and the Coloring Book have no public word lists. They are probably the L1–L3 words, but that is unverified, so I didn't use them.
- One library record mentions an earlier "original Meet the Sight Words (23 word version)". I couldn't find its word list.
- A "Level 4 flashcards" claim came from a search-engine summary only and was not used.
- Levels 1–5 total 77 words. With Level 6 "now", 78 words carry a PPC tag.

## 3. Dolch (220 service words + 95 nouns)
- Service words: qdapDictionaries `Leveled_Dolch`. Counts: Pre-Primer 40, Primer 52, 1st Grade 41, 2nd Grade 46, 3rd Grade 41, **total 220 ✓**.
- Nouns: HF `nltk-data-hub/dolch` nouns, **95 ✓**. None overlap with the service words.
- Fixes, by majority of sources:
  - qdap 1st Grade "giving" → **"going"** (sightwords.com, Wikipedia, NLTK/HF and words-with-toddlers all have "going").
  - HF noun "stock" → **"stick"** (sightwords.com PDF, Wikipedia and words-with-toddlers).
  - The dropped variants are kept as rows with `other_lists` = "Dolch variant (...)" and blank `dolch_level`.
- "Santa Claus" is kept as a two-word entry. Casing is kept for proper nouns (I, Christmas, Santa Claus, America, English...).

## 4. Fry Instant Words (1000)
- Rank backbone: sightwords.com `fry_frequency.pdf`, parsed column by column. That gives 1000 unique words and matches its alphabetical PDF exactly. **Total 1000 ✓**, 100 per hundred.
- A correction was applied: #88 oil → **am**, #89 sit → **its**, #482 am → **bread**. This matches sightwords.com's own updated 1st-100 PDF and is independently backed by Unique Teaching Resources (#88 am, #89 its, #482 bread) and words-with-toddlers. "oil" gets an `other_lists` note, and "sit" appears as Dolch 2nd Grade plus notes.
- Cross-check against the Unique Teaching Resources numbered edition: 965/1000 ranks match exactly. Most differences are base vs. inflected forms (thing/things, ask/asked, animal/animals...), plus a few swaps (grass/glass, consonant/iron/cat, choose/pay) and "tail" vs "mall", "nor" vs "hoe". UTR #404 "halt" is taken as a typo for "half" and ignored. Where UTR has a word at a different rank, or a word our Fry list lacks, `other_lists` notes it as "Fry alt edition (uniqueteachingresources #N)". Twenty such words that are in no other list are included as rows with blank `fry_rank`.
- The older 1979/80 Fry edition (qdap `Fry_1000`, which PPC's Level 3 "word" seems to follow) was **not merged**. It is a different edition, and qdap's copy has a duplicate ("hot").

## 5. Other lists
Skipped on purpose. The Oxford Wordlist is © Oxford University Press with restrictive terms. No other kindergarten or first-grade list had clean, open, machine-readable data that was worth the risk. `other_lists` currently holds only the edition/variant notes described above.

## 6. Enrichment and column definitions
- **CMU Pronouncing Dictionary** via python `cmudict` 1.1.3 (https://github.com/cmusphinx/cmudict, 126,052 entries). `phonemes_arpabet` uses the first CMU pronunciation that has a primary-stressed vowel, so full forms like "and" = AE N D are chosen over weak forms like AH N D. Exception: "a" and "the" keep the schwa form (AH, DH AH). Stress digits are removed. `syllable_count` = number of vowel phonemes. Multi-word entries are joined token by token. **Coverage: 1064/1064 = 100%.**
- `letter_count` counts letters only; apostrophes and spaces are excluded.
- `source_count` = how many of {Preschool Prep, Dolch, Fry} include the word. Words that appear only as an edition/variant entry in `other_lists` count as 1.
- `suggested_order` = sort by (PPC level, Dolch level order Pre-Primer→Primer→1st→2nd→3rd→Nouns, Fry rank, letter count, word). Missing values sort last within each key. Because this is a strict lexicographic sort, all Dolch words (including nouns like "squirrel") come before Fry-only words.
- **syllable_split**: orthographic hyphenation from `pyphen` 0.18.1, en_US (TeX/LibreOffice patterns). It is filled only when a pyphen split (default margins, then left=1) has the same number of pieces as the CMU syllable count and every piece contains a vowel letter. That gives 350 of 424 multi-syllable words. The other 73 (plus 1 multi-word entry) are left blank, with `syllable_split_status` = `pyphen_mismatch(raw)`. Typical cases: about, away, over, open, every, many, very, contractions. TeX patterns deliberately avoid single-letter pieces, so treat this as printer's hyphenation, not phonetic syllabification. One-syllable words are left blank.
- **digraphs**: found by spelling (tch, dge, sh, ch, th, wh, ph, ck, ng, kn-, wr-, -gn, -mb) and **confirmed against CMU**:
  - th needs TH/DH; sh needs SH; ch needs CH, K or SH; ph needs F; ng needs NG and is skipped before "e" (change); kn- needs N and no initial K; wh needs W or HH.
  - Longer graphemes take priority (tch over ch).
- **blends**:
  - Initial clusters (bl cl fl gl pl sl br cr dr fr gr pr tr sc sk sm sn sp st sw tw dw scr spl spr str squ shr thr) are marked `xx-`.
  - Final clusters (nd nt nk mp st sk sp ft lt ld lk lp lf lm ct pt xt) are marked `-xx`.
  - A cluster counts only if CMU shows at least 2 (or 3) consonant phonemes at that end of the word. For example "school" is sc- (S K); "sword" would be rejected.
  - Only literal word edges are checked, so "jumped" doesn't get -mp.
- **vowel_patterns**:
  - `team:xx`: vowel teams by spelling only (ai ay ee ea oa oe ie igh eigh oo ou ow ew ue ui au aw augh ough oi oy ei ey; a "u" after "q" is treated as part of qu). Teams like ow and ea have more than one sound; use `phonemes_arpabet` to tell which.
  - `r-controlled:Vr`: needs ER or R in CMU.
  - `VCe` / `VCe-exception`: final silent-e pattern. It's `VCe` if CMU has the expected long vowel, otherwise `VCe-exception` (have, give, come, some, done...). 96 VCe and 29 exceptions.
- **decodable_guess (HEURISTIC)**: "yes" if the spelling can be split into graphemes from a common-phonics table whose sounds reproduce a CMU pronunciation exactly. The table covers:
  - short vowels; long vowels from VCe or an open syllable; vowel teams; r-controlled vowels
  - consonant digraphs; doubled consonants; soft c/g; kn/wr; -ce/-ge/-se endings; -le, -tion, -ed, -es; consonant y
  - schwa or reduced vowels, but only in unstressed syllables of multi-syllable words

  Blank for contractions and "Santa Claus". Result: 793 yes / 256 no / 15 blank. Known limitations:
  - It is lenient for some words: "the" matches the CMU pronunciation "DH IY", and there are some multi-syllable schwa cases.
  - It is strict for others: kind/find/old/cold (closed-syllable exceptions), ch=/k/ (school) and -ture are marked "no".
  - It is **a guide for ordering and review, not ground truth**.
