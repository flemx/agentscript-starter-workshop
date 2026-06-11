# Workshop Guide - Agentforce Vibes

A Vite + React single-page app that serves as a step-by-step workshop guide. Deployed to Heroku.

**Live URL:** https://vibes-workshop-guide-nl26-dc8cd890d560.herokuapp.com/

## Tech Stack

- Vite 5 + React 18 (no TypeScript)
- react-router-dom for URL-based navigation
- lucide-react for icons
- react-syntax-highlighter for code blocks
- `serve` package for production static hosting

## Project Structure

```
guide/
├── index.html                          # Entry point (title, favicon)
├── package.json                        # Scripts: dev, build, start, heroku-postbuild
├── vite.config.js                      # Vite config
├── Procfile                            # Heroku: "web: npm start"
├── static.json                         # SPA routing + cache headers
├── public/
│   └── images/                         # All static images (served at /images/*)
│       ├── WT_NL.png                   # Sidebar logo
│       ├── salesforce_logo.svg         # Favicon
│       └── *.png, *.jpg, *.webp        # Workshop screenshots and assets
└── src/
    ├── main.jsx                        # React entry
    ├── App.jsx                         # Router + section navigation logic
    ├── index.css                       # All styles
    └── components/
        ├── MainContent.jsx             # ALL workshop content lives here
        ├── Sidebar.jsx                 # Left nav with section links
        ├── RightSidebar.jsx            # "On this page" step anchors
        ├── ImageViewer.jsx             # Clickable image with modal zoom
        ├── CodeBlock.jsx               # Syntax-highlighted code blocks
        └── HeaderAnchor.jsx            # Anchor headings for step navigation
```

## Running Locally

```bash
npm install
npm run dev        # Dev server at localhost:5173
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

---

## How to Create a New Workshop Guide

All workshop content is in `src/components/MainContent.jsx`. The app uses a flat section-based navigation system.

### 1. Define your sections

In `MainContent.jsx`, update these three things at the top of the file:

```jsx
// Array of section IDs (determines order and navigation)
const sections = ['overview', 'org-signup', 'explore-overview', 'exercise1', 'crm-overview', 'exercise2']

// Display titles for prev/next navigation buttons
const sectionTitles = {
  'overview': 'Getting Started',
  'org-signup': 'Org Signup',
  // ...add your sections
}
```

Then update the render block in the `MainContent` function to map section IDs to components:

```jsx
{activeSection === 'overview' && <GettingStartedOverview />}
{activeSection === 'org-signup' && <OrgSignup />}
// ...add your section components
```

### 2. Write section components

Each section is a plain React function component. Use these patterns:

```jsx
function YourSection() {
  return (
    <div className="content-section">
      <h1>Section Title</h1>
      <p>Description text...</p>

      {/* Image with click-to-zoom */}
      <ImageViewer src="/images/your-screenshot.png" alt="Description" />

      {/* Code block with syntax highlighting */}
      <CodeBlock code={`your code here`} language="json" />

      {/* Step anchor (shows in right sidebar) */}
      <HeaderAnchor id="step1-name">Step 1: Do Something</HeaderAnchor>

      {/* Step divider between steps */}
      <hr className="step-divider" />
    </div>
  )
}
```

### 3. Add right sidebar step navigation (optional)

If your section has steps, add them to the `steps` array in `MainContent`:

```jsx
if (activeSection === 'your-section') {
  steps = [
    { id: 'step1-name', label: 'Step 1: Do Something' },
    { id: 'step2-name', label: 'Step 2: Next Thing' },
  ]
}
```

The `id` values must match the `id` prop on `<HeaderAnchor>` elements.

### 4. Update the sidebar navigation

In `src/components/Sidebar.jsx`, update the `navigationItems` array:

```jsx
const navigationItems = [
  {
    section: 'Section Group Name',
    items: [
      { id: 'section-id', label: 'Display Label' },
    ]
  },
]
```

### 5. Update URL routing

In `src/App.jsx`, add entries to both `pathToSection` and `sectionToPath`:

```jsx
const pathToSection = {
  '/': 'overview',
  '/your-section': 'your-section',
}

const sectionToPath = {
  'your-section': '/your-section',
}
```

---

## How to Update Images

All images go in `public/images/`. They are served as static assets at the `/images/` path.

### Replace an existing image

Drop the new file into `public/images/` with the same filename. No code changes needed.

### Add a new image

1. Place the file in `public/images/`
2. Reference it in `MainContent.jsx` using one of:
   - `<ImageViewer src="/images/your-image.png" alt="Description" />` (clickable with zoom)
   - `<img src="/images/your-image.png" alt="Description" />` (plain image)

**Important:** Always use absolute paths starting with `/images/`, not relative `./images/`. Relative paths break on Heroku because `serve` serves the built `dist/` folder.

---

## How to Update the Workshop Logo

The sidebar logo is in `src/components/Sidebar.jsx` line 31:

```jsx
<img src="/images/WT_NL.png" alt="World Tour Netherlands" className="logo" />
```

To change it:

1. Place your new logo in `public/images/` (e.g., `WT_Paris.png`)
2. Update the `src` and `alt` in `Sidebar.jsx`

The favicon is set in `index.html`:

```html
<link rel="icon" type="image/svg+xml" href="/images/salesforce_logo.svg" />
```

The page title is also in `index.html`:

```html
<title>Agentforce Vibes Workshop - WorldTour Amsterdam</title>
```

The sidebar heading is in `Sidebar.jsx`:

```jsx
<h1>Agentforce Vibes Workshop</h1>
```

---

## How to Deploy to a New Heroku App

Prerequisites: Heroku CLI installed and logged in (`heroku login`).

### 1. Create a new app

```bash
heroku create your-app-name
```

This adds a `heroku` git remote automatically. If deploying from a repo that already has a heroku remote, remove it first:

```bash
git remote remove heroku
heroku create your-app-name
```

### 2. Deploy

```bash
git push heroku main
```

Heroku auto-detects Node.js, runs `heroku-postbuild` (which runs `vite build`), then starts `serve -s dist -l $PORT` via the Procfile.

### 3. Verify

```bash
heroku open
heroku logs --tail    # Check for errors
```

### Key Heroku files

| File | Purpose |
|------|---------|
| `Procfile` | Tells Heroku to run `npm start` (which runs `serve -s dist -l $PORT`) |
| `static.json` | SPA routing config: all routes fall back to `index.html` |
| `package.json` `heroku-postbuild` script | Runs `vite build` during deploy (before devDependencies are pruned) |

### Common issues

- **"vite: not found"**: The build must happen in `heroku-postbuild`, not in the Procfile. Heroku prunes devDependencies after the build phase.
- **Images 404**: Images must be in `public/images/` and referenced with absolute paths (`/images/...`).
- **Routes return 404**: The `static.json` routes `/**` to `index.html` for SPA client-side routing. Make sure it exists.
