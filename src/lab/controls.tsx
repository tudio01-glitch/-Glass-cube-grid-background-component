import { useId } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

/* Hand-rolled, keyboard-operable panel controls. Every control shows its numeric value. */

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="lab-field">
      <label className="lab-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output className="lab-field-value" htmlFor={id}>
        {value}
        {unit}
      </output>
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="lab-field">
      <label className="lab-field-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="lab-field">
      <label className="lab-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        dir="ltr"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="lab-field lab-field-color">
      <label className="lab-field-label" htmlFor={id}>
        {label}
      </label>
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <output className="lab-field-value" htmlFor={id}>
        {value}
      </output>
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="lab-field lab-field-checkbox">
      <label className="lab-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <output className="lab-field-value" htmlFor={id}>
        {checked ? 'כן' : 'לא'}
      </output>
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="lab-field">
      <span className="lab-field-label">{label}</span>
      <div className="lab-segmented" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Rotary dial for angles: drag around the center, arrow keys step 1° (shift: 15°). */
export function Dial({
  label,
  value,
  onChange,
  min = -180,
  max = 180,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v)));

  const fromPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 = up, clockwise positive
    if (deg > 180) deg -= 360;
    onChange(clamp(deg));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 15 : 1;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') onChange(clamp(value + step));
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') onChange(clamp(value - step));
    else if (e.key === 'Home') onChange(min);
    else if (e.key === 'End') onChange(max);
    else return;
    e.preventDefault();
  };

  return (
    <div className="lab-field lab-field-dial">
      <span className="lab-field-label">{label}</span>
      <div
        className="lab-dial"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}°`}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e);
        }}
      >
        <span className="lab-dial-hand" style={{ rotate: `${value}deg` }} />
      </div>
      <output className="lab-field-value">{value}°</output>
    </div>
  );
}
