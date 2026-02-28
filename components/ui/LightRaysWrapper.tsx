"use client";

import LightRays from "./LightRays";

export default function LightRaysWrapper() {
  return (
    <LightRays
      raysOrigin="top-center"
      raysColor="#ffffff"
      raysSpeed={1}
      lightSpread={0.5}
      rayLength={3}
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
