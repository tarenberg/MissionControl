---
name: loosely-twisted-design-engine
description: Apply the "Loosely Twisted" neomorphic design system to web projects. Use when the user wants to apply a soft, tactile, organic UI aesthetic (Neomorphism) using Tailwind CSS v4. Includes theme configuration, utility classes, and React component patterns.
---

# Loosely Twisted Design Engine

This skill defines a specific neomorphic (Soft UI) design language characterized by tactile, organic surfaces.

## 1. Core Aesthetic
- **Primary Surface Color:** `#e0e5ec`
- **Shadows:** Soft, dual-shadow approach to create depth (Dark: `#b8bec5`, Light: `#ffffff`).

## 2. Tailwind CSS v4 Configuration
Inject these variables into the `@theme` block of the global CSS file to enable the design engine:

```css
@theme {
  --color-neo-bg: #e0e5ec;
  --color-neo-shadow-dark: #b8bec5;
  --color-neo-shadow-light: #ffffff;
  
  --shadow-neo-flat: 9px 9px 16px var(--color-neo-shadow-dark), 
                    -9px -9px 16px var(--color-neo-shadow-light);
  
  --shadow-neo-pressed: inset 6px 6px 12px var(--color-neo-shadow-dark), 
                       inset -6px -6px 12px var(--color-neo-shadow-light);
  
  --shadow-neo-button: 4px 4px 8px var(--color-neo-shadow-dark), 
                      -4px -4px 8px var(--color-neo-shadow-light);
}

@utility neo-flat {
  background-color: var(--color-neo-bg);
  box-shadow: var(--shadow-neo-flat);
  border: 1px solid rgba(255, 255, 255, 0.4);
}

@utility neo-pressed {
  background-color: var(--color-neo-bg);
  box-shadow: var(--shadow-neo-pressed);
}

@utility neo-button {
  background-color: var(--color-neo-bg);
  box-shadow: var(--shadow-neo-button);
  transition: all 0.2s ease;
}

@utility neo-button-active {
  box-shadow: inset 2px 2px 5px var(--color-neo-shadow-dark), 
              inset -2px -2px 5px var(--color-neo-shadow-light);
}
```

## 3. Component Patterns

### Panels & Containers (Flat)
Use for cards, sections, and main background areas.
```tsx
<div className="neo-flat rounded-3xl p-6">...</div>
```

### Inset/Input Areas (Pressed)
Use for search bars, text inputs, or "well" areas.
```tsx
<div className="neo-pressed rounded-2xl p-4">...</div>
```

### Buttons & Interactive Elements
Use for primary actions.
```tsx
<button className="neo-button px-6 py-3 rounded-xl active:neo-button-active">
  Action
</button>
```

## 4. Visual Asset Generation
When generating icons or images to match this aesthetic, use the following prompt:

> "High-quality UI design asset: [OBJECT_NAME]. Style: Neomorphic, clean, modern, professional. Background: Neutral light gray (#e0e5ec). Soft shadows, rounded corners, professional lighting. Ensure the object appears to emerge from or be pressed into the surface."
