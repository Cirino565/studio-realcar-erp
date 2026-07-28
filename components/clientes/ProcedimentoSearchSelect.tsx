"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Search } from "lucide-react";

type Props = {
  name: string;
  options: string[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
};

function normalizarTexto(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export default function ProcedimentoSearchSelect({
  name,
  options,
  value,
  defaultValue = "",
  onChange,
  placeholder = "Digite para buscar um procedimento",
  inputClassName = "premium-input min-h-12 w-full min-w-0 max-w-full",
}: Props) {
  const controlled = value !== undefined;
  const initialValue = controlled ? value || "" : defaultValue;
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const [search, setSearch] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const lastValidValue = useRef(initialValue);

  const uniqueOptions = useMemo(() => {
    const seen = new Set<string>();

    return options.filter((option) => {
      const key = normalizarTexto(option);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [options]);

  const currentValue = controlled ? value || "" : selectedValue;

  useEffect(() => {
    if (!controlled) return;

    const nextValue = value || "";
    setSelectedValue(nextValue);

    if (nextValue) {
      setSearch(nextValue);
      lastValidValue.current = nextValue;
      return;
    }

    if (!open) {
      setSearch("");
    }
  }, [controlled, open, value]);

  const filteredOptions = useMemo(() => {
    const query = normalizarTexto(search);

    if (!query) return uniqueOptions.slice(0, 10);

    return uniqueOptions
      .filter((option) => normalizarTexto(option).includes(query))
      .slice(0, 10);
  }, [search, uniqueOptions]);

  function commitValue(nextValue: string) {
    if (!controlled) {
      setSelectedValue(nextValue);
    }

    onChange?.(nextValue);
  }

  function selectOption(option: string) {
    lastValidValue.current = option;
    setSearch(option);
    commitValue(option);
    setOpen(false);
  }

  function handleSearchChange(nextSearch: string) {
    setSearch(nextSearch);
    setOpen(true);

    const exactMatch = uniqueOptions.find(
      (option) => normalizarTexto(option) === normalizarTexto(nextSearch),
    );

    if (exactMatch) {
      lastValidValue.current = exactMatch;
      commitValue(exactMatch);
      return;
    }

    commitValue("");
  }

  function restoreLastValidValue() {
    const fallback = lastValidValue.current;
    setSearch(fallback);
    commitValue(fallback);
    setOpen(false);
  }

  const selected = Boolean(currentValue);

  return (
    <div className="relative">
      <input type="hidden" name={name} value={currentValue} />

      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={search}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => {
              if (!currentValue) {
                restoreLastValidValue();
                return;
              }

              setSearch(currentValue);
              setOpen(false);
            }, 150);
          }}
          onChange={(event) => handleSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              restoreLastValidValue();
              event.currentTarget.blur();
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${name}-options`}
          className={`${inputClassName} pl-9 pr-10`}
        />

        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setOpen((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-violet-600 dark:hover:text-violet-400"
          aria-label="Mostrar procedimentos"
        >
          <ChevronDown
            size={16}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open ? (
        <div
          id={`${name}-options`}
          role="listbox"
          className="absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const isSelected =
                normalizarTexto(option) === normalizarTexto(currentValue);

              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                    isSelected
                      ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate">{option}</span>
                  {isSelected ? <CheckCircle2 size={15} className="shrink-0" /> : null}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum procedimento cadastrado encontrado.
            </div>
          )}
        </div>
      ) : null}

      {selected ? (
        <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={13} />
          Procedimento selecionado
        </span>
      ) : search ? (
        <span className="mt-1.5 block text-xs text-amber-600 dark:text-amber-400">
          Selecione uma opção da lista para continuar.
        </span>
      ) : null}
    </div>
  );
}
