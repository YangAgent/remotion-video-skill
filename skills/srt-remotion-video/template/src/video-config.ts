import videoSettings from "./video-settings.json";

type VideoProfile = keyof typeof videoSettings.profiles;

const profileName = videoSettings.profile as VideoProfile;
const activeProfile = videoSettings.profiles[profileName];

if (!activeProfile) {
  throw new Error(`Unknown video profile: ${videoSettings.profile}`);
}

export const videoConfig = {
  profile: profileName,
  width: activeProfile.width,
  height: activeProfile.height,
  fps: activeProfile.fps,
  designWidth: videoSettings.design.width,
  designHeight: videoSettings.design.height,
  stageScale: Math.min(
    activeProfile.width / videoSettings.design.width,
    activeProfile.height / videoSettings.design.height,
  ),
};
