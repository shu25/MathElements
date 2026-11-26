import { useEffect, useState } from 'react';

export function NumberField({
  label,
  value,
  unit,
  onChange,
  min = -1000,
  max = 1000,
  step = 1,
}: {
  label: string;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);
  const commit = () => {
    const number = draft.trim() === '' ? NaN : Number(draft);
    if (!Number.isFinite(number)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, number));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };
  return (
    <label className="number-field">
      <span>{label}</span>
      <span className="number-input-wrap">
        <input
          aria-label={label}
          type="number"
          step={step}
          min={min}
          max={max}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setDraft(String(value));
              e.currentTarget.blur();
            }
          }}
        />
        <small>{unit}</small>
      </span>
    </label>
  );
}
