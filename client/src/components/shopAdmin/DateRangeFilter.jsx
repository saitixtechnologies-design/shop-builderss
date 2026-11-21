import { CalendarDays } from "lucide-react";
import { DATE_PRESETS, indiaToday } from "../../lib/shopOrders.js";

/**
 * Date filter for orders and reports: quick choices (Today … Last month) plus custom dates.
 * value: { preset, from, to }; onChange receives the same shape. Dates are Indian dates.
 */
export default function DateRangeFilter({ value, onChange }) {
    const today = indiaToday();

    const choosePreset = (preset) => onChange({ preset: preset.id, ...preset.range(today) });

    const setDate = (field, date) => {
        if (!date) return;
        const next = { ...value, preset: "custom", [field]: date };
        // Keep the range the right way round.
        if (next.from > next.to) {
            if (field === "from") next.to = next.from;
            else next.from = next.to;
        }
        onChange(next);
    };

    return (
        <div className="date-range-filter" role="group" aria-label="Choose dates">
            <div className="date-range-presets">
                {DATE_PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        type="button"
                        className={value.preset === preset.id ? "is-selected" : ""}
                        aria-pressed={value.preset === preset.id}
                        onClick={() => choosePreset(preset)}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <div className={`date-range-custom ${value.preset === "custom" ? "is-selected" : ""}`}>
                <CalendarDays size={16} aria-hidden="true" />
                <label>
                    <span className="visually-hidden">From</span>
                    <input type="date" value={value.from} max={today} onChange={(event) => setDate("from", event.target.value)} />
                </label>
                <span aria-hidden="true">–</span>
                <label>
                    <span className="visually-hidden">To</span>
                    <input type="date" value={value.to} max={today} onChange={(event) => setDate("to", event.target.value)} />
                </label>
            </div>
        </div>
    );
}
