import React from "react";
import { Html5Audio as Audio, Html5Video as Video } from "remotion";
import { AbsoluteFill, Img, Composition, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const brown = "#3d1b0b";
const gold = "#cb911f";

type ProductProps = {
  src: string; label: string; x: number; y: number; width: number; height: number;
  bounds: [number, number, number, number]; outline: string; angle: number;
};

// Photographs remain untouched: CSS silhouettes hide surrounding backgrounds.
const Product: React.FC<ProductProps> = ({src, label, x, y, width, height, bounds, outline, angle}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f, fps, config: {damping: 17, stiffness: 105, mass: 0.9}});
  const s = Math.min(width / bounds[2], height / bounds[3]);
  const actualWidth = bounds[2] * s;
  const actualHeight = bounds[3] * s;
  return <div style={{position: "absolute", left: x, top: y, width, height: height + 62,
    translate: `${(540 - x - width / 2) * (1 - p)}px ${(890 - y - height / 2) * (1 - p)}px`,
    scale: 0.06 + 0.94 * p, rotate: `${angle * (1 - p)}deg`,
    opacity: interpolate(f, [0, 4], [0, 1], clamp)}}>
    <div style={{position: "absolute", left: (width - actualWidth) / 2, top: (height - actualHeight) / 2, width: actualWidth, height: actualHeight, filter: "drop-shadow(0 16px 18px rgba(64,29,11,0.16))"}}>
      <Img src={staticFile(src)} premountFor={fps} style={{position: "absolute", width: 1254 * s, height: 1254 * s,
        left: -bounds[0] * s, top: -bounds[1] * s, clipPath: `polygon(${outline})`}} />
    </div>
    <div style={{position: "absolute", top: height + 17, width: "100%", textAlign: "center", fontSize: 29, fontWeight: 700, color: brown, letterSpacing: -0.5}}>{label}</div>
  </div>;
};

const Reveal: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <AbsoluteFill style={{fontFamily: "Arial, sans-serif"}}>
    <AbsoluteFill style={{background: "radial-gradient(ellipse at 50% 30%, #fffdf7 0%, #f7efdf 66%, #ead9b9 100%)", opacity: interpolate(f, [0, 12], [0, 1], clamp)}} />
    <div style={{position: "absolute", inset: 35, border: "1.5px solid rgba(177,126,44,0.25)", borderRadius: 40, opacity: interpolate(f, [7, 24], [0, 1], clamp)}} />
    <Sequence name="Logo KIC original" from={0} premountFor={fps}>
      <div style={{position: "absolute", left: 300, top: 40, width: 480, height: 310, overflow: "hidden", mixBlendMode: "multiply", opacity: interpolate(f, [0, 9], [0, 1], clamp), scale: interpolate(f, [0, 21], [0.68, 1], {...clamp, easing: Easing.out(Easing.cubic)})}}>
        <Img src={staticFile("logo-kic.png")} premountFor={fps} style={{position: "absolute", width: 470, height: 470, left: 5, top: -75}} />
      </div>
      <div style={{position: "absolute", top: 359, width: "100%", textAlign: "center", color: brown, fontWeight: 800, fontSize: 43, letterSpacing: 3, opacity: interpolate(f, [0, 9], [0, 1], clamp)}}>NOS 5 PRODUITS CACAO</div>
    </Sequence>
    <Sequence name="Beurre — photographie originale" from={0} premountFor={fps}>
      <Product src="products/beurre.png" label="Beurre de cacao" x={65} y={439} width={295} height={500} bounds={[312, 78, 673, 1067]} angle={-22} outline="28.2% 6.4%, 75.5% 6.4%, 77.7% 7.6%, 78.5% 9.8%, 78.4% 13.6%, 77.8% 23.9%, 77% 39.9%, 76% 55.8%, 74.9% 73.4%, 73.6% 86.3%, 72% 88.7%, 69% 90.3%, 63.2% 91.2%, 53% 91.3%, 42.3% 91.2%, 35.9% 90.1%, 31.9% 88.8%, 29.7% 86.4%, 28.9% 79.7%, 27.9% 63.8%, 26.7% 44.7%, 25.7% 25.5%, 25% 13.6%, 25% 9.9%, 25.7% 7.8%" />
    </Sequence>
    <Sequence name="Poudre — photographie originale" from={0} premountFor={fps}>
      <Product src="products/poudre.jpg" label="Poudre de cacao" x={393} y={439} width={295} height={500} bounds={[335, 80, 645, 1070]} angle={0} outline="30% 6.5%, 75% 6.5%, 77.9% 8%, 77.5% 21%, 75% 62%, 73.8% 87%, 70% 90.2%, 61% 91.4%, 39% 90.8%, 31% 88%, 29% 83%, 27% 24%, 26.8% 10%, 28% 7.5%" />
    </Sequence>
    <Sequence name="Masse — photographie originale" from={0} premountFor={fps}>
      <Product src="products/masse.jpg" label="Masse de cacao" x={721} y={439} width={295} height={500} bounds={[313, 115, 628, 920]} angle={22} outline="27.9% 9.3%, 71.5% 9.3%, 73.6% 10%, 74.8% 11.7%, 74.6% 16%, 73.9% 35.9%, 73.4% 55.8%, 72.6% 73.4%, 71.9% 77.5%, 70.3% 79.7%, 67.1% 81.3%, 59.6% 82.1%, 47.8% 82.5%, 38.3% 81.7%, 32.1% 80.5%, 28.7% 78.9%, 27.5% 77%, 27% 71.8%, 26.2% 55.8%, 25.5% 31.9%, 25% 14.4%, 25.1% 11.7%, 26.1% 10.1%" />
    </Sequence>
    <Sequence name="Infusion — photographie originale" from={0} premountFor={fps}>
      <Product src="products/infusion.png" label="Infusion de cacao" x={112} y={1060} width={482} height={330} bounds={[253, 344, 753, 518]} angle={-16} outline="20.3% 27.6%, 79.8% 27.6%, 80% 68.5%, 20.3% 68.5%" />
    </Sequence>
    <Sequence name="Jus — photographie originale" from={0} premountFor={fps}>
      <Product src="products/jus.jpg" label="Jus de cacao" x={700} y={1015} width={265} height={375} bounds={[325, 37, 630, 1160]} angle={16} outline="46.2% 3.1%, 53.5% 3.1%, 54.8% 4%, 54.8% 10.7%, 56% 11.5%, 56% 13.8%, 72% 14.3%, 75% 16%, 75.8% 19%, 74% 40%, 72% 78%, 70% 91%, 65% 94.5%, 53% 95.5%, 40% 94.7%, 33% 92.3%, 31% 89%, 29% 65%, 26% 22%, 26% 17.5%, 27.4% 15.3%, 31% 14.3%, 44% 14.2%, 44% 11.2%, 45.5% 10.7%, 45.5% 4%" />
    </Sequence>
    <Sequence name="Contacts KIC" from={0} premountFor={fps}>
      <div style={{position: "absolute", top: 1510, left: 85, width: 910, textAlign: "center", color: brown, opacity: interpolate(f, [0, 10], [0, 1], clamp), translate: `0px ${interpolate(f, [0, 20], [75, 0], {...clamp, easing: Easing.out(Easing.cubic)})}px`}}>
        <div style={{height: 2, background: `linear-gradient(90deg, transparent, ${gold}, transparent)`, marginBottom: 27}} />
        <div style={{fontSize: 68, fontWeight: 900, letterSpacing: -1}}>kic-fr.com</div>
        <div style={{fontSize: 49, fontWeight: 700, marginTop: 17}}>+33 7 45 90 87 78</div>
        <div style={{fontSize: 36, marginTop: 20}}>service@kic-fr.com</div>
        <div style={{fontSize: 28, marginTop: 21, color: "#70513d"}}>18 rue Masséna, 06000 Nice, France</div>
      </div>
    </Sequence>
  </AbsoluteFill>;
};

const ImpactFlash: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{backgroundColor: "#fff8df", opacity: interpolate(f, [0, 2, 6], [0.8, 0.35, 0], clamp), pointerEvents: "none"}} />;
};

export const KicVideo: React.FC = () => {
  const {fps} = useVideoConfig();
  return <AbsoluteFill style={{background: "#f7efdf"}}>
    <Sequence name="Camion et choc — vidéo fournie" durationInFrames={4.1 * fps} premountFor={fps}>
      <Video src={staticFile("camion-original.mp4")} style={{width: "100%", height: "100%", objectFit: "cover"}} volume={0.85} />
    </Sequence>
    <Sequence name="Apparition simultanée des cinq produits" from={3.1 * fps} durationInFrames={10.9 * fps} premountFor={fps}><Reveal /></Sequence>
    <Sequence name="Flash du choc" from={3.1 * fps} durationInFrames={6} premountFor={fps}><ImpactFlash /></Sequence>
    <Sequence name="Impact et envol" from={3.1 * fps} durationInFrames={2.4 * fps} premountFor={fps}>
      <Audio src={staticFile("impact-envol.wav")} volume={0.4} />
    </Sequence>
  </AbsoluteFill>;
};

export const MyComposition = () => <Composition id="KIC-Camion-Produits" component={KicVideo} durationInFrames={420} fps={30} width={1080} height={1920} />;






