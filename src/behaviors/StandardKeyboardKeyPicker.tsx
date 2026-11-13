import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { hid_usage_from_page_and_id } from "../hid-usages";

interface StandardKeyDef {
  id: string;
  page: number;
  usageId: number;
  label: string;
  subLabel?: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  category?: "alpha" | "mod" | "fn" | "nav" | "numpad";
}

// Full-size 100% ANSI layout (22.5U wide x 6.2U tall)
const FULL_SIZE_ANSI_KEYS: StandardKeyDef[] = [
  // Row 0: Function row (y = 0)
  { id: "esc", page: 7, usageId: 41, label: "Esc", x: 0, y: 0, category: "mod" },
  { id: "f1", page: 7, usageId: 58, label: "F1", x: 2, y: 0, category: "fn" },
  { id: "f2", page: 7, usageId: 59, label: "F2", x: 3, y: 0, category: "fn" },
  { id: "f3", page: 7, usageId: 60, label: "F3", x: 4, y: 0, category: "fn" },
  { id: "f4", page: 7, usageId: 61, label: "F4", x: 5, y: 0, category: "fn" },
  { id: "f5", page: 7, usageId: 62, label: "F5", x: 6.5, y: 0, category: "mod" },
  { id: "f6", page: 7, usageId: 63, label: "F6", x: 7.5, y: 0, category: "mod" },
  { id: "f7", page: 7, usageId: 64, label: "F7", x: 8.5, y: 0, category: "mod" },
  { id: "f8", page: 7, usageId: 65, label: "F8", x: 9.5, y: 0, category: "mod" },
  { id: "f9", page: 7, usageId: 66, label: "F9", x: 11, y: 0, category: "fn" },
  { id: "f10", page: 7, usageId: 67, label: "F10", x: 12, y: 0, category: "fn" },
  { id: "f11", page: 7, usageId: 68, label: "F11", x: 13, y: 0, category: "fn" },
  { id: "f12", page: 7, usageId: 69, label: "F12", x: 14, y: 0, category: "fn" },

  { id: "prtsc", page: 7, usageId: 70, label: "PrtSc", x: 15.25, y: 0, category: "nav" },
  { id: "scrlk", page: 7, usageId: 71, label: "ScrLk", x: 16.25, y: 0, category: "nav" },
  { id: "pause", page: 7, usageId: 72, label: "Pause", x: 17.25, y: 0, category: "nav" },

  // Media shortcuts above numpad for convenience
  { id: "np-mute", page: 12, usageId: 226, label: "🔇", subLabel: "Mute", x: 18.5, y: 0, category: "numpad" },
  { id: "np-voldn", page: 12, usageId: 234, label: "🔉", subLabel: "Vol-", x: 19.5, y: 0, category: "numpad" },
  { id: "np-volup", page: 12, usageId: 233, label: "🔊", subLabel: "Vol+", x: 20.5, y: 0, category: "numpad" },
  { id: "np-play", page: 12, usageId: 205, label: "⏯", subLabel: "Play", x: 21.5, y: 0, category: "numpad" },

  // Row 1: Number row (y = 1.2)
  { id: "grave", page: 7, usageId: 53, label: "`", subLabel: "~", x: 0, y: 1.2, category: "alpha" },
  { id: "1", page: 7, usageId: 30, label: "1", subLabel: "!", x: 1, y: 1.2, category: "alpha" },
  { id: "2", page: 7, usageId: 31, label: "2", subLabel: "@", x: 2, y: 1.2, category: "alpha" },
  { id: "3", page: 7, usageId: 32, label: "3", subLabel: "#", x: 3, y: 1.2, category: "alpha" },
  { id: "4", page: 7, usageId: 33, label: "4", subLabel: "$", x: 4, y: 1.2, category: "alpha" },
  { id: "5", page: 7, usageId: 34, label: "5", subLabel: "%", x: 5, y: 1.2, category: "alpha" },
  { id: "6", page: 7, usageId: 35, label: "6", subLabel: "^", x: 6, y: 1.2, category: "alpha" },
  { id: "7", page: 7, usageId: 36, label: "7", subLabel: "&", x: 7, y: 1.2, category: "alpha" },
  { id: "8", page: 7, usageId: 37, label: "8", subLabel: "*", x: 8, y: 1.2, category: "alpha" },
  { id: "9", page: 7, usageId: 38, label: "9", subLabel: "(", x: 9, y: 1.2, category: "alpha" },
  { id: "0", page: 7, usageId: 39, label: "0", subLabel: ")", x: 10, y: 1.2, category: "alpha" },
  { id: "minus", page: 7, usageId: 45, label: "-", subLabel: "_", x: 11, y: 1.2, category: "alpha" },
  { id: "equal", page: 7, usageId: 46, label: "=", subLabel: "+", x: 12, y: 1.2, category: "alpha" },
  { id: "bksp", page: 7, usageId: 42, label: "Backspace", x: 13, y: 1.2, w: 2, category: "mod" },

  { id: "ins", page: 7, usageId: 73, label: "Ins", x: 15.25, y: 1.2, category: "nav" },
  { id: "home", page: 7, usageId: 74, label: "Home", x: 16.25, y: 1.2, category: "nav" },
  { id: "pgup", page: 7, usageId: 75, label: "PgUp", x: 17.25, y: 1.2, category: "nav" },

  { id: "numlock", page: 7, usageId: 83, label: "Num", x: 18.5, y: 1.2, category: "mod" },
  { id: "kp_slash", page: 7, usageId: 84, label: "/", x: 19.5, y: 1.2, category: "numpad" },
  { id: "kp_asterisk", page: 7, usageId: 85, label: "*", x: 20.5, y: 1.2, category: "numpad" },
  { id: "kp_minus", page: 7, usageId: 86, label: "-", x: 21.5, y: 1.2, category: "numpad" },

  // Row 2: Tab / QWERTY row (y = 2.2)
  { id: "tab", page: 7, usageId: 43, label: "Tab", x: 0, y: 2.2, w: 1.5, category: "mod" },
  { id: "q", page: 7, usageId: 20, label: "Q", x: 1.5, y: 2.2, category: "alpha" },
  { id: "w", page: 7, usageId: 26, label: "W", x: 2.5, y: 2.2, category: "alpha" },
  { id: "e", page: 7, usageId: 8, label: "E", x: 3.5, y: 2.2, category: "alpha" },
  { id: "r", page: 7, usageId: 21, label: "R", x: 4.5, y: 2.2, category: "alpha" },
  { id: "t", page: 7, usageId: 23, label: "T", x: 5.5, y: 2.2, category: "alpha" },
  { id: "y", page: 7, usageId: 28, label: "Y", x: 6.5, y: 2.2, category: "alpha" },
  { id: "u", page: 7, usageId: 24, label: "U", x: 7.5, y: 2.2, category: "alpha" },
  { id: "i", page: 7, usageId: 12, label: "I", x: 8.5, y: 2.2, category: "alpha" },
  { id: "o", page: 7, usageId: 18, label: "O", x: 9.5, y: 2.2, category: "alpha" },
  { id: "p", page: 7, usageId: 19, label: "P", x: 10.5, y: 2.2, category: "alpha" },
  { id: "lbracket", page: 7, usageId: 47, label: "[", subLabel: "{", x: 11.5, y: 2.2, category: "alpha" },
  { id: "rbracket", page: 7, usageId: 48, label: "]", subLabel: "}", x: 12.5, y: 2.2, category: "alpha" },
  { id: "backslash", page: 7, usageId: 49, label: "\\", subLabel: "|", x: 13.5, y: 2.2, w: 1.5, category: "alpha" },

  { id: "del", page: 7, usageId: 76, label: "Del", x: 15.25, y: 2.2, category: "nav" },
  { id: "end", page: 7, usageId: 77, label: "End", x: 16.25, y: 2.2, category: "nav" },
  { id: "pgdn", page: 7, usageId: 78, label: "PgDn", x: 17.25, y: 2.2, category: "nav" },

  { id: "kp_7", page: 7, usageId: 95, label: "7", subLabel: "Home", x: 18.5, y: 2.2, category: "numpad" },
  { id: "kp_8", page: 7, usageId: 96, label: "8", subLabel: "↑", x: 19.5, y: 2.2, category: "numpad" },
  { id: "kp_9", page: 7, usageId: 97, label: "9", subLabel: "PgUp", x: 20.5, y: 2.2, category: "numpad" },
  { id: "kp_plus", page: 7, usageId: 87, label: "+", x: 21.5, y: 2.2, w: 1, h: 2, category: "numpad" },

  // Row 3: Caps / Home row (y = 3.2)
  { id: "caps", page: 7, usageId: 57, label: "Caps", x: 0, y: 3.2, w: 1.75, category: "mod" },
  { id: "a", page: 7, usageId: 4, label: "A", x: 1.75, y: 3.2, category: "alpha" },
  { id: "s", page: 7, usageId: 22, label: "S", x: 2.75, y: 3.2, category: "alpha" },
  { id: "d", page: 7, usageId: 7, label: "D", x: 3.75, y: 3.2, category: "alpha" },
  { id: "f", page: 7, usageId: 9, label: "F", x: 4.75, y: 3.2, category: "alpha" },
  { id: "g", page: 7, usageId: 10, label: "G", x: 5.75, y: 3.2, category: "alpha" },
  { id: "h", page: 7, usageId: 11, label: "H", x: 6.75, y: 3.2, category: "alpha" },
  { id: "j", page: 7, usageId: 13, label: "J", x: 7.75, y: 3.2, category: "alpha" },
  { id: "k", page: 7, usageId: 14, label: "K", x: 8.75, y: 3.2, category: "alpha" },
  { id: "l", page: 7, usageId: 15, label: "L", x: 9.75, y: 3.2, category: "alpha" },
  { id: "semicolon", page: 7, usageId: 51, label: ";", subLabel: ":", x: 10.75, y: 3.2, category: "alpha" },
  { id: "quote", page: 7, usageId: 52, label: "'", subLabel: '"', x: 11.75, y: 3.2, category: "alpha" },
  { id: "enter", page: 7, usageId: 40, label: "Enter", x: 12.75, y: 3.2, w: 2.25, category: "mod" },

  { id: "kp_4", page: 7, usageId: 92, label: "4", subLabel: "←", x: 18.5, y: 3.2, category: "numpad" },
  { id: "kp_5", page: 7, usageId: 93, label: "5", x: 19.5, y: 3.2, category: "numpad" },
  { id: "kp_6", page: 7, usageId: 94, label: "6", subLabel: "→", x: 20.5, y: 3.2, category: "numpad" },

  // Row 4: Shift / Z-M row (y = 4.2)
  { id: "lshift", page: 7, usageId: 225, label: "L Shift", x: 0, y: 4.2, w: 2.25, category: "mod" },
  { id: "z", page: 7, usageId: 29, label: "Z", x: 2.25, y: 4.2, category: "alpha" },
  { id: "x", page: 7, usageId: 27, label: "X", x: 3.25, y: 4.2, category: "alpha" },
  { id: "c", page: 7, usageId: 6, label: "C", x: 4.25, y: 4.2, category: "alpha" },
  { id: "v", page: 7, usageId: 25, label: "V", x: 5.25, y: 4.2, category: "alpha" },
  { id: "b", page: 7, usageId: 5, label: "B", x: 6.25, y: 4.2, category: "alpha" },
  { id: "n", page: 7, usageId: 17, label: "N", x: 7.25, y: 4.2, category: "alpha" },
  { id: "m", page: 7, usageId: 16, label: "M", x: 8.25, y: 4.2, category: "alpha" },
  { id: "comma", page: 7, usageId: 54, label: ",", subLabel: "<", x: 9.25, y: 4.2, category: "alpha" },
  { id: "period", page: 7, usageId: 55, label: ".", subLabel: ">", x: 10.25, y: 4.2, category: "alpha" },
  { id: "slash", page: 7, usageId: 56, label: "/", subLabel: "?", x: 11.25, y: 4.2, category: "alpha" },
  { id: "rshift", page: 7, usageId: 229, label: "R Shift", x: 12.25, y: 4.2, w: 2.75, category: "mod" },

  { id: "up", page: 7, usageId: 82, label: "↑", x: 16.25, y: 4.2, category: "nav" },

  { id: "kp_1", page: 7, usageId: 89, label: "1", subLabel: "End", x: 18.5, y: 4.2, category: "numpad" },
  { id: "kp_2", page: 7, usageId: 90, label: "2", subLabel: "↓", x: 19.5, y: 4.2, category: "numpad" },
  { id: "kp_3", page: 7, usageId: 91, label: "3", subLabel: "PgDn", x: 20.5, y: 4.2, category: "numpad" },
  { id: "kp_enter", page: 7, usageId: 88, label: "Enter", x: 21.5, y: 4.2, w: 1, h: 2, category: "mod" },

  // Row 5: Bottom modifier row (y = 5.2)
  { id: "lctrl", page: 7, usageId: 224, label: "L Ctrl", x: 0, y: 5.2, w: 1.25, category: "mod" },
  { id: "lgui", page: 7, usageId: 227, label: "L GUI", x: 1.25, y: 5.2, w: 1.25, category: "mod" },
  { id: "lalt", page: 7, usageId: 226, label: "L Alt", x: 2.5, y: 5.2, w: 1.25, category: "mod" },
  { id: "space", page: 7, usageId: 44, label: "Space", x: 3.75, y: 5.2, w: 6.25, category: "alpha" },
  { id: "ralt", page: 7, usageId: 230, label: "R Alt", x: 10, y: 5.2, w: 1.25, category: "mod" },
  { id: "rgui", page: 7, usageId: 231, label: "R GUI", x: 11.25, y: 5.2, w: 1.25, category: "mod" },
  { id: "app", page: 7, usageId: 101, label: "Menu", x: 12.5, y: 5.2, w: 1.25, category: "mod" },
  { id: "rctrl", page: 7, usageId: 228, label: "R Ctrl", x: 13.75, y: 5.2, w: 1.25, category: "mod" },

  { id: "left", page: 7, usageId: 80, label: "←", x: 15.25, y: 5.2, category: "nav" },
  { id: "down", page: 7, usageId: 81, label: "↓", x: 16.25, y: 5.2, category: "nav" },
  { id: "right", page: 7, usageId: 79, label: "→", x: 17.25, y: 5.2, category: "nav" },

  { id: "kp_0", page: 7, usageId: 98, label: "0", subLabel: "Ins", x: 18.5, y: 5.2, w: 2, category: "numpad" },
  { id: "kp_dot", page: 7, usageId: 99, label: ".", subLabel: "Del", x: 20.5, y: 5.2, w: 1, category: "numpad" },
];

enum ImplicitMods {
  LeftControl = 0x01,
  LeftShift = 0x02,
  LeftAlt = 0x04,
  LeftGUI = 0x08,
  RightControl = 0x10,
  RightShift = 0x20,
  RightAlt = 0x40,
  RightGUI = 0x80,
}

const IMPLICIT_MOD_LIST: { flag: ImplicitMods; label: string; short: string }[] = [
  { flag: ImplicitMods.LeftControl, label: "L Ctrl", short: "LCtrl" },
  { flag: ImplicitMods.LeftShift, label: "L Shift", short: "LShift" },
  { flag: ImplicitMods.LeftAlt, label: "L Alt", short: "LAlt" },
  { flag: ImplicitMods.LeftGUI, label: "L GUI", short: "LGUI" },
  { flag: ImplicitMods.RightControl, label: "R Ctrl", short: "RCtrl" },
  { flag: ImplicitMods.RightShift, label: "R Shift", short: "RShift" },
  { flag: ImplicitMods.RightAlt, label: "R Alt", short: "RAlt" },
  { flag: ImplicitMods.RightGUI, label: "R GUI", short: "RGUI" },
];

const ALL_MOD_MASK = 0xff;

function extractModFlags(value?: number): number {
  if (!value) return 0;
  return (value >>> 24) & ALL_MOD_MASK;
}

function stripModFlags(value?: number): number {
  if (!value) return 0;
  return value & ~(ALL_MOD_MASK << 24);
}

function applyModFlags(baseUsage: number, modFlags: number): number {
  return (stripModFlags(baseUsage) | ((modFlags & ALL_MOD_MASK) << 24)) >>> 0;
}

export interface StandardKeyboardKeyPickerProps {
  value?: number;
  onValueChanged: (value: number) => void;
  showModifierBar?: boolean;
}

const TOTAL_UNITS_X = 22.5;
const TOTAL_UNITS_Y = 6.2;
const BASE_ONE_U = 42;

export const StandardKeyboardKeyPicker = ({
  value,
  onValueChanged,
  showModifierBar = true,
}: StandardKeyboardKeyPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const activeModFlags = useMemo(() => extractModFlags(value), [value]);
  const baseUsage = useMemo(() => stripModFlags(value), [value]);

  const naturalWidth = TOTAL_UNITS_X * BASE_ONE_U;
  const naturalHeight = TOTAL_UNITS_Y * BASE_ONE_U;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const availableWidth = el.clientWidth - 8;
      if (availableWidth <= 0) return;
      const nextScale = Math.min(1, availableWidth / naturalWidth);
      setScale(nextScale);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [naturalWidth]);

  const handleKeyClick = useCallback(
    (page: number, usageId: number) => {
      const raw = hid_usage_from_page_and_id(page, usageId);
      const withMods = applyModFlags(raw, activeModFlags);
      onValueChanged(withMods);
    },
    [activeModFlags, onValueChanged]
  );

  const handleToggleMod = useCallback(
    (flag: ImplicitMods) => {
      const nextFlags = activeModFlags ^ flag;
      const targetBase = baseUsage || hid_usage_from_page_and_id(7, 4);
      onValueChanged(applyModFlags(targetBase, nextFlags));
    },
    [activeModFlags, baseUsage, onValueChanged]
  );

  const handleClearMods = useCallback(() => {
    if (!baseUsage) return;
    onValueChanged(baseUsage);
  }, [baseUsage, onValueChanged]);

  return (
    <div className="flex flex-col gap-2 w-full select-none">
      {showModifierBar && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-medium text-base-content/60 mr-1">
              Modifiers (Hold + Key):
            </span>
            {IMPLICIT_MOD_LIST.map((mod) => {
              const isActive = (activeModFlags & mod.flag) !== 0;
              return (
                <button
                  key={mod.flag}
                  type="button"
                  onClick={() => handleToggleMod(mod.flag)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border ${
                    isActive
                      ? "bg-primary text-primary-content border-secondary shadow-sm"
                      : "bg-base-100 text-base-content border-white/10 hover:bg-[#2b2f32] hover:border-secondary"
                  }`}
                >
                  {mod.label}
                </button>
              );
            })}
            {activeModFlags !== 0 && (
              <button
                type="button"
                onClick={handleClearMods}
                className="px-2 py-0.5 rounded text-[11px] font-medium text-secondary hover:bg-base-300 transition-colors"
              >
                Clear Mods
              </button>
            )}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full flex justify-center overflow-hidden"
        style={{
          height: `${Math.ceil(naturalHeight * scale) + 6}px`,
        }}
      >
        <div
          className="relative origin-top"
          style={{
            width: `${naturalWidth}px`,
            height: `${naturalHeight}px`,
            transform: `scale(${scale})`,
          }}
        >
          {FULL_SIZE_ANSI_KEYS.map((k) => {
            const keyUsage = hid_usage_from_page_and_id(k.page, k.usageId);
            const isSelected = baseUsage === keyUsage;
            const widthPx = (k.w || 1) * BASE_ONE_U - 3;
            const heightPx = (k.h || 1) * BASE_ONE_U - 3;
            const leftPx = k.x * BASE_ONE_U;
            const topPx = k.y * BASE_ONE_U;

            return (
              <button
                key={k.id}
                type="button"
                onClick={() => handleKeyClick(k.page, k.usageId)}
                style={{
                  left: `${leftPx}px`,
                  top: `${topPx}px`,
                  width: `${widthPx}px`,
                  height: `${heightPx}px`,
                }}
                title={
                  k.subLabel ? `${k.label} (${k.subLabel})` : k.label
                }
                className={`absolute rounded-md border flex flex-col items-center justify-center transition-all cursor-pointer focus:outline-none active:scale-95 ${
                  isSelected
                    ? "bg-primary text-primary-content border-secondary ring-2 ring-secondary/40 shadow-md z-10 font-semibold"
                    : "bg-base-100 text-base-content border-white/10 hover:bg-[#2b2f32] hover:border-secondary hover:shadow-sm"
                }`}
              >
                {k.subLabel ? (
                  <>
                    <span
                      className={`text-[9px] leading-none ${
                        isSelected
                          ? "text-primary-content/85"
                          : "text-base-content/60"
                      }`}
                    >
                      {k.subLabel}
                    </span>
                    <span className="text-[12px] font-medium leading-tight mt-0.5">
                      {k.label}
                    </span>
                  </>
                ) : (
                  <span
                    className={`${
                      k.label.length > 5
                        ? "text-[10px]"
                        : k.label.length > 3
                          ? "text-[11px]"
                          : "text-[12px]"
                    } font-medium leading-tight px-0.5 truncate max-w-full`}
                  >
                    {k.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
