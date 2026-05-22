export type OrbVisualizerProps = {
  color: string;
  size?: number;
  playing?: boolean;
};

export function OrbVisualizer({ color, size = 220, playing = true }: OrbVisualizerProps) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {playing &&
        [0, 0.8, 1.6].map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `1px solid ${color}`,
              opacity: 0.4,
              animation: `mc-pulse-ring 2.4s ease-out ${d}s infinite`,
            }}
          />
        ))}
      <div
        style={{
          width: size * 0.78,
          height: size * 0.78,
          borderRadius: "50%",
          background: `radial-gradient(circle at 30% 30%, ${color}, ${color}40 60%, transparent 75%)`,
          filter: "blur(0.5px)",
          boxShadow: `0 0 60px ${color}66, inset 0 0 60px ${color}33`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: size * 0.5,
          height: size * 0.5,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${color}, ${color}99)`,
          boxShadow: `inset 0 -10px 30px rgba(0,0,0,0.4), 0 8px 30px ${color}44`,
        }}
      />
    </div>
  );
}
