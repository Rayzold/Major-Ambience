import type { CategoryId, Grade } from "@mc/core";
import { findCategory } from "./categories.js";
import { GradeChip } from "./GradeChip.js";
import { T } from "./tokens.js";
import { Visualizer } from "./Visualizer.js";

export type TrackRowData = {
  id: string;
  title: string;
  pack: string;
  cat: CategoryId;
  /** Display duration string ("3:24"). */
  dur: string;
  grade: Grade;
};

export type TrackRowProps = {
  track: TrackRowData;
  index?: number | string | null;
  isPlaying?: boolean;
  showCat?: boolean;
  onTap?: () => void;
};

export function TrackRow({
  track,
  index,
  isPlaying = false,
  showCat = false,
  onTap,
}: TrackRowProps) {
  const cat = findCategory(track.cat);
  const color = cat?.color ?? T.gold;
  return (
    <button
      className="mc-row-tap"
      onClick={onTap}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 16px",
        width: "100%",
        textAlign: "left",
        borderBottom: `1px solid ${T.rule}`,
        background: isPlaying
          ? `linear-gradient(90deg, ${color}1a, transparent)`
          : "transparent",
      }}
    >
      <div
        style={{
          width: 24,
          textAlign: "center",
          flexShrink: 0,
          color: isPlaying ? color : T.ink3,
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        {isPlaying ? (
          <Visualizer color={color} bars={4} height={14} />
        ) : index != null ? (
          index
        ) : (
          ""
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: isPlaying ? color : T.ink,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {track.title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: T.ink2,
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {showCat && cat ? (
            <>
              <span style={{ color: cat.color }}>{cat.name.toUpperCase()}</span>
              <span style={{ color: T.ink3 }}>·</span>
            </>
          ) : null}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{track.pack}</span>
        </div>
      </div>
      <div className="mc-mono" style={{ fontSize: 11, color: T.ink3, flexShrink: 0 }}>
        {track.dur}
      </div>
      <GradeChip grade={track.grade} size={20} />
    </button>
  );
}
