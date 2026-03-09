# Video Introduction

Remotion-based video creation for Divergent Todos introduction and promotional videos.

## Getting Started

```bash
# Start Remotion Studio (from root directory)
pnpm dev:video

# Or from this directory
pnpm dev
```

## Project Structure

- `src/Root.tsx` - Composition registration
- `src/IntroVideo.tsx` - Main intro video component
- `src/index.css` - Tailwind CSS styles matching the main app
- `src/index.ts` - Entry point

## Creating Videos

The project uses:
- **Remotion** for programmatic video creation
- **React 19** for component-based rendering
- **Tailwind CSS 4** for styling (matching the main app's design system)

## Color Scheme

The Tailwind config includes custom colors matching Divergent Todos:
- Accent colors (indigo/purple theme)
- Background colors (light/dark)
- Text colors
- Border colors

## Development

1. **Remotion Studio** (`pnpm dev`) - Interactive preview with timeline
2. **Edit compositions** in `src/Root.tsx`
3. **Create video sequences** using Remotion's `Sequence` component
4. **Use Tailwind classes** for styling

## Rendering

```bash
# Render the intro video
pnpm build

# Custom render with props
npx remotion render src/index.ts IntroVideo output.mp4 --props='{"title":"Custom Title"}'
```

## Key Concepts

- **Frames**: Each video is composed of frames (30 fps = 30 frames per second)
- **useCurrentFrame()**: Get the current frame number for animations
- **interpolate()**: Map frame numbers to animation values
- **spring()**: Physics-based animations
- **Sequence**: Time-shift components within the video

## Next Steps

1. Recreate UI components from the main app
2. Create animated sequences showing features
3. Add transitions and effects
4. Render final promotional videos
