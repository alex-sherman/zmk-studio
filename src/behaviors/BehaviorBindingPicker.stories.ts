import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { BehaviorBindingPicker } from "./BehaviorBindingPicker";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Behaviors/BehaviorBindingPicker",
  component: BehaviorBindingPicker,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    // backgroundColor: { control: 'color' },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: {
    layers: [
      { name: "Base", id: 0 },
      { id: 1, name: "Num" },
    ],
    onBindingChanged: fn(),
  },
} satisfies Meta<typeof BehaviorBindingPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Example: Story = {
  args: {
    binding: { behaviorId: 0, param1: 0x070004, param2: 0 },
    behaviors: [
      {
        id: 0,
        displayName: "Key Press",
        metadata: [
          {
            param1: [
              { name: "Key", hidUsage: { consumerMax: 512, keyboardMax: 231 } },
            ],
            param2: [],
          },
        ],
      },
      {
        id: 1,
        displayName: "Transparent",
        metadata: [],
      },
      {
        id: 2,
        displayName: "None",
        metadata: [],
      },
      {
        id: 3,
        displayName: "Momentary Layer",
        metadata: [
          {
            param1: [{ name: "Layer", layerId: {} }],
            param2: [],
          },
        ],
      },
      {
        id: 4,
        displayName: "Toggle Layer",
        metadata: [
          {
            param1: [{ name: "Layer", layerId: {} }],
            param2: [],
          },
        ],
      },
      {
        id: 5,
        displayName: "Layer-Tap",
        metadata: [
          {
            param1: [{ name: "Layer", layerId: {} }],
            param2: [
              { name: "Key", hidUsage: { consumerMax: 512, keyboardMax: 231 } },
            ],
          },
        ],
      },
      {
        id: 6,
        displayName: "Sticky Key",
        metadata: [
          {
            param1: [
              { name: "Key", hidUsage: { consumerMax: 512, keyboardMax: 231 } },
            ],
            param2: [],
          },
        ],
      },
      {
        id: 7,
        displayName: "Studio Unlock",
        metadata: [],
      },
      {
        id: 8,
        displayName: "Bootloader",
        metadata: [],
      },
    ],
  },
};
