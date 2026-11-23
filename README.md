# Open Study website

The landing page for [Open Study](https://github.com/theopenlauncher/open-study), a calm, private study workspace for macOS.

It is a static site with no build step and no dependencies: plain HTML, CSS and JavaScript modules in `public/`.

## Run locally

The page uses ES modules, so serve it over HTTP rather than opening the file directly:

```bash
python3 -m http.server 4173 --directory public
```

Then open http://localhost:4173.

## Structure

```
public/
├── index.html        # Page markup and the SVG icon sprite
├── style.css         # Site styles (tokens mirror the app's DESIGN.md)
├── main.js           # Nav state, scroll reveals, mounts the demo and vignettes
├── features.js       # Small interactive vignettes in the Features section
├── assets/           # App icon, cropped from the app's AppIcon
└── demo/             # The interactive in-browser recreation of the app
    ├── app.js        #   State, actions, timer and keyboard handling
    ├── views.js      #   One render function per screen
    ├── selectors.js  #   Derived values (due cards, streaks, task groups…)
    ├── data.js       #   Sample workspace
    ├── sm2.js        #   SM-2 scheduling, ported from StudyLogic.swift
    ├── ui.js         #   Shared helpers (icons, escaping, block kinds)
    └── demo.css      #   Demo styles, scoped under .os
```

The demo runs entirely in the browser with made-up sample data. It keeps everything in memory, saves nothing and never talks to the real app.

When the app's design changes, update the tokens in `style.css` and `demo/demo.css` to match `DESIGN.md` in the app repository.
