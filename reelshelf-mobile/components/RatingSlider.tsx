import { DecimalSlider } from '@/components/DecimalSlider';

interface RatingSliderProps {
  /** null = not yet rated. */
  value:    number | null;
  onChange: (value: number) => void;
}

// THE single shared rating input — used identically by the quick Rate modal
// and the Universal Review Composer's rating section (do not fork a second
// implementation). 0-10 range, 0.1 decimal increments, confirmed against
// real production diary_entries.rating values (8.7, 9.1, 8.3, 6.5, 7.4, 9.8
// — tenths-level precision, not halves). Cleanly rounded to one decimal via
// DecimalSlider's toFixed-based rounding — no floating-point drift.
export function RatingSlider({ value, onChange }: RatingSliderProps) {
  return (
    <DecimalSlider
      label="Rating"
      value={value}
      onChange={onChange}
      min={0}
      max={10}
      step={0.1}
      valueSuffix=" / 10"
    />
  );
}
