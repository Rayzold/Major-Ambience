// Cloud-sync settings screen (PR-6). The mobile parallel to the desktop
// SyncSettings modal. Self-contained per the mobile-screen convention:
// it owns its own state and calls the cloud-sync lib directly (the same
// way the DM screens call the data repos), rather than threading through
// a central orchestrator.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { SyncAuthError } from "@mc/sync";
import { T, FONT_DISPLAY } from "../src/tokens";
import { Glyph } from "../src/Glyph";
import {
  getAccountEmail,
  getAuthStatus,
  getBaseUrl,
  getDeviceLabel,
  getLastSyncedAt,
  requestMagicLink,
  runSync,
  setBaseUrl as persistBaseUrl,
  setDeviceLabel as persistDeviceLabel,
  signOutCloud,
  verifyMagicCode,
} from "../src/lib/cloud-sync";

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function SettingsScreen() {
  const [signedIn, setSignedIn] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | undefined>(undefined);
  const [baseUrl, setBaseUrl] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | undefined>(undefined);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [baseDraft, setBaseDraft] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [syncing, setSyncing] = useState(false);
  // `status` carries transient flow copy (link sent, signed in, signed
  // out). `syncResult` is reserved for successful sync round-trips so
  // the success banner doesn't fight with auth-flow copy. Both clear
  // on a fresh sync attempt.
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [syncResult, setSyncResult] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const [authed, acct, label, base, last] = await Promise.all([
        getAuthStatus(),
        getAccountEmail(),
        getDeviceLabel(),
        getBaseUrl(),
        getLastSyncedAt(),
      ]);
      setSignedIn(authed === "signed-in");
      setAccountEmail(acct);
      setEmail((cur) => cur || acct || "");
      setLabelDraft(label ?? "");
      setBaseUrl(base);
      setBaseDraft(base);
      setLastSyncedAt(last);
    } catch (err) {
      console.error("[cloud-sync] settings load failed:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const doSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setError(undefined);
    setSyncResult(undefined);
    setStatus(undefined);
    try {
      const res = await runSync();
      setLastSyncedAt(res.updatedAt);
      setSyncResult(
        res.merged ? "Merged changes from the cloud." : "Pushed to the cloud.",
      );
    } catch (err) {
      if (err instanceof SyncAuthError) {
        setSignedIn(false);
        setError("Session expired — sign in again.");
        setStatus(undefined);
      } else {
        setError(err instanceof Error ? err.message : String(err));
        setStatus(undefined);
      }
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  async function handleSendLink() {
    setError(undefined);
    try {
      await requestMagicLink(email);
      setAccountEmail(email.trim().toLowerCase());
      setLinkSent(true);
      setStatus(`Sign-in link sent to ${email.trim()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleVerify() {
    setError(undefined);
    try {
      await verifyMagicCode(code);
      setSignedIn(true);
      setCode("");
      setLinkSent(false);
      setStatus("Signed in.");
      void doSync();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSignOut() {
    try {
      await signOutCloud();
    } catch (err) {
      console.error("[cloud-sync] sign out failed:", err);
    }
    setSignedIn(false);
    setAccountEmail(undefined);
    setLastSyncedAt(undefined);
    setStatus("Signed out.");
  }

  async function handleSaveBaseUrl() {
    setError(undefined);
    await persistBaseUrl(baseDraft);
    const next = await getBaseUrl();
    setBaseUrl(next);
    setBaseDraft(next);
    setSignedIn((await getAuthStatus()) === "signed-in");
    Alert.alert("Sync server updated", "Sign in again if you switched servers.");
  }

  async function handleSaveLabel() {
    await persistDeviceLabel(labelDraft);
  }

  const emailValid = email.trim().includes("@");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }} keyboardShouldPersistTaps="handled">
      <View style={{ padding: 24 }}>
        <Text style={{ fontSize: 11, color: T.ink3, letterSpacing: 2 }}>SYNC</Text>
        <Text
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 32,
            fontWeight: "600",
            color: T.ink,
            marginTop: 2,
          }}
        >
          Cloud <Text style={{ fontStyle: "italic", color: T.gold }}>sync</Text>
        </Text>

        {signedIn ? (
          <View style={{ marginTop: 18 }}>
            <Field label="Signed in" value={accountEmail ?? "(this account)"} />
            <Field
              label="Last synced"
              value={lastSyncedAt !== undefined ? formatRelative(lastSyncedAt) : "never"}
            />

            <Label text="Device name" />
            <TextInput
              value={labelDraft}
              onChangeText={setLabelDraft}
              onBlur={handleSaveLabel}
              placeholder="e.g. My iPhone"
              placeholderTextColor={T.ink3}
              autoCapitalize="words"
              style={inputStyle}
            />

            <Pressable
              onPress={doSync}
              disabled={syncing}
              style={({ pressed }) => ({
                ...primaryBtnStyle,
                marginTop: 16,
                opacity: syncing ? 0.6 : pressed ? 0.85 : 1,
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              })}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#1a1108" />
              ) : (
                <Glyph name="spark" size={15} color="#1a1108" />
              )}
              <Text style={primaryBtnText}>{syncing ? "Syncing…" : "Sync now"}</Text>
            </Pressable>

            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => ({ ...ghostBtnStyle, marginTop: 10, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={ghostBtnText}>Sign out</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ marginTop: 18 }}>
            <Text style={{ fontSize: 13, color: T.ink2, lineHeight: 19 }}>
              Sync your grades, scenes, soundboard, and notes across devices.
              Your audio files stay on this device — only the small config
              blob travels. Sign in with a one-time link sent to your email.
            </Text>

            <Label text="Email" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={T.ink3}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={inputStyle}
            />
            <Pressable
              onPress={handleSendLink}
              disabled={!emailValid}
              style={({ pressed }) => ({
                ...primaryBtnStyle,
                marginTop: 10,
                opacity: !emailValid ? 0.5 : pressed ? 0.85 : 1,
              })}
            >
              <Text style={primaryBtnText}>{linkSent ? "Resend link" : "Send sign-in link"}</Text>
            </Pressable>

            {linkSent ? (
              <View
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: T.bgRaise,
                  borderWidth: 1,
                  borderColor: T.rule,
                }}
              >
                <Text style={{ fontSize: 12, color: T.ink2, lineHeight: 18 }}>
                  Check your inbox and paste the code from the email.
                </Text>
                <Label text="Sign-in code" />
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="paste code"
                  placeholderTextColor={T.ink3}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ ...inputStyle, fontFamily: "Menlo" }}
                />
                <Pressable
                  onPress={handleVerify}
                  disabled={!code.trim()}
                  style={({ pressed }) => ({
                    ...primaryBtnStyle,
                    marginTop: 10,
                    opacity: !code.trim() ? 0.5 : pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={primaryBtnText}>Verify &amp; sign in</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}

        {syncResult ? (
          <SyncSuccessBanner key={lastSyncedAt} message={syncResult} />
        ) : null}
        {status ? (
          <Text style={{ marginTop: 14, fontSize: 12, color: T.gold }}>{status}</Text>
        ) : null}
        {error ? (
          <View
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 9,
              backgroundColor: "rgba(217,102,102,0.10)",
              borderWidth: 1,
              borderColor: "#d96666aa",
            }}
          >
            <Text style={{ fontSize: 12, color: "#e08585", lineHeight: 18 }}>{error}</Text>
          </View>
        ) : null}

        {/* Advanced — endpoint override */}
        <View style={{ marginTop: 22, borderTopWidth: 1, borderTopColor: T.rule, paddingTop: 14 }}>
          <Pressable
            onPress={() => setAdvancedOpen((v) => !v)}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Glyph name="caret" size={12} color={T.ink3} />
            <Text style={{ fontSize: 12, color: T.ink3 }}>Advanced</Text>
          </Pressable>
          {advancedOpen ? (
            <View style={{ marginTop: 10 }}>
              <Label text="Sync server URL" />
              <TextInput
                value={baseDraft}
                onChangeText={setBaseDraft}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ ...inputStyle, fontSize: 12 }}
              />
              <Pressable
                onPress={handleSaveBaseUrl}
                disabled={baseDraft.trim() === baseUrl.trim()}
                style={({ pressed }) => ({
                  ...ghostBtnStyle,
                  marginTop: 10,
                  opacity: baseDraft.trim() === baseUrl.trim() ? 0.5 : pressed ? 0.7 : 1,
                })}
              >
                <Text style={ghostBtnText}>Save server URL</Text>
              </Pressable>
              <Text style={{ fontSize: 11, color: T.ink3, marginTop: 8, lineHeight: 16 }}>
                Point this at your deployed Cloudflare Worker.
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: T.ink3 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: T.ink, flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

/**
 * Card-style success banner shown after a sync resolves. Replaces a
 * single line of gold text that was easy to miss for sub-second
 * syncs. Animated in with the native driver so it feels distinct from
 * the rest of the page; remount via `key={lastSyncedAt}` (parent)
 * restarts the animation for back-to-back syncs.
 */
function SyncSuccessBanner({ message }: { message: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  return (
    <Animated.View
      style={{
        marginTop: 14,
        padding: 12,
        borderRadius: 10,
        backgroundColor: T.goldSoft,
        borderWidth: 1,
        borderColor: T.goldEdge,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-6, 0],
            }),
          },
        ],
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: T.gold,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Glyph name="spark" size={14} color="#1a1108" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: T.gold }}>
          Synced
        </Text>
        <Text style={{ fontSize: 12, color: T.gold, opacity: 0.85, marginTop: 1 }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Text style={{ fontSize: 11, color: T.ink3, marginTop: 14, marginBottom: 6 }}>{text}</Text>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: T.rule,
  backgroundColor: T.bgChip,
  borderRadius: 9,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: T.ink,
  fontSize: 14,
} as const;

const primaryBtnStyle = {
  backgroundColor: T.gold,
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: "center",
} as const;

const primaryBtnText = { color: "#1a1108", fontSize: 14, fontWeight: "600" } as const;

const ghostBtnStyle = {
  backgroundColor: T.bgChip,
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: "center",
  borderWidth: 1,
  borderColor: T.rule,
} as const;

const ghostBtnText = { color: T.ink2, fontSize: 14, fontWeight: "600" } as const;
