"use client";

import LightRays from "./LightRays";

export default function LightRaysWrapper() {
  return (
    <LightRays
      raysOrigin="top-center"
      raysColor="#F8F8F8"
      raysSpeed={1}
      lightSpread={0.5}
      rayLength={2}
      followMouse={true}
      mouseInfluence={0.1}
      noiseAmount={0}
      distortion={0}
      pulsating={false}
      fadeDistance={1}
      saturation={1}
    />
  );
}
