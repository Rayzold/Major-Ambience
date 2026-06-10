// Grade-set bottom sheet — opened by long-pressing a row in the
// category screen. Mirrors the desktop right-rail grade pills
// (Library.tsx → DesktopRightRail) in role: pick a grade, the
// row's grade chip updates and the track appears in Favorites
// when graded S or A.
//
// Long-press → modal is the established mobile pattern in this
// app (scenes, soundboard). Inline grade chips on every row would
// crowd the list and a swipe action would conflict with the
// existing remove-row affordance.

import { Modal, Pressable, Text, View } from "react-native";
import type { Grade, Track } from "@mc/core";
import { T, FONT_DISPLAY, FONT_MONO } from "../tokens";
import { Glyph } from "../Glyph";

/**
 * The six letter grades plus a null sentinel for "ungraded". Order
 * matches desktop's GRADES_INCLUDING_ALL minus the "All" filter
 * pseudo-entry — that's a filter affordance, not a value the user
 * can set on a track.
 */
const GRADE_PILLS: ReadonlyArray<Grade> = [null, "S", "A", "B", "C", "D", "F"];

export type GradeSheetProps = {
  /** Track being graded; null hides the sheet. */
  track: Track | null;
  /** Accent color (the category's color). */
  accent: string;
  onPick: (grade: Grade) => void;
  onDismiss: () => void;
};

export function GradeSheet({ track, accent, onPick, onDismiss }: GradeSheetProps) {
  const visible = track !== null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      {/* Tap the dimmed backdrop to dismiss without choosing. */}
      <Pressable
        onPress={onDismiss}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "flex-end",
        }}
      >
        {/* Inner Pressable swallows taps so they don't bubble to the
            backdrop and dismiss when the user is reaching for a pill. */}
        <Pressable
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onPress={() => {}}
          style={{
            backgroundColor: T.bgRaise,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 28,
            borderTopWidth: 1,
            borderTopColor: T.rule,
          }}
        >
          {/* Drag handle — purely decorative; the OS gesture doesn't
              actually hook into it, but it signals the sheet shape. */}
          <View
            style={{
              alignSelf: "center",
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: T.rule,
              marginBottom: 16,
            }}
          />

          <Text
            style={{
              fontSize: 10,
              color: T.ink3,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            Grade track
          </Text>
          <Text
            numberOfLines={2}
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 19,
              fontWeight: "600",
              color: T.ink,
              marginTop: 4,
              lineHeight: 24,
            }}
          >
            {track?.title ?? ""}
          </Text>
          {track?.pack ? (
            <Text
              numberOfLines={1}
              style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}
            >
              {track.pack}
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: 18,
              flexWrap: "wrap",
            }}
          >
            {GRADE_PILLS.map((g) => {
              const active = track?.grade === g;
              const label = g === null ? "None" : g;
              return (
                <Pressable
                  key={String(g)}
                  onPress={() => onPick(g)}
                  style={({ pressed }) => ({
                    minWidth: 44,
                    height: 44,
                    paddingHorizontal: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    backgroundColor: active ? `${accent}33` : T.bgChip,
                    borderWidth: 1,
                    borderColor: active ? `${accent}99` : T.rule,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  {g === null ? (
                    <Glyph
                      name="close"
                      size={14}
                      color={active ? accent : T.ink2}
                    />
                  ) : null}
                  <Text
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 14,
                      fontWeight: "700",
                      color: active ? accent : T.ink2,
                      marginLeft: g === null ? 6 : 0,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
