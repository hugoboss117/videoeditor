# Promo Video Editor — Design Spec

**Date:** 2026-06-19
**Status:** Approved (v1 scope), pending spec review

## 1. Purpose

A simple, private video-editing app for a non-technical iPhone user (the user's
uncle) to assemble promotional videos from phone footage. The user (technical,
not the uncle) sets up the app, supplies branded intros and music, and hosts it
so the uncle can use it on his iPhone with no app-store friction.

This is **not** a public tool. Reliability and ease-of-use for one older,
non-technical user outweigh raw performance or breadth of features.

## 2. Platform Decision

**A static Progressive Web App (PWA) hosted on GitHub Pages.**

Chosen over a native iOS app because:

- **No Apple involvement.** Native sideloading without the $99/yr Apple Developer
  Program expires every 7 days and requires re-installing via the user's Mac.
  That treadmill is unacceptable for a non-technical relative.
- **Device-agnostic.** Works on the uncle's iPhone, the user's machine, anything.
- **Free hosting.** GitHub Pages serves the static files at no cost.
- **Install-like experience.** "Add to Home Screen" gives a full-screen, icon-on-
  home-screen app feel with zero install ceremony.

The uncle receives a single GitHub Pages URL and taps "Add to Home Screen" once.

## 3. Key Technical Constraint (drives the architecture)

GitHub Pages cannot set custom HTTP response headers. The multi-threaded build of
`ffmpeg.wasm` requires cross-origin isolation headers (COOP/COEP) to use
`SharedArrayBuffer`, which GitHub Pages cannot provide.

**Decision:** ship the **single-threaded** `ffmpeg.wasm` core. It needs no special
headers, works reliably on iOS Safari, and trades speed for reliability. A full
1–3 minute promo may take a couple of minutes to render; this is surfaced to the
user via a progress bar and a "keep this screen open" message.

(A future optimization — the `coi-serviceworker` workaround to enable the
multi-threaded core on GitHub Pages — is explicitly out of scope for v1.)

### iOS Safari memory management

iOS Safari caps per-page memory. To stay within limits with up to ~10 clips:

- **Normalize and process clips sequentially**, not all loaded at once.
- **Export at 1080p** (downscale 4K sources during normalization).
- Soft warnings if the user adds an unusually large number / length of clips.

## 4. Expected Workload

- Up to ~10 clips, 1–3 minutes total finished length ("medium" case).
- Source clips are iPhone footage (H.264 MP4, up to 4K). Normalized to 1080p,
  consistent fps/SAR/codec/audio-rate before concatenation.

## 5. App Flow (wizard — one decision per screen)

1. **Splash** — logo shown while the FFmpeg core loads in the background.
2. **Orientation** — two large buttons: Portrait / Landscape.
3. **Pick intro** — shows only intros matching the chosen orientation (from the
   manifest), each with a thumbnail preview.
4. **Add clips** — "Select videos" opens the iOS camera roll, multi-select.
5. **Arrange & trim** — drag to reorder; per clip, either *Trim* (start/end via a
   scrubber) or *Use as-is*.
6. **Transitions** — between each adjacent segment, pick *Hard cut* or *Fade*,
   with a "set all" shortcut.
7. **Music (optional)** — pick a bundled track or *None*. Selecting a track mutes
   all clip audio for the whole video.
8. **Text (optional — v1.1, not v1)** — add a line of text to a clip and set when
   it appears/disappears.
9. **Export** — preview → *Render* → progress bar → **Save to Photos / Share**
   (iOS share sheet) **and** a **Download** fallback.

The in-progress project is auto-saved on the device (IndexedDB) so a page reload
does not lose work.

## 6. Audio Model

- Default: each clip keeps its own audio; the intro keeps its own audio.
- Optional bundled background-music track: when selected, **all clip audio is
  muted** and the chosen track plays under the entire video.
- Only bundled (royalty-free) tracks are selectable — no external music apps, no
  licensing/linking concerns.

## 7. Branding

- **Theme:** dark background, large high-contrast tap targets and text (legibility
  for an older user is a hard requirement).
- **Accent:** orange (primary action color), with silver/white/black secondary —
  all sampled from the supplied logo.
- **Assets supplied by the user:** `logo.png` (transparent preferred) and brand
  colors. Used for the splash screen, the home-screen icon, and UI theming.
- Until the real logo lands, build with clean placeholder branding that swaps out
  by dropping files in `assets/branding/`.

## 7a. Responsive / Screen Targeting

**Mobile-first, fully responsive.**

- **Primary target: the uncle's iPhone in portrait.** Every screen is laid out for
  one-handed phone use first — large touch targets, large text, thumb-reachable
  primary actions, scrubbers sized for fingers rather than a mouse.
- **Adapts up to larger screens.** On tablet/desktop (e.g. the user setting up and
  testing) the layout reflows: content sits in a comfortable centered column
  rather than stretching edge-to-edge, previews enlarge, and stacked elements may
  sit side-by-side where the width allows. Nothing breaks; it uses extra room
  sensibly via fluid breakpoints.
- **Output aspect is independent of device.** The video preview/output aspect
  ratio is governed by the Portrait/Landscape choice in step 2, not by the
  device's current orientation. A landscape project always renders 16:9 even on a
  phone held upright; the UI simply frames that preview appropriately.

## 8. Repository / Asset Layout

```
assets/
  branding/
    logo.png
    theme.json          # colors + app name
  intros/
    landscape/  intro1.mp4, intro2.mp4 ...
    portrait/   intro1.mp4, intro2.mp4 ...
    manifest.json       # per-orientation: { id, label, file, thumbnail }
  music/
    track1.mp3, track2.mp3 ...
    music.json          # { id, label, file }
```

Adding an intro or song later = drop a file in the folder + add one entry to the
relevant JSON list. No code changes required.

Intros are finished MP4 (H.264) files supplied per orientation by the user. The
app's only responsibility is storing them in the repo and loading the correct set
based on the orientation selection.

## 9. Components (designed for isolation)

Each unit has one clear purpose, a defined interface, and is independently
understandable/testable:

- **Wizard / router** — step navigation and gating (can't pick intro before
  orientation, etc.).
- **Manifest loader** — reads `intros/manifest.json` and `music/music.json`,
  filters intros by orientation.
- **File picker** — wraps the multi-select camera-roll input, hands back clip
  references.
- **Trim UI** — per-clip scrubber producing `{ in, out }` times.
- **Project-state store** — the single source of truth: orientation, intro id,
  ordered clips (each with source ref, trim in/out, optional text overlays),
  transitions array, music id. Persisted to IndexedDB.
- **FFmpeg command builder** — a *pure function*: `project -> ffmpeg argument
  list(s)`. No I/O. This is where correctness bugs live, so it is unit-tested.
- **Renderer** — drives `ffmpeg.wasm`: normalize each clip sequentially, apply
  trims, concat with chosen transitions (`xfade` for fades), mix/replace audio,
  output 1080p MP4. Emits progress events.
- **Export / share** — Save-to-Photos / iOS share sheet + download fallback.
- **Branding / theme loader** — applies `theme.json` + logo to splash, icon, UI.

## 10. Tech & Build

- **Stack:** Vite + TypeScript (or vanilla JS), building to plain static files for
  GitHub Pages.
- **PWA:** `manifest.webmanifest` (name, icon, theme color, standalone display) +
  a service worker for offline asset caching.
- **FFmpeg:** single-threaded `@ffmpeg/core-st` via `@ffmpeg/ffmpeg`.

## 11. Testing Strategy

- **Test-driven (pure logic):** the project-state store and the FFmpeg command
  builder — given a project, assert the exact ffmpeg argument lists. This is the
  highest-value, most deterministic surface.
- **Manifest/orientation filtering:** unit-tested.
- **Rendering / device behavior:** manually verified by the user on a real iPhone
  (camera-roll access, render time, save-to-Photos/share, memory stability).

## 12. Scope

**v1 (this build):** steps 1–7 and 9 (splash, orientation, intro, clips, arrange &
trim, transitions, music, export). Branding/theme. PWA install. Single-threaded
renderer.

**v1.1 (fast-follow):** step 8 — text overlays with appear/disappear timing.

**Explicitly out of scope:** server-side rendering, multi-threaded ffmpeg via
service-worker header injection, external music sources, public/multi-user use.

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Render too slow on iPhone | Single-threaded but reliable; clear progress + "keep screen open" messaging; 1080p cap. |
| iOS Safari memory crash | Sequential clip processing, downscale to 1080p, soft warnings on heavy input. |
| Concat/xfade fails on mismatched clips | Normalize every clip to identical resolution/fps/SAR/codec/audio-rate first. |
| User loses work on reload | Auto-save project to IndexedDB. |
| Save-to-Photos quirks on iOS | Ship share-sheet save **and** a plain download fallback. |
