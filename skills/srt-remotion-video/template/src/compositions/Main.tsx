import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Sparkles } from "lucide-react";

import { designTokens, hostDecor } from "../design-system";
import { videoConfig } from "../video-config";
import { generatedScenes } from "./generated-scenes";

const msToFrames = (ms: number) => Math.round((ms / 1000) * videoConfig.fps);

export const Main: React.FC = () => {
  const frame = useCurrentFrame();
  const gridOffset = ((frame * hostDecor.gridScrollSpeed) / videoConfig.fps) % hostDecor.gridSizePx;

  return (
    <AbsoluteFill style={{ backgroundColor: designTokens.background.host, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: videoConfig.designWidth,
          height: videoConfig.designHeight,
          transform: `scale(${videoConfig.stageScale})`,
          transformOrigin: "top left",
        }}
      >
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${designTokens.background.grid} 1.5px, transparent 1.5px), linear-gradient(90deg, ${designTokens.background.grid} 1.5px, transparent 1.5px)`,
            backgroundSize: hostDecor.gridSize,
            backgroundPosition: `${gridOffset}px ${gridOffset}px`,
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
            <Sequence key={index} name={`Scene${String(index + 1).padStart(3, '0')}`} from={fromFrame} durationInFrames={durationInFrames}>
              <Component segments={scene.segments} />
            </Sequence>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
