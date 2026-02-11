"use client";

import { GlobalAudioPlayer } from "./GlobalAudioPlayer";
import { GlobalVideoPlayer } from "./GlobalVideoPlayer";
import { GlobalTextReader } from "./GlobalTextReader";

export function GlobalPreviewLayer() {
  return (
    <>
      <GlobalAudioPlayer position="top-[25%]" />
      <GlobalVideoPlayer position="top-[40%]" />
      <GlobalTextReader position="top-[55%]" />
    </>
  );
}
