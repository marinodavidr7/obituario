import React from "react";
import { THEMES, type ThemeId } from "@/lib/theme";
import { Check } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface ColorPickerGridProps {
  value: string;
  onChange: (colorId: ThemeId) => void;
  name?: string;
  showDesc?: boolean;
}

export default function ColorPickerGrid({
  value,
  onChange,
  name,
  showDesc = true,
}: ColorPickerGridProps) {
  const current = value || "default";

  return (
    <div className="space-y-3">
      {name && <input type="hidden" name={name} value={current} />}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {THEMES.map((t) => {
          const isSelected = current === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onChange(t.id);
              }}
              className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all active:scale-95 cursor-pointer ${
                isSelected
                  ? "border-gold bg-gold/15 shadow-[0_0_15px_rgba(201,168,106,0.2)]"
                  : "border-white/10 bg-stone-900/40 hover:bg-stone-850 hover:border-white/20"
              }`}
              style={
                isSelected
                  ? {
                      borderColor: t.dotColor,
                      backgroundColor: `${t.dotColor}1a`,
                      boxShadow: `0 0 16px ${t.dotColor}33`,
                    }
                  : undefined
              }
            >
              <div
                className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center relative shadow-sm"
                style={{
                  backgroundColor: t.dotColor,
                  border: t.id === "blanco" ? "1.5px solid #cbd5e1" : "1.5px solid rgba(255,255,255,0.25)",
                }}
              >
                {isSelected && (
                  <Check
                    className={`w-3.5 h-3.5 ${
                      t.id === "blanco" ? "text-stone-900" : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    }`}
                    strokeWidth={3}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className={`block text-xs font-medium truncate ${isSelected ? "text-white" : "text-stone-200"}`}>
                  {t.label}
                </span>
                {showDesc && (
                  <span className="block text-[10px] text-stone-400 truncate leading-tight">
                    {t.desc}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
