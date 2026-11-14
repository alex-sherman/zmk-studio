import {
  PhysicalLayout,
  Keymap as KeymapMsg,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";

import {
  LayoutZoom,
  PhysicalLayout as PhysicalLayoutComp,
} from "./PhysicalLayout";
import { HidUsageLabel } from "./HidUsageLabel";

type BehaviorMap = Record<number, GetBehaviorDetailsResponse>;

export interface KeymapProps {
  layout: PhysicalLayout;
  keymap: KeymapMsg;
  behaviors: BehaviorMap;
  scale: LayoutZoom;
  selectedLayerIndex: number;
  selectedKeyPosition: number | undefined;
  onKeyPositionClicked: (keyPosition: number) => void;
}

export const Keymap = ({
  layout,
  keymap,
  behaviors,
  scale,
  selectedLayerIndex,
  selectedKeyPosition,
  onKeyPositionClicked,
}: KeymapProps) => {
  if (!keymap.layers[selectedLayerIndex]) {
    return <></>;
  }

  const positions = layout.keys.map((k, i) => {
    if (i >= keymap.layers[selectedLayerIndex].bindings.length) {
      return {
        id: `${keymap.layers[selectedLayerIndex].id}-${i}`,
        header: "Unknown",
        x: k.x / 100.0,
        y: k.y / 100.0,
        width: k.width / 100,
        height: k.height / 100.0,
        children: <span></span>,
      };
    }

    const binding = keymap.layers[selectedLayerIndex].bindings[i];
    const behavior = behaviors[binding.behaviorId];
    const isLayerParam1 = behavior?.metadata?.some((s) =>
      s.param1?.some((p) => p.layerId !== undefined),
    );
    const isHidParam2 = behavior?.metadata?.some((s) =>
      s.param2?.some((p) => p.hidUsage !== undefined),
    );
    const targetLayerName = isLayerParam1
      ? keymap.layers.find((l) => l.id === binding.param1)?.name ||
        `${binding.param1}`
      : undefined;

    let children = <HidUsageLabel hid_usage={binding.param1} />;
    if (isLayerParam1 && !isHidParam2) {
      children = (
        <span className="text-xs font-medium leading-tight truncate max-w-full px-1 mt-3">
          {targetLayerName}
        </span>
      );
    } else if (isLayerParam1 && isHidParam2) {
      children = (
        <span className="mt-3">
          <HidUsageLabel hid_usage={binding.param2} />
        </span>
      );
    }

    return {
      id: `${keymap.layers[selectedLayerIndex].id}-${i}`,
      header: behavior?.displayName || "Unknown",
      x: k.x / 100.0,
      y: k.y / 100.0,
      width: k.width / 100,
      height: k.height / 100.0,
      r: (k.r || 0) / 100.0,
      rx: (k.rx || 0) / 100.0,
      ry: (k.ry || 0) / 100.0,
      children,
    };
  });

  return (
    <PhysicalLayoutComp
      positions={positions}
      oneU={48}
      hoverZoom={true}
      zoom={scale}
      selectedPosition={selectedKeyPosition}
      onPositionClicked={onKeyPositionClicked}
    />
  );
};
