import { useEffect, useMemo, useState } from "react";
import type { GameProps } from "@renderblocks/kernel";
import { preload, stopAll, unlockAudio } from "./audio";
import { Balloons } from "./Balloons";
import { SlideMode } from "./SlideMode";
import { LEVELS, levelOf, type Level } from "./words";

function App({ services }: GameProps) {
  const { storage } = services;
  const [level, setLevel] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  /** Slide through one word at a time, or the balloons (find it / free popping). */
  const [mode, setMode] = useState<Mode>(() => {
    const m = storage.get("mode");
    return m === "find" || m === "pop" ? m : "slide";
  });
  const pickMode = (m: Mode) => {
    stopAll();
    setMode(m);
    storage.set("mode", m);
  };

  // Back: word screen -> levels -> home.
  useEffect(
    () =>
      services.onBack(() => {
        if (level === null) return false;
        stopAll();
        setLevel(null);
        return true;
      }),
    [services, level],
  );

  const words = useMemo(
    () => (level === null ? [] : levelOf(level).words),
    [level],
  );
  const word = words[index];
  useEffect(() => {
    // Have this word and the next ready to play.
    if (word) preload(word.word);
    if (words[index + 1]) preload(words[index + 1].word);
  }, [word, words, index]);

  const open = (lvl: number) => {
    unlockAudio();
    const saved = Number(storage.get(`index${lvl}`) ?? 0);
    setIndex(Math.min(saved, levelOf(lvl).words.length - 1));
    setLevel(lvl);
  };
  const go = (d: number) => {
    stopAll();
    const next = (index + d + words.length) % words.length;
    setIndex(next);
    if (level) storage.set(`index${level}`, String(next));
  };

  const levelButton = ({ level: lvl, pattern, words: ws, kind }: Level) => (
    <button
      key={lvl}
      type="button"
      onClick={() => open(lvl)}
      className={`rounded-3xl bg-white shadow-md border-4 px-5 py-3 text-left ${
        kind === "sound"
          ? "border-emerald-200 active:bg-emerald-50"
          : "border-sky-200 active:bg-sky-50"
      }`}
    >
      <div
        className={`text-base font-extrabold ${kind === "sound" ? "text-emerald-600" : "text-sky-600"}`}
      >
        Level {lvl}
        {pattern && (
          <span className="ml-2 font-black text-slate-500">{pattern}</span>
        )}
      </div>
      <div className="text-2xl font-black text-slate-800 truncate">
        {ws
          .slice(0, 5)
          .map((w) => w.word)
          .join(" ")}{" "}
        …
      </div>
    </button>
  );

  if (level === null || !word) {
    return (
      <div className="h-dvh overflow-y-auto bg-linear-to-b from-sky-100 via-white to-amber-50 select-none">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={services.exitToHome}
              className="w-11 h-11 rounded-full bg-white shadow text-xl font-bold"
              aria-label="Home"
            >
              ←
            </button>
            <h1 className="text-3xl font-black text-sky-700">Words</h1>
          </div>
          <h2 className="mt-2 text-xl font-black text-emerald-700">
            Sound it out
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LEVELS.filter((l) => l.kind === "sound").map(levelButton)}
          </div>
          {/* Familiar ground below the line: the sight words he already knows. */}
          <div className="h-1.5 rounded-full bg-sky-200 my-2" aria-hidden />
          <h2 className="text-xl font-black text-sky-700">Sight words</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LEVELS.filter((l) => l.kind === "sight").map(levelButton)}
          </div>
        </div>
      </div>
    );
  }

  const arrow =
    "w-16 h-16 shrink-0 rounded-full bg-white shadow-md text-3xl font-black text-sky-600 active:bg-sky-50";

  return (
    <div
      className="h-dvh overflow-hidden flex flex-col bg-linear-to-b from-sky-100 via-white to-amber-50 select-none"
      onPointerDown={unlockAudio}
    >
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={() => (stopAll(), setLevel(null))}
          className="w-11 h-11 rounded-full bg-white shadow text-xl font-bold"
          aria-label="Levels"
        >
          ←
        </button>
        <div className="text-lg font-extrabold text-sky-700">Level {level}</div>
        <div className="ml-auto flex rounded-full bg-white shadow p-1 gap-1">
          {MODES.map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => pickMode(m)}
              className={`rounded-full px-4 py-2 text-base font-extrabold ${mode === m ? "bg-sky-500 text-white" : "text-sky-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode !== "slide" ? (
        <div className="flex-1 min-h-0">
          <Balloons key={`${level}-${mode}`} words={words} mode={mode} />
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 flex items-center justify-center gap-2 px-2">
            <button
              type="button"
              onClick={() => go(-1)}
              className={arrow}
              aria-label="Previous word"
            >
              ‹
            </button>
            <div className="flex-1 min-w-0 flex justify-center">
              <SlideMode key={word.word} word={word} />
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              className={arrow}
              aria-label="Next word"
            >
              ›
            </button>
          </div>

          <div className="flex items-center justify-center pb-6">
            <div className="text-lg font-bold text-slate-400 tabular-nums">
              {index + 1} / {words.length}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type Mode = "slide" | "find" | "pop";
const MODES: Array<[Mode, string]> = [
  ["slide", "Slide"],
  ["find", "🎈 Find it"],
  ["pop", "🎈 Pop"],
];

export default App;
