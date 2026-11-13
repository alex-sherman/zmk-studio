import { useCallback, useEffect, useMemo, useState } from "react";

import {
  GetBehaviorDetailsResponse,
  BehaviorBindingParametersSet,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { BehaviorParametersPicker } from "./BehaviorParametersPicker";
import { validateValue } from "./parameters";
import { StandardKeyboardKeyPicker } from "./StandardKeyboardKeyPicker";
import { HidUsagePicker } from "./HidUsagePicker";
import {
  format_hid_usage_display,
  hid_usage_from_page_and_id,
} from "../hid-usages";
import { Keyboard, Volume2, Layers, Sliders } from "lucide-react";

export interface BehaviorBindingPickerProps {
  binding: BehaviorBinding;
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  onBindingChanged: (binding: BehaviorBinding) => void;
}

type PickerTab = "basic" | "media" | "layers" | "advanced";

interface QuickHidKey {
  id: string;
  label: string;
  subLabel?: string;
  page: number;
  usageId: number;
}

const MEDIA_KEYS: QuickHidKey[] = [
  { id: "mute", label: "🔇 Mute", subLabel: "Audio Mute", page: 12, usageId: 226 },
  { id: "voldn", label: "🔉 Vol -", subLabel: "Volume Down", page: 12, usageId: 234 },
  { id: "volup", label: "🔊 Vol +", subLabel: "Volume Up", page: 12, usageId: 233 },
  { id: "play", label: "⏯ Play/Pause", subLabel: "Media Play", page: 12, usageId: 205 },
  { id: "prev", label: "⏮ Prev", subLabel: "Prev Track", page: 12, usageId: 182 },
  { id: "next", label: "⏭ Next", subLabel: "Next Track", page: 12, usageId: 181 },
  { id: "stop", label: "⏹ Stop", subLabel: "Stop Track", page: 12, usageId: 183 },
  { id: "bridn", label: "🔅 Bri -", subLabel: "Brightness -", page: 12, usageId: 112 },
  { id: "briup", label: "🔆 Bri +", subLabel: "Brightness +", page: 12, usageId: 111 },
];

const F13_TO_F24_KEYS: QuickHidKey[] = Array.from({ length: 12 }, (_, i) => ({
  id: `f${13 + i}`,
  label: `F${13 + i}`,
  page: 7,
  usageId: 104 + i,
}));

const EXTRA_SYSTEM_KEYS: QuickHidKey[] = [
  { id: "sys_pwr", label: "⏻ Power", subLabel: "System", page: 12, usageId: 48 },
  { id: "sys_slp", label: "🌙 Sleep", subLabel: "System", page: 12, usageId: 50 },
  { id: "undo", label: "Undo", page: 7, usageId: 122 },
  { id: "cut", label: "Cut", page: 7, usageId: 123 },
  { id: "copy", label: "Copy", page: 7, usageId: 124 },
  { id: "paste", label: "Paste", page: 7, usageId: 125 },
  { id: "find", label: "Find", page: 7, usageId: 126 },
  { id: "nubs", label: "ISO \\ |", subLabel: "Non-US \\", page: 7, usageId: 100 },
  { id: "nuhs", label: "ISO # ~", subLabel: "Non-US #", page: 7, usageId: 50 },
  { id: "kp_eq", label: "KP =", subLabel: "Numpad =", page: 7, usageId: 103 },
];

function validateBinding(
  metadata: BehaviorBindingParametersSet[],
  layerIds: number[],
  param1?: number,
  param2?: number
): boolean {
  if (
    (param1 === undefined || param1 === 0) &&
    metadata.every((s) => !s.param1 || s.param1.length === 0)
  ) {
    return true;
  }

  const matchingSet = metadata.find((s) =>
    validateValue(layerIds, param1, s.param1)
  );

  if (!matchingSet) {
    return false;
  }

  return validateValue(layerIds, param2, matchingSet.param2);
}

function isSingleHidBehavior(b: GetBehaviorDetailsResponse): boolean {
  return (
    b.metadata?.some(
      (s) =>
        s.param1?.some((p) => p.hidUsage !== undefined) &&
        (!s.param2 || s.param2.length === 0)
    ) ?? false
  );
}

function isZeroParamBehavior(b: GetBehaviorDetailsResponse): boolean {
  return (
    !b.metadata ||
    b.metadata.length === 0 ||
    b.metadata.every(
      (s) =>
        (!s.param1 || s.param1.length === 0 || s.param1.every((p) => p.nil !== undefined)) &&
        (!s.param2 || s.param2.length === 0)
    )
  );
}

function isSingleLayerBehavior(b: GetBehaviorDetailsResponse): boolean {
  return (
    b.metadata?.some(
      (s) =>
        s.param1?.some((p) => p.layerId !== undefined) &&
        (!s.param2 || s.param2.length === 0)
    ) ?? false
  );
}

function isLayerTapBehavior(b: GetBehaviorDetailsResponse): boolean {
  return (
    b.metadata?.some(
      (s) =>
        s.param1?.some((p) => p.layerId !== undefined) &&
        s.param2?.some((p) => p.hidUsage !== undefined)
    ) ?? false
  );
}

export const BehaviorBindingPicker = ({
  binding,
  layers,
  behaviors,
  onBindingChanged,
}: BehaviorBindingPickerProps) => {
  const [activeTab, setActiveTab] = useState<PickerTab>("basic");
  const [behaviorId, setBehaviorId] = useState(binding.behaviorId);
  const [param1, setParam1] = useState<number | undefined>(binding.param1);
  const [param2, setParam2] = useState<number | undefined>(binding.param2);
  const [activeHidSlot, setActiveHidSlot] = useState<"param1" | "param2">("param1");

  const metadata = useMemo(
    () => behaviors.find((b) => b.id === behaviorId)?.metadata,
    [behaviorId, behaviors]
  );

  const currentBehavior = useMemo(
    () => behaviors.find((b) => b.id === behaviorId),
    [behaviorId, behaviors]
  );

  const sortedBehaviors = useMemo(
    () => [...behaviors].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [behaviors]
  );

  const keyPressBehavior = useMemo(
    () =>
      behaviors.find(
        (b) => b.displayName.toLowerCase() === "key press"
      ) || behaviors.find(isSingleHidBehavior),
    [behaviors]
  );

  const singleHidBehaviors = useMemo(
    () => behaviors.filter(isSingleHidBehavior),
    [behaviors]
  );

  const transparentBehavior = useMemo(
    () =>
      behaviors.find((b) =>
        b.displayName.toLowerCase().includes("transparent")
      ),
    [behaviors]
  );

  const noneBehavior = useMemo(
    () => behaviors.find((b) => b.displayName.toLowerCase() === "none"),
    [behaviors]
  );

  const singleLayerBehaviors = useMemo(
    () => behaviors.filter(isSingleLayerBehavior),
    [behaviors]
  );

  const layerTapBehaviors = useMemo(
    () => behaviors.filter(isLayerTapBehavior),
    [behaviors]
  );

  const zeroParamBehaviors = useMemo(
    () => behaviors.filter(isZeroParamBehavior),
    [behaviors]
  );

  const constantBehaviors = useMemo(
    () =>
      behaviors.filter((b) =>
        b.metadata?.some(
          (s) =>
            s.param1?.some((p) => p.constant !== undefined) &&
            (!s.param2 || s.param2.length === 0)
        )
      ),
    [behaviors]
  );

  useEffect(() => {
    if (
      binding.behaviorId === behaviorId &&
      binding.param1 === param1 &&
      binding.param2 === param2
    ) {
      return;
    }

    if (!metadata) {
      return;
    }

    if (
      validateBinding(
        metadata,
        layers.map(({ id }) => id),
        param1,
        param2
      )
    ) {
      onBindingChanged({
        behaviorId,
        param1: param1 || 0,
        param2: param2 || 0,
      });
    }
  }, [behaviorId, param1, param2]);

  useEffect(() => {
    setBehaviorId(binding.behaviorId);
    setParam1(binding.param1);
    setParam2(binding.param2);
  }, [binding]);

  // Assign a standard HID key (used in Basic and Media tabs)
  const assignHidKey = useCallback(
    (usage: number) => {
      // If current behavior is already a single-HID behavior (e.g. Key Press, Sticky Key, Key Toggle), keep it
      const targetBehavior =
        currentBehavior && isSingleHidBehavior(currentBehavior)
          ? currentBehavior
          : keyPressBehavior;

      if (!targetBehavior) return;
      setBehaviorId(targetBehavior.id);
      setParam1(usage);
      setParam2(0);
    },
    [currentBehavior, keyPressBehavior]
  );

  const assignDirectBinding = useCallback(
    (nextBehaviorId: number, nextParam1 = 0, nextParam2 = 0) => {
      setBehaviorId(nextBehaviorId);
      setParam1(nextParam1);
      setParam2(nextParam2);
    },
    []
  );

  // Format summary badge for current binding
  const bindingSummary = useMemo(() => {
    if (!currentBehavior) return "Unknown";
    if (isZeroParamBehavior(currentBehavior)) {
      return currentBehavior.displayName;
    }
    if (isSingleHidBehavior(currentBehavior)) {
      return `${currentBehavior.displayName}: ${format_hid_usage_display(param1)}`;
    }
    if (isSingleLayerBehavior(currentBehavior)) {
      const layerName =
        layers.find((l) => l.id === param1)?.name ?? `Layer ${param1 ?? 0}`;
      return `${currentBehavior.displayName}: ${layerName}`;
    }
    if (isLayerTapBehavior(currentBehavior)) {
      const layerName =
        layers.find((l) => l.id === param1)?.name ?? `Layer ${param1 ?? 0}`;
      return `${currentBehavior.displayName}: ${layerName} / ${format_hid_usage_display(param2)}`;
    }
    const param1Const = currentBehavior.metadata
      ?.flatMap((s) => s.param1)
      .find((p) => p.constant !== undefined && p.constant === param1);
    if (param1Const) {
      return `${currentBehavior.displayName}: ${param1Const.name}`;
    }
    return currentBehavior.displayName;
  }, [currentBehavior, param1, param2, layers]);

  // Check if current behavior in Advanced tab has HID usage parameters
  const param1HasHid = useMemo(
    () =>
      metadata?.some((s) => s.param1?.some((p) => p.hidUsage !== undefined)) ??
      false,
    [metadata]
  );
  const param2HasHid = useMemo(
    () =>
      metadata?.some((s) => s.param2?.some((p) => p.hidUsage !== undefined)) ??
      false,
    [metadata]
  );

  useEffect(() => {
    if (!param1HasHid && param2HasHid) {
      setActiveHidSlot("param2");
    } else if (param1HasHid && !param2HasHid) {
      setActiveHidSlot("param1");
    }
  }, [param1HasHid, param2HasHid]);

  const activeSingleHidValue = useMemo(() => {
    if (currentBehavior && isSingleHidBehavior(currentBehavior)) {
      return param1;
    }
    return undefined;
  }, [currentBehavior, param1]);

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-base-300 pb-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
              activeTab === "basic"
                ? "bg-primary text-primary-content shadow-sm"
                : "bg-base-300/70 text-base-content hover:bg-base-300"
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            Basic Keys
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("media")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
              activeTab === "media"
                ? "bg-primary text-primary-content shadow-sm"
                : "bg-base-300/70 text-base-content hover:bg-base-300"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            Media & System
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("layers")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
              activeTab === "layers"
                ? "bg-primary text-primary-content shadow-sm"
                : "bg-base-300/70 text-base-content hover:bg-base-300"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Layers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("advanced")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
              activeTab === "advanced"
                ? "bg-primary text-primary-content shadow-sm"
                : "bg-base-300/70 text-base-content hover:bg-base-300"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            All Behaviors
          </button>
        </div>

        {/* Right Side: Quick Actions + Current Binding Badge */}
        <div className="flex flex-wrap items-center gap-1.5">
          {transparentBehavior && (
            <button
              type="button"
              onClick={() => assignDirectBinding(transparentBehavior.id, 0, 0)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                behaviorId === transparentBehavior.id
                  ? "bg-primary text-primary-content border-primary"
                  : "bg-base-100 text-base-content border-base-300 hover:border-primary/60"
              }`}
              title="Set key to Transparent (pass through to lower layer)"
            >
              ▽ Transparent
            </button>
          )}
          {noneBehavior && (
            <button
              type="button"
              onClick={() => assignDirectBinding(noneBehavior.id, 0, 0)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                behaviorId === noneBehavior.id
                  ? "bg-primary text-primary-content border-primary"
                  : "bg-base-100 text-base-content border-base-300 hover:border-primary/60"
              }`}
              title="Disable this key position (None)"
            >
              ✕ None
            </button>
          )}
          <div className="px-2.5 py-1 rounded-full bg-primary/20 border border-secondary/35 text-secondary text-[11px] font-medium">
            Active: <span className="font-semibold">{bindingSummary}</span>
          </div>
        </div>
      </div>

      {/* TAB 1: BASIC (Standard Full-Size Keyboard) */}
      {activeTab === "basic" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            {singleHidBehaviors.length > 1 && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-medium text-base-content/60 mr-1">
                  Key Mode:
                </span>
                {singleHidBehaviors.map((b) => {
                  const isCurrent = behaviorId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setBehaviorId(b.id);
                        if (!param1) {
                          setParam1(hid_usage_from_page_and_id(7, 4));
                        }
                        setParam2(0);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                        isCurrent
                          ? "bg-primary text-primary-content border-primary"
                          : "bg-base-100 text-base-content/80 border-base-300 hover:bg-base-300"
                      }`}
                    >
                      {b.displayName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <StandardKeyboardKeyPicker
            value={activeSingleHidValue}
            onValueChanged={assignHidKey}
            showModifierBar={true}
          />
        </div>
      )}

      {/* TAB 2: MEDIA & SYSTEM */}
      {activeTab === "media" && (
        <div className="flex flex-col gap-3 p-1 max-h-[270px] overflow-y-auto">
          {/* Media & Brightness */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/60 mb-1.5">
              Media & Display
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MEDIA_KEYS.map((k) => {
                const usage = hid_usage_from_page_and_id(k.page, k.usageId);
                const isSelected = activeSingleHidValue === usage;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => assignHidKey(usage)}
                    className={`px-3 py-1.5 rounded-md border text-[12px] font-medium flex flex-col items-center min-w-[76px] transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? "bg-primary text-primary-content border-secondary ring-2 ring-secondary/40 shadow-sm"
                        : "bg-base-100 text-base-content border-white/10 hover:bg-[#2b2f32] hover:border-secondary"
                    }`}
                  >
                    <span>{k.label}</span>
                    {k.subLabel && (
                      <span
                        className={`text-[10px] ${
                          isSelected
                            ? "text-primary-content/80"
                            : "text-base-content/55"
                        }`}
                      >
                        {k.subLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Extended Function Keys F13-F24 */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/60 mb-1.5">
              Extended Function Keys (F13 – F24)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {F13_TO_F24_KEYS.map((k) => {
                const usage = hid_usage_from_page_and_id(k.page, k.usageId);
                const isSelected = activeSingleHidValue === usage;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => assignHidKey(usage)}
                    className={`w-11 h-9 rounded-md border text-[12px] font-medium flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? "bg-primary text-primary-content border-secondary ring-2 ring-secondary/40 shadow-sm"
                        : "bg-base-100 text-base-content border-white/10 hover:bg-[#2b2f32] hover:border-secondary"
                    }`}
                  >
                    {k.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* System / Editing / ISO Keys & ZMK Direct Behaviors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/60 mb-1.5">
                System, Editing & ISO Keys
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EXTRA_SYSTEM_KEYS.map((k) => {
                  const usage = hid_usage_from_page_and_id(k.page, k.usageId);
                  const isSelected = activeSingleHidValue === usage;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => assignHidKey(usage)}
                      className={`px-2.5 py-1.5 rounded-md border text-[12px] font-medium flex flex-col items-center transition-all cursor-pointer active:scale-95 ${
                        isSelected
                          ? "bg-primary text-primary-content border-secondary ring-2 ring-secondary/40 shadow-sm"
                          : "bg-base-100 text-base-content border-white/10 hover:bg-[#2b2f32] hover:border-secondary"
                      }`}
                    >
                      <span>{k.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {(zeroParamBehaviors.length > 0 || constantBehaviors.length > 0) && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/60 mb-1.5">
                  ZMK System & Hardware Actions
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {zeroParamBehaviors.map((b) => {
                    const isSelected = behaviorId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => assignDirectBinding(b.id, 0, 0)}
                        className={`px-2.5 py-1.5 rounded-md border text-[12px] font-medium transition-all cursor-pointer active:scale-95 ${
                          isSelected
                            ? "bg-primary text-primary-content border-secondary ring-2 ring-secondary/40 shadow-sm"
                            : "bg-base-100 text-base-content border-white/10 hover:bg-[#2b2f32] hover:border-secondary"
                        }`}
                      >
                        {b.displayName}
                      </button>
                    );
                  })}
                  {constantBehaviors.map((b) =>
                    b.metadata
                      .filter((s) => !s.param2 || s.param2.length === 0)
                      .flatMap((s) => s.param1)
                      .filter((p) => p.constant !== undefined)
                      .map((p) => {
                        const isSelected =
                          behaviorId === b.id && param1 === p.constant;
                        return (
                          <button
                            key={`${b.id}-${p.constant}`}
                            type="button"
                            onClick={() =>
                              assignDirectBinding(b.id, p.constant!, 0)
                            }
                            className={`px-2.5 py-1.5 rounded-md border text-[12px] font-medium transition-all cursor-pointer active:scale-95 ${
                              isSelected
                                ? "bg-primary text-primary-content border-secondary ring-2 ring-secondary/40 shadow-sm"
                                : "bg-base-100 text-base-content border-white/10 hover:bg-[#2b2f32] hover:border-secondary"
                            }`}
                          >
                            {b.displayName}: {p.name}
                          </button>
                        );
                      })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LAYERS */}
      {activeTab === "layers" && (
        <div className="flex flex-col gap-3 p-1 max-h-[270px] overflow-y-auto">
          {singleLayerBehaviors.length === 0 && layerTapBehaviors.length === 0 ? (
            <div className="text-sm text-base-content/70 py-4">
              No layer behaviors reported by this device. Use the{" "}
              <button
                type="button"
                className="underline text-primary"
                onClick={() => setActiveTab("advanced")}
              >
                All Behaviors
              </button>{" "}
              tab to configure bindings.
            </div>
          ) : (
            <>
              {singleLayerBehaviors.map((b) => (
                <div key={b.id} className="flex flex-col gap-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/60">
                    {b.displayName}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {layers.map((layer) => {
                      const isSelected =
                        behaviorId === b.id && param1 === layer.id;
                      return (
                        <button
                          key={layer.id}
                          type="button"
                          onClick={() =>
                            assignDirectBinding(b.id, layer.id, 0)
                          }
                          className={`px-3 py-1.5 rounded-md border text-[12px] font-medium transition-all cursor-pointer active:scale-95 ${
                            isSelected
                              ? "bg-primary text-primary-content border-secondary ring-2 ring-secondary/40 shadow-sm"
                              : "bg-base-100 text-base-content border-white/10 hover:bg-[#2b2f32] hover:border-secondary"
                          }`}
                        >
                          {b.displayName} → {layer.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {layerTapBehaviors.map((b) => {
                const isThisLayerTap = behaviorId === b.id;
                return (
                  <div
                    key={b.id}
                    className="flex flex-col gap-2 pt-2 border-t border-base-300"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/60">
                      {b.displayName} (Hold for Layer, Tap for Key)
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[12px] text-base-content/70">
                          1. Hold Layer:
                        </span>
                        {layers.map((layer) => {
                          const isSelected =
                            isThisLayerTap && param1 === layer.id;
                          return (
                            <button
                              key={layer.id}
                              type="button"
                              onClick={() => {
                                setBehaviorId(b.id);
                                setParam1(layer.id);
                                if (!param2) {
                                  setParam2(hid_usage_from_page_and_id(7, 44));
                                }
                              }}
                              className={`px-2.5 py-1 rounded border text-[12px] font-medium transition-all ${
                                isSelected
                                  ? "bg-primary text-primary-content border-primary"
                                  : "bg-base-100 text-base-content border-base-content/15 hover:border-primary/60"
                              }`}
                            >
                              {layer.name}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-base-content/70">
                          2. Tap Key:
                        </span>
                        <HidUsagePicker
                          value={isThisLayerTap ? param2 : undefined}
                          onValueChanged={(v) => {
                            if (v === undefined) return;
                            setBehaviorId(b.id);
                            if (param1 === undefined) {
                              setParam1(layers[0]?.id ?? 0);
                            }
                            setParam2(v);
                          }}
                          usagePages={[{ id: 7, min: 4 }, { id: 12 }]}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* TAB 4: ALL BEHAVIORS / ADVANCED */}
      {activeTab === "advanced" && (
        <div className="flex flex-col gap-2.5 p-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="behavior-select"
                className="text-[12px] font-medium"
              >
                Behavior:
              </label>
              <select
                id="behavior-select"
                value={behaviorId}
                className="h-8 rounded px-2 text-sm bg-base-100 border border-base-300"
                onChange={(e) => {
                  setBehaviorId(parseInt(e.target.value));
                  setParam1(0);
                  setParam2(0);
                }}
              >
                {sortedBehaviors.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.displayName}
                  </option>
                ))}
              </select>
            </div>

            {metadata && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <BehaviorParametersPicker
                  metadata={metadata}
                  param1={param1}
                  param2={param2}
                  layers={layers}
                  onParam1Changed={setParam1}
                  onParam2Changed={setParam2}
                />
              </div>
            )}

            {param1HasHid && param2HasHid && (
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[11px] text-base-content/60">
                  Visual Picker Target:
                </span>
                <button
                  type="button"
                  onClick={() => setActiveHidSlot("param1")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                    activeHidSlot === "param1"
                      ? "bg-primary text-primary-content border-primary"
                      : "bg-base-100 border-base-300"
                  }`}
                >
                  Param 1 ({format_hid_usage_display(param1)})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHidSlot("param2")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                    activeHidSlot === "param2"
                      ? "bg-primary text-primary-content border-primary"
                      : "bg-base-100 border-base-300"
                  }`}
                >
                  Param 2 ({format_hid_usage_display(param2)})
                </button>
              </div>
            )}
          </div>

          {(param1HasHid || param2HasHid) && (
            <StandardKeyboardKeyPicker
              value={
                param1HasHid && param2HasHid
                  ? activeHidSlot === "param1"
                    ? param1
                    : param2
                  : param1HasHid
                    ? param1
                    : param2
              }
              onValueChanged={(val) => {
                if (param1HasHid && param2HasHid) {
                  if (activeHidSlot === "param1") {
                    setParam1(val);
                  } else {
                    setParam2(val);
                  }
                } else if (param1HasHid) {
                  setParam1(val);
                } else {
                  setParam2(val);
                }
              }}
              showModifierBar={true}
            />
          )}
        </div>
      )}
    </div>
  );
};
