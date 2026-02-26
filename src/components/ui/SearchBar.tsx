"use client";

import { useState, useRef, useCallback } from "react";

interface GeocodingResult {
  id: string;
  place_name: string;
  center: [number, number];
}

interface SearchBarProps {
  flyTo: (center: [number, number], zoom?: number) => void;
}

export function SearchBar({ flyTo }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(async (text: string) => {
    if (text.length < 3) {
      setResults([]);
      return;
    }
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        text
      )}.json?access_token=${token}&limit=5`
    );
    const data = await res.json();
    setResults(
      data.features?.map(
        (f: { id: string; place_name: string; center: [number, number] }) => ({
          id: f.id,
          place_name: f.place_name,
          center: f.center,
        })
      ) ?? []
    );
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (result: GeocodingResult) => {
    setQuery(result.place_name);
    setIsOpen(false);
    setResults([]);
    flyTo(result.center);
  };

  return (
    <div className="pointer-events-auto relative flex-1 max-w-md">
      <div className="flex items-center bg-slate-950/70 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-lg overflow-hidden">
        <svg
          className="ml-4 text-slate-500 shrink-0"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="Search for a location..."
          className="w-full px-3 py-3 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50">
          {results.map((r) => (
            <button
              key={r.id}
              onMouseDown={() => handleSelect(r)}
              className="w-full px-4 py-3.5 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors border-b border-white/[0.04] last:border-0"
            >
              {r.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
