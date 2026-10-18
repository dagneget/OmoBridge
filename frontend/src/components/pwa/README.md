# InstallCard (F-107)

`App.tsx` mounts one `InstallCard` after the route content in a centered container.
It stays mounted across route navigation. Do not add another instance in layouts.

```tsx
import { InstallCard } from '../components/pwa';

<InstallCard />
```

Mount early: a component mounted after `beforeinstallprompt` fires cannot recover
that past event. The card captures eligible events while mounted, prevents the
automatic prompt, and calls `prompt()` only from the user's Install button click.
Each event is consumed once. A fresh offer can appear after browser dismissal.
Rejected prompts show an error and suggest the browser's own install menu.

The card hides on `appinstalled`, when started in standalone display mode, or when
the display mode changes to standalone. Legacy iOS `navigator.standalone` is also
checked. This detects the current app/window; it cannot reliably discover every
installation of the site from a regular browser tab or another device.

Safari on iPhone/iPad gets manual Share → Add to Home Screen instructions. Other
unsupported browsers have no card unless they emit an install event. iPad desktop
user agents use the touch-capable Mac platform heuristic. UA detection is a
best-effort hint, not an installation guarantee.

Not now hides the card for the tab's session using `sessionStorage`. Blocked
storage still permits in-memory dismissal. Later browser offers are not suppressed
by a dismissed/unmounted card, leaving native browser UI available. Do not mount
multiple copies: each copy registers its own listeners.

Strings live in the component's English and Amharic `install` namespace with
selected language → Amharic → English fallback. There is no external request,
new dependency, account access or private cache involved.

Verification covers synthetic install events, one-use/duplicate-click protection,
installation and display-mode events, dismissal, prompt errors, unsupported/iOS
browsers, optional storage, listener cleanup, translations and semantic axe
checks. jsdom contrast checks are excluded. Actual installation in Android Chrome,
Safari home-screen instructions, 360 px layout, keyboard interaction and contrast
still need browser/device verification before marking F-107 done.

References checked 2026-10-18:

- [MDN: beforeinstallprompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event)
- [MDN: triggering installation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt)
- [Apple: turn a website into an app](https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios)
