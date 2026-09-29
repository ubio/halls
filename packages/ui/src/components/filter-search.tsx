"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Search, X, ChevronRight } from "lucide-react";

export interface SearchFilter {
  key: string;
  label: string;
  options: readonly (string | { value: string; label: string })[];
}
export interface FilterSearchProps {
  label: string;
  placeholder?: string;
  query: string;
  onQueryChange: (query: string) => void;
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  fields: SearchFilter[];
  suggestions?: string[];
}
/** App-owned values and callbacks keep filtering semantics outside the shared UI. */
export function FilterSearch({
  label,
  placeholder,
  query,
  onQueryChange,
  filters,
  onFilterChange,
  fields,
  suggestions = [],
}: FilterSearchProps) {
  const id = useId(),
    input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(0);
  const [editing, setEditing] = useState<{ key: string; search: string } | null>(null);
  const field = fields.find((f) => f.key === editing?.key);
  const activeFilters = fields.filter((f) => filters[f.key]);
  const term = (editing?.search || query.split(/\s+/).at(-1) || "").toLowerCase();
  const choices: { id: string; label: string; detail?: string; select: () => void }[] = field
    ? field.options
        .map((o) => (typeof o === "string" ? { value: o, label: o } : o))
        .filter(
          (o) =>
            o.label.toLowerCase().includes((editing?.search || "").toLowerCase()) ||
            o.value.toLowerCase().includes((editing?.search || "").toLowerCase()),
        )
        .slice(0, 50)
        .map((o) => ({
          id: field.key + ":" + o.value,
          label: o.label,
          detail: field.label,
          select: () => {
            onFilterChange(field.key, o.value);
            setEditing(null);
          },
        }))
    : [
        ...fields
          .filter(
            (f) =>
              !term || f.key.toLowerCase().includes(term) || f.label.toLowerCase().includes(term),
          )
          .map((f) => ({
            id: f.key,
            label: f.label,
            detail: "Choose a filter",
            select: () => {
              if (
                term &&
                (f.key.toLowerCase().includes(term) || f.label.toLowerCase().includes(term))
              )
                onQueryChange(query.slice(0, query.length - term.length).trimEnd());
              setEditing({ key: f.key, search: "" });
            },
          })),
        ...suggestions
          .filter((v) => v.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 12)
          .map((v) => ({
            id: "text:" + v,
            label: v,
            detail: "Search text",
            select: () => {
              onQueryChange(v);
              setOpen(false);
            },
          })),
      ];
  const highlighted = Math.min(active, Math.max(0, choices.length - 1));
  useEffect(() => {
    if (open) document.getElementById(id + "-" + highlighted)?.scrollIntoView({ block: "nearest" });
  }, [id, open, highlighted, editing?.key]);
  function choose(index: number) {
    choices[index]?.select();
    setActive(0);
    input.current?.focus();
  }
  function change(value: string) {
    setOpen(true);
    setActive(0);
    if (field) {
      const prefix = field.label + ": ";
      if (!value.toLowerCase().startsWith(prefix.toLowerCase())) {
        setEditing(null);
        return;
      }
      setEditing({ key: field.key, search: value.slice(prefix.length) });
      return;
    }
    const match = value.match(/(?:^|\s)([\w-]+):\s*(.*)$/);
    const nextField =
      match &&
      fields.find(
        (f) =>
          f.key.toLowerCase() === match[1].toLowerCase() ||
          f.label.toLowerCase() === match[1].toLowerCase(),
      );
    if (nextField && match) {
      onQueryChange(value.slice(0, match.index).trimEnd());
      setEditing({ key: nextField.key, search: match[2] });
    } else onQueryChange(value);
  }
  return (
    <div
      className="filter-search"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false);
          setEditing(null);
        }
      }}
    >
      <div className="filter-search-box">
        <Search size={16} aria-hidden="true" />
        {activeFilters.map((f) => {
          const option = f.options.find(
            (o) => (typeof o === "string" ? o : o.value) === filters[f.key],
          );
          const value = typeof option === "string" ? option : option?.label || filters[f.key];
          return (
            <span className="filter-search-chip" key={f.key}>
              <span>
                {f.label}: <strong>{value}</strong>
              </span>
              <button
                type="button"
                aria-label={`Remove ${f.label} filter`}
                onClick={() => {
                  onFilterChange(f.key, "");
                  input.current?.focus();
                }}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
        {editing && query && <span className="filter-search-text">{query}</span>}
        <input
          ref={input}
          role="combobox"
          aria-label={label}
          placeholder={placeholder || "Search or add a filter…"}
          value={field ? field.label + ": " + editing!.search : query}
          onChange={(e) => change(e.target.value)}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onClick={() => setOpen(true)}
          autoComplete="off"
          maxLength={300}
          aria-expanded={open && choices.length > 0}
          aria-controls={id}
          aria-autocomplete="list"
          aria-activedescendant={open && choices.length ? id + "-" + highlighted : undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((n) =>
                Math.max(0, Math.min(choices.length - 1, n + (e.key === "ArrowDown" ? 1 : -1))),
              );
            } else if (e.key === "Enter" && open && choices.length) {
              e.preventDefault();
              choose(highlighted);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(null);
              setOpen(false);
            } else if (e.key === "Backspace" && !query && !editing && activeFilters.length) {
              onFilterChange(activeFilters[activeFilters.length - 1].key, "");
            }
          }}
        />
        {(query || activeFilters.length > 0 || editing) && (
          <button
            className="filter-search-clear"
            type="button"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={() => {
              onQueryChange("");
              fields.forEach((f) => {
                if (filters[f.key]) onFilterChange(f.key, "");
              });
              setEditing(null);
              input.current?.focus();
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>
      {open && (choices.length > 0 || field) && (
        <div className="filter-search-menu">
          <div className="filter-search-hint">
            {field ? `${field.label} · choose a value` : "Filter by… · or keep typing to search"}
          </div>
          <div role="listbox" id={id} aria-label={`${label} suggestions`}>
            {choices.length ? (
              choices.map((c, i) => (
                <div
                  role="option"
                  aria-selected={i === highlighted}
                  id={id + "-" + i}
                  key={c.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  onMouseEnter={() => setActive(i)}
                  className={i === highlighted ? "active" : ""}
                >
                  <span>
                    {c.label}
                    <small>{c.detail}</small>
                  </span>
                  {!field && <ChevronRight size={14} />}
                </div>
              ))
            ) : (
              <p className="filter-search-hint">
                No matching values. Press Escape to return to text search.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
