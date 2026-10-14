# Pocket Quest music

`pocket-quest-background.mp3` is the user-supplied **Pocket Quest Background music.mp3**, copied without re-encoding on October 14, 2026.

The app streams it on demand after music is enabled in **Settings → Sounds**. Default volume is 12%, with a 0–30% slider. Web Audio gain controls loudness on compatible browsers; HTML media volume is the fallback. Playback loops, continues across game pages, and pauses while the app is hidden or on sign-in screens. Reloaded apps resume after an allowed interaction if autoplay is blocked.

Replace this MP3 with a new sample at the same path and rebuild/reload the app. The track is deliberately outside the PWA precache, keeping the initial offline install small; music needs network access for its first load, while already-loaded audio can remain buffered by the browser.
