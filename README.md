# नाम जप · Naam Jap

A quiet jap counter. Tap anywhere — the naam moves on and one jap is counted.
No account, no server, no analytics. Every count stays in your own browser.

---

## Hosting on GitHub Pages

Drop these files at the **root** of a **public** repository, on the `main` branch:

```
index.html
manifest.webmanifest
sw.js
.nojekyll
README.md
css/style.css
js/config.js
js/app.js
icons/icon-192.png
icons/icon-512.png
icons/icon-maskable-512.png
```

Then, once:

1. Repository → **Settings** → **Pages**
2. **Source**: *Deploy from a branch*
3. **Branch**: `main`, folder `/ (root)` → **Save**
4. Wait about a minute. The site appears at `https://<username>.github.io/<repo>/`

That is the whole setup. Nothing to build, nothing to install, no dependencies.

**Three things that matter:**

- The entry file must be named **`index.html`** — Pages will not serve anything else as the default.
- The repo must be **public** (Pages on private repos needs a paid plan).
- `.nojekyll` is an empty file that stops GitHub from running Jekyll over the site. Keep it.

All paths in the project are relative, so the app works correctly under the
`/<repo>/` sub-path without any change.

### Updating

Edit, commit, push. Pages redeploys in under a minute. **Bump `CACHE` in `sw.js`**
(e.g. `nj-v5.2` → `nj-v5.3`) whenever you change `index.html`, the CSS or the JS —
otherwise returning visitors keep the old cached copy.

---

## Why it must be hosted, not just opened as a file

Three features only work in a **secure context** (https, or `localhost`):

| Feature | From `file://` | From GitHub Pages |
|---|---|---|
| Keeping the screen on | ✗ cannot work | ✓ Chrome for Android, Safari 16.4+ |
| Add to home screen | ✗ | ✓ |
| Offline via service worker | ✗ | ✓ |

Counting, history, bells and themes work everywhere. If you tap **स्क्रीन** while
running from a local file, the app now tells you plainly that https is required
rather than failing silently.

---

## Editing the app

**`js/config.js` is the only file you need for content changes.** It holds:

- `CFG` — mala size, day-turnover hour, idle threshold, history length, glide tuning
- `NAAMS` — the naam list; add, remove or reorder freely
- `TRACKS` — music, grouped; links stream from archive.org and can rot over time
- `PALETTE` / `GLOW` — naam colours per theme
- `LABELS` — every string, in Hindi and English

`js/app.js` reads config and never writes to it. `css/style.css` holds the three
themes as CSS variable sets — a fourth theme is a new `body.t-name{ … }` block plus
one entry each in `THEMES`, `THEME_META`, `THEME_GLYPH`, `PALETTE` and `GLOW`.

---

## How it works

**Counting.** One tap anywhere is one jap. The naam jumps to a new position and a
new colour, so the eye has something to chase, and a ring spreads out from the
point of contact. Drag the naam to reposition it without counting. Space or Enter
also counts, for keyboard use.

**Only your taps count.** Auto drift moves the naam on a timer as a pacing aid for
anyone chanting aloud; it never touches the number. A count you did not make would
make the whole record untrustworthy, including the honest days. If you have done a
mala away from the phone, type it into लेखा.

**चंचल / स्थिर.** In *steady* mode the naam stays where it is — the tap still counts,
still rings, still ripples. For anyone who finds the moving target distracting.
Both this and the ripple default to off if the device asks for reduced motion.

**The jap day turns over at 04:00**, not midnight, so a pre-dawn or late-night
sitting is not split across two days. Dates are noon-anchored, so daylight saving
cannot shift them.

**The session clock has no button.** Time is the sum of the gaps between your taps,
ignoring any gap over five minutes. It cannot drift, cannot be left running, and
cannot be inflated by leaving the app open.

**Bells** are synthesised in the browser — no audio files, no network. One at every
mala of 108, a fuller one when your sankalp is met or the countdown ends, and a
soft one at the first tap of a sitting.

**Corrections are manual.** The counts in लेखा are editable number fields. That is
also the recovery path if browser data is ever cleared: type the number back in.

---

## Self-check

Append `?test=1` to the URL. Twenty-four assertions run against the count, date,
streak, history, layout and motion logic — including one that proves auto drift
never increments the count. Results appear as a toast and in the console.
The app is otherwise untouched — state is restored after the run.

---

## Themes

Three, each for a real lighting condition rather than for taste:

- **रात · Dark** — evening and indoors (default)
- **दिन · Day** — daylight
- **भोर · Night** — near-black and red-shifted, for pre-dawn and bedside use, so
  the screen does not destroy dark-adapted eyes

---

## Known limits

- Music streams from archive.org. It needs a connection and the links may rot.
- Fonts load from Google Fonts on first run; the service worker keeps them after that.
- Data lives in `localStorage` for this origin only. Clearing site data clears the
  counts — the editable fields in लेखा are how you put them back.
