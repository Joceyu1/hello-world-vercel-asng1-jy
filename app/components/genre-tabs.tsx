"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { artists, genres, type Genre } from "@/lib/music/artists";

export type GenreFilter = "All sounds" | Genre;

type GenreSelection = {
  genre: GenreFilter;
  setGenre: (genre: GenreFilter) => void;
};

const GenreContext = createContext<GenreSelection | null>(null);
const genreOptions: GenreFilter[] = ["All sounds", ...genres];

export function GenreProvider({ children }: { children: ReactNode }) {
  const [genre, setGenre] = useState<GenreFilter>("All sounds");
  const selection = useMemo(() => ({ genre, setGenre }), [genre]);
  return <GenreContext.Provider value={selection}>{children}</GenreContext.Provider>;
}

export function useGenre() {
  const selection = useContext(GenreContext);
  if (!selection) throw new Error("Genre navigation requires GenreProvider.");
  return selection;
}

export default function GenreTabs({ variant = "strip" }: { variant?: "strip" | "catalog" }) {
  const { genre, setGenre } = useGenre();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function selectGenre(next: GenreFilter) {
    setGenre(next);
    if (variant === "strip") {
      requestAnimationFrame(() => {
        document.getElementById("collection")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      });
    }
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowRight": next = (index + 1) % genreOptions.length; break;
      case "ArrowLeft": next = (index - 1 + genreOptions.length) % genreOptions.length; break;
      case "Home": next = 0; break;
      case "End": next = genreOptions.length - 1; break;
      default: return;
    }
    event.preventDefault();
    buttons.current[next]?.focus({ preventScroll: true });
    buttons.current[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return (
    <nav
      className={`genre-browser genre-browser-${variant}`}
      aria-label={variant === "strip" ? "Browse artists by genre" : "Filter artists by genre"}
    >
      <span className="genre-browser-label">PICK YOUR SOUND</span>
      <div className="genre-browser-track">
        {genreOptions.map((option, index) => {
          const count = option === "All sounds" ? artists.length : artists.filter((artist) => artist.genre === option).length;
          return (
            <button
              className="genre-browser-tab"
              type="button"
              key={option}
              ref={(element) => { buttons.current[index] = element; }}
              aria-pressed={genre === option}
              aria-controls="collection"
              onClick={() => selectGenre(option)}
              onKeyDown={(event) => moveFocus(event, index)}
            >
              <span>{option}</span>
              <span className="genre-browser-count" aria-label={`${count} artists`}>{count}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
