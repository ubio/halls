'use client';
import { useId } from 'react';
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxValue,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  useComboboxAnchor,
} from './combobox';

/** Searchable form selection. Collection search filters use FilterSearch instead. */
export function MultiChoice({
  label,
  options,
  value,
  onChange,
  max = 50,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
}) {
  const id = useId(),
    anchor = useComboboxAnchor();
  const labels = new Map(options.map((o) => [o.value, o.label]));
  const name = (id: string) =>
    labels.get(id) || `Unavailable selection (${id})`;
  return (
    <div className="multi-choice field">
      <label htmlFor={id}>{label}</label>
      <Combobox
        multiple
        autoHighlight
        items={options.map((o) => o.value)}
        value={value}
        onValueChange={(v) => {
          if (v.length <= max) onChange(v);
        }}
        itemToStringLabel={name}
      >
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(selected: string[]) =>
              selected.map((v) => (
                <ComboboxChip key={v} removeLabel={`Remove ${name(v)}`}>
                  {name(v)}
                </ComboboxChip>
              ))
            }
          </ComboboxValue>
          <ComboboxChipsInput
            id={id}
            aria-label={label}
            placeholder="Search and add…"
            onKeyDown={(event) => {
              // Enter belongs to the picker, even when there is no matching option.
              // preventDefault preserves Base UI's selection handler while stopping form submission.
              if (event.key === 'Enter') event.preventDefault();
            }}
          />
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No matching options.</ComboboxEmpty>
          <ComboboxList>
            {(v: string) => (
              <ComboboxItem
                key={v}
                value={v}
                disabled={value.length >= max && !value.includes(v)}
              >
                {name(v)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <small className="muted">
        {value.length ? `${value.length} selected` : 'None selected'} · up to{' '}
        {max}
      </small>
    </div>
  );
}
