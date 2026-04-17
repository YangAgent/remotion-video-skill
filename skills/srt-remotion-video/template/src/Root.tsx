import { Composition } from "remotion";
import { Main } from "./compositions/Main";
import { totalDurationInFrames } from "./compositions/generated-scenes";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={totalDurationInFrames}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
