import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Sparkles } from "lucide-react";

import { designTokens, hostDecor } from "../design-system";
import { generatedScenes } from "./generated-scenes";

const FPS = 30;
const msToFrames = (ms: number) => Math.round((ms / 1000) * FPS);

export const Main: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: designTokens.background.host }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${designTokens.background.grid} 1px, transparent 1px), linear-gradient(90deg, ${designTokens.background.grid} 1px, transparent 1px)`,
          backgroundSize: hostDecor.gridSize,
          opacity: hostDecor.gridOpacity,
        }}
      />

      {/* 在这里添加你的内容 */}

      {hostDecor.sparkles.map((sparkle, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            top: sparkle.top,
            right: sparkle.right,
            bottom: sparkle.bottom,
            left: sparkle.left,
            color: designTokens.accent.primary,
            opacity: sparkle.base + sparkle.amp * Math.sin(frame * sparkle.speed + sparkle.phase),
          }}
        >
          <Sparkles size={sparkle.fontSize} strokeWidth={2.2} />
        </div>
      ))}

      {generatedScenes.map((scene, index) => {
        const fromFrame = msToFrames(scene.start);

        let durationInFrames: number;
        if (index < generatedScenes.length - 1) {
          const nextStart = generatedScenes[index + 1].start;
          durationInFrames = msToFrames(nextStart - scene.start);
        } else {
          durationInFrames = msToFrames(scene.duration);
        }

        const Component = scene.Component;

        return (
          <Sequence key={index} from={fromFrame} durationInFrames={durationInFrames}>
            <Component segments={scene.segments} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
