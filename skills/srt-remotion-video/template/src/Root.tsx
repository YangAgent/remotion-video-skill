import { Composition } from "remotion";
import { Main } from "./compositions/Main";
import { totalDurationInFrames } from "./compositions/generated-scenes";
import { videoConfig } from "./video-config";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={totalDurationInFrames}
        fps={videoConfig.fps}
        width={videoConfig.width}
        height={videoConfig.height}
      />
    </>
  );
};
