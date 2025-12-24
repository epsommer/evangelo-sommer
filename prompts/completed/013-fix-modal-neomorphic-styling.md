<objective>
Fix the neomorphic window styling not being applied to dialog/modal components in the application.

The `window-container` class is applied to DialogContent but neomorphic styles (border-radius, box-shadows) are not rendering because the CSS selectors require a parent `.neomorphic-window` class.
</objective>

<context>
Tech stack: Next.js, React, Radix UI Dialog, Tailwind CSS, custom neomorphic/tactical CSS themes.

Key files:
- @src/components/ui/dialog.tsx - The Dialog component using Radix UI Portal
- @src/app/tactical.css - Contains window theme selectors (lines 1227-1311)
- @src/app/neomorphic.css - Contains neomorphic design system variables and classes

The issue: Radix UI Dialog uses a Portal that renders content at the document root level, breaking the CSS selector chain. The window theme class (e.g., `neomorphic-window`, `tactical-window`, `tactical-corners-window`) is applied to `<html>` or `<body>`, but portal content doesn't inherit this styling context properly for descendant selectors like `.neomorphic-window .window-container`.
</context>

<requirements>
1. Investigate where the window theme class is applied in the app (likely in a layout or root component)
2. Determine the best fix approach:
   - Option A: Add the window theme class directly to DialogContent in dialog.tsx
   - Option B: Configure Radix Portal to use a container that has the theme class
   - Option C: Modify CSS selectors to work with portal-rendered content
3. Implement the fix that maintains consistency with how other components handle theming
4. Ensure the fix works for all window themes (neomorphic-window, tactical-window, tactical-corners-window)
5. Test that the fix doesn't break existing dialog styling elsewhere
</requirements>

<implementation>
Research first:
1. Search for where `neomorphic-window`, `tactical-window`, or `tactical-corners-window` classes are applied
2. Check if there's a theme context or hook that provides the current window theme
3. Look at how other portaled components (popovers, tooltips, dropdowns) handle this

Implementation approach:
- If there's a theme hook/context, use it in DialogContent to dynamically add the theme class
- If no hook exists, consider reading from a CSS variable or the document element
- The fix should be minimal and follow existing patterns in the codebase
</implementation>

<output>
Modify files as needed to fix the modal styling. Expected changes likely in:
- `./src/components/ui/dialog.tsx` - Add theme class to DialogContent

Verify by:
- Opening any dialog in the app
- Confirming border-radius and shadow styles match the active window theme
- Testing with different window themes (neomorphic, tactical, tactical-corners)
</output>

<success_criteria>
- Dialogs render with proper neomorphic styling (border-radius, box-shadows) when neomorphic-window theme is active
- Dialogs render with sharp corners when tactical-window theme is active
- Dialogs render with clipped corners when tactical-corners-window theme is active
- No regression in existing dialog functionality
</success_criteria>
