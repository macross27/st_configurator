# Design Token System Documentation

## Overview

The ST Configurator uses a comprehensive design token system to maintain consistent styling across the application. Design tokens are the visual design atoms of the design system — specifically, they are named entities that store visual design attributes.

## Quick Start

### 1. JavaScript Usage

```javascript
import { designTokens, theme } from '../assets/design-tokens.js';

// Use individual tokens
const primaryColor = designTokens.colors.primary[500];
const mediumSpacing = designTokens.spacing[4];

// Use theme utility functions
const color = theme.color('primary.500');
const spacing = theme.spacing('4');
const fontSize = theme.fontSize('lg');
```

### 2. CSS Usage

```css
/* Import the CSS variables */
@import '../assets/design-tokens.css';

/* Use in your styles */
.my-component {
  color: var(--colors-primary-500);
  padding: var(--spacing-4);
  border-radius: var(--border-radius-md);
  font-size: var(--typography-font-size-lg);
}

/* Or use utility classes */
.my-button {
  @apply btn btn-primary btn-md;
}
```

## Token Categories

### Colors

Our color system is based on semantic naming and includes:

#### Primary Colors
- **Purpose**: Main brand colors for primary actions and elements
- **Usage**: Buttons, links, active states
- **Scale**: 50 (lightest) to 900 (darkest)

```javascript
theme.color('primary.500')  // Main primary color
theme.color('primary.700')  // Darker variant for hover states
```

#### Secondary Colors
- **Purpose**: Supporting colors and neutral tones
- **Usage**: Text, backgrounds, borders
- **Scale**: 50 (lightest) to 900 (darkest)

#### Semantic Colors
- **Success**: Green tones for positive feedback
- **Warning**: Orange tones for cautionary messages
- **Error**: Red tones for errors and destructive actions
- **Info**: Blue tones for informational content

#### Three.js Specific Colors
- **Purpose**: Colors specifically for 3D scene elements
- **Usage**: Scene backgrounds, object highlighting, selection states

```javascript
designTokens.colors.threejs.sceneBackground
designTokens.colors.threejs.objectHighlight
```

### Typography

#### Font Families
- **Primary**: Roboto (main UI text)
- **Secondary**: Inter (alternative option)
- **Monospace**: Roboto Mono (code and data)

#### Font Sizes
Based on a modular scale with rem units:
- `xs`: 0.75rem (12px)
- `sm`: 0.875rem (14px)
- `base`: 1rem (16px) - Default
- `lg`: 1.125rem (18px)
- `xl`: 1.25rem (20px)
- `2xl`: 1.5rem (24px)
- `3xl`: 1.875rem (30px)
- `4xl`: 2.25rem (36px)

#### Font Weights
- `light`: 300
- `normal`: 400 (Default)
- `medium`: 500
- `semibold`: 600
- `bold`: 700

### Spacing

Based on an 8px base grid system:

```javascript
theme.spacing('1')   // 0.25rem (4px)
theme.spacing('2')   // 0.5rem (8px)
theme.spacing('4')   // 1rem (16px) - Common default
theme.spacing('8')   // 2rem (32px)
```

### Border Radius

```javascript
theme.borderRadius('sm')    // 0.125rem (2px)
theme.borderRadius('base')  // 0.25rem (4px)
theme.borderRadius('md')    // 0.375rem (6px)
theme.borderRadius('lg')    // 0.5rem (8px)
theme.borderRadius('full')  // 9999px (pill shape)
```

### Shadows

Elevation system for layering:

```javascript
theme.shadow('sm')     // Subtle shadow
theme.shadow('base')   // Default shadow
theme.shadow('md')     // Medium shadow for cards
theme.shadow('lg')     // Large shadow for modals
theme.shadow('2xl')    // Extra large shadow for overlays
```

## Component Tokens

### Buttons

```javascript
// Predefined button configurations
designTokens.components.button.height.md  // 40px
designTokens.components.button.padding.md // 0 16px
```

### Inputs

```javascript
designTokens.components.input.height.md           // 40px
designTokens.components.input.borderWidth         // 1px
designTokens.components.input.focusBorderWidth    // 2px
```

### Layer Items

```javascript
designTokens.components.layerItem.height   // 48px
designTokens.components.layerItem.padding  // 12px 16px
designTokens.components.layerItem.gap      // 12px
```

## Best Practices

### 1. Token Selection

**✅ Do:**
```javascript
// Use semantic color names
color: theme.color('primary.500')
color: theme.color('success.main')

// Use spacing scale
margin: theme.spacing('4')
padding: `${theme.spacing('2')} ${theme.spacing('4')}`
```

**❌ Don't:**
```javascript
// Don't use arbitrary values
color: '#2196f3'
margin: '15px'

// Don't break the spacing scale
padding: '7px 13px'
```

### 2. Consistency

- Always use tokens for colors, spacing, typography
- Follow the established patterns for component sizing
- Use semantic color names rather than specific hues
- Maintain the 8px spacing grid

### 3. Three.js Integration

```javascript
// Scene setup with design tokens
scene.background = new THREE.Color(theme.color('threejs.sceneBackground'));

// Object highlighting
if (isSelected) {
  material.color.setHex(theme.color('threejs.objectSelected'));
} else if (isHovered) {
  material.color.setHex(theme.color('threejs.objectHighlight'));
}
```

## Updating from Figma

### 1. Export Design Tokens

When your Figma design changes:

1. Use Figma plugins like "Design Tokens" or "Figma Tokens"
2. Export as JSON format
3. Update the values in `design-tokens.js`
4. Regenerate CSS variables if needed

### 2. Automated CSS Generation

```javascript
import { generateCSSVariables } from './design-tokens.js';

// Generate CSS custom properties
const cssVars = generateCSSVariables();
console.log(cssVars);
// Output: { '--colors-primary-500': '#2196f3', ... }
```

### 3. Migration Script

Create a migration script to update existing styles:

```javascript
// Find and replace old values with tokens
const oldToNew = {
  '#2196f3': 'var(--colors-primary-500)',
  '16px': 'var(--spacing-4)',
  '8px': 'var(--border-radius-md)'
};
```

## Browser Support

The design token system uses:
- **CSS Custom Properties**: Supported in all modern browsers (IE 11+ with polyfill)
- **ES6 Modules**: Supported in all modern browsers
- **Template Literals**: For dynamic token usage in JavaScript

## Performance Considerations

### CSS Variables
- Computed once at root level
- Inherited by all children
- No runtime computation overhead

### JavaScript Tokens
- Import only what you need
- Use tree shaking to eliminate unused tokens
- Consider creating smaller token bundles for specific components

## Testing

### Visual Regression Testing
Test design token changes with:
```javascript
// Example with Playwright/Puppeteer
await page.screenshot({
  path: 'component-with-tokens.png',
  clip: { x: 0, y: 0, width: 400, height: 300 }
});
```

### Token Validation
```javascript
// Validate token structure
import { designTokens } from './design-tokens.js';

const hasRequiredColors = designTokens.colors.primary &&
                         designTokens.colors.secondary;
console.assert(hasRequiredColors, 'Missing required color tokens');
```

## Troubleshooting

### Common Issues

1. **CSS Variables not updating**
   - Check if design-tokens.css is imported
   - Verify CSS custom property syntax: `var(--token-name)`

2. **JavaScript tokens undefined**
   - Check import path: `../../assets/design-tokens.js`
   - Verify token exists in the exported object

3. **Three.js color conversion**
   - Ensure hex colors are properly formatted
   - Use `new THREE.Color(hexString)` for color conversion

### Debug Mode

```javascript
// Enable debug logging for token usage
const DEBUG_TOKENS = true;

function useToken(path) {
  const value = theme.color(path);
  if (DEBUG_TOKENS) {
    console.log(`Token ${path} → ${value}`);
  }
  return value;
}
```

## Migration Guide

### From Hardcoded Values

**Before:**
```css
.button {
  background: #2196f3;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
}
```

**After:**
```css
.button {
  background: var(--colors-primary-500);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--border-radius-md);
  font-size: var(--typography-font-size-sm);
}
```

### From DesignSystem.js

If migrating from an existing design system:

```javascript
// Old way
DesignSystem.colors.primary
DesignSystem.spacing.medium

// New way
theme.color('primary.500')
theme.spacing('4')
```

## Resources

- [Design Tokens Community Group](https://www.designtokens.org/)
- [Figma Design Tokens Plugin](https://www.figma.com/community/plugin/888356646278934516)
- [CSS Custom Properties MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)

---

*This design token system ensures consistency, maintainability, and seamless integration with your Figma designs.*