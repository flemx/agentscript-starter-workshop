# Vibe Code with Agentforce & Claude Code - Workshop Guide

A beautiful, modern interactive web application for the Pronto x Agentforce workshop: **Vibe Code with Claude Code**. Features a stunning purple-themed dark mode inspired by [Agentforce Labs](https://labs.agentforce.com/).

## 🌐 Live Demo

**Live URL:** [https://pronto-agentforce-vibes-8b40b9cfc6c6.herokuapp.com/](https://pronto-agentforce-vibes-8b40b9cfc6c6.herokuapp.com/)

![Workshop Guide Screenshot](/public/images/hero-screenshot.png)



## ✨ Features

- 🎨 **Modern Purple Theme** - Inspired by Agentforce Labs with gradient mesh backgrounds
- 🌓 **Dark/Light Mode** - Beautiful purple-themed dark mode and clean white light mode
- 📱 **Responsive Design** - Works perfectly on all screen sizes
- 💻 **Syntax Highlighting** - Beautiful code blocks with copy functionality
- 🖼️ **Image Lightbox** - Clickable images that expand to full size
- 🧭 **Smart Navigation** - Sidebar and right-sidebar with step anchors
- ⚡ **Lightning Fast** - Built with Vite for instant page loads
- ⚛️ **Modern React** - Clean component architecture

## 🚀 Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Build for production:

```bash
npm run build
```

The built files will be in the `dist` folder.

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## 📁 Project Structure

```
guide/
├── public/
│   └── images/              # Workshop images and screenshots
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx       # Navigation sidebar with theme toggle
│   │   ├── RightSidebar.jsx  # On-page step navigation
│   │   ├── MainContent.jsx   # All workshop content sections
│   │   ├── CodeBlock.jsx     # Code block with syntax highlighting
│   │   ├── ImageViewer.jsx   # Image viewer with lightbox modal
│   │   ├── Collapsible.jsx   # Expandable content sections
│   │   └── HeaderAnchor.jsx  # Anchored headings for navigation
│   ├── App.jsx          # Main app component and routing
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles and theme tokens
├── index.html           # HTML entry point
├── vite.config.js       # Vite configuration
├── Procfile             # Heroku deployment config
├── static.json          # SPA routing configuration
└── package.json         # Dependencies and scripts
```

## 🎨 Design System

### Color Palette

**Dark Mode (Purple Theme)**
- Background: Deep indigo `#0a0a14` with purple gradient mesh
- Accent: Agentforce purple `#7c3aed` and soft purple `#a78bfa`
- Cards: Dark blue-purple tones
- Links & Interactive: Purple with hover glows

**Light Mode (Clean White)**
- Background: Pure white `#ffffff`
- Accent: Purple `#7c3aed` for consistency
- Cards: White with subtle borders
- High contrast for readability

### Typography
- System fonts with optimal rendering
- Improved letter-spacing for readability
- JetBrains Mono for code blocks

## 🛠️ Technologies Used

- **React 18** - Modern React with hooks
- **Vite 5** - Lightning-fast build tool
- **React Router** - Client-side routing
- **React Syntax Highlighter** - Beautiful code blocks
- **Lucide React** - Modern icon library
- **Serve** - Production static file server

## 🚢 Deployment

This app is deployed on Heroku. To deploy a new version:

```bash
# Commit your changes
git add .
git commit -m "Your commit message"

# Push to Heroku
git push heroku main
```

The app uses:
- `heroku-postbuild` script to run `vite build`
- `serve` package to serve static files
- `Procfile` to define the web process
- `static.json` for SPA routing configuration

## 📝 Content Management

All workshop content is managed in [`src/components/MainContent.jsx`](src/components/MainContent.jsx). See [CLAUDE.md](../CLAUDE.md) for detailed instructions on:
- Creating new workshop sections
- Adding images and code blocks
- Updating navigation
- Customizing the theme

## 📄 License

This workshop guide is created for Salesforce WorldTour events.
