<objective>
Fix the RecurringDeleteConfirmationModal (and all modals) to respect the user's selected theme from Account Settings > Display & Theme, and add "Tactical corners" as a new window style option that applies 45-degree clipped corners to all window-style elements (modals, cards, sidebars, panels).

The RecurringDeleteConfirmationModal is currently displaying outdated HUD/tactical class styles instead of following the user's theme preference. This inconsistency breaks the unified design system.
</objective>

<context>
This is a Next.js calendar application using:
- React 19 with TypeScript
- Tailwind CSS with CSS variables for theming
- PreferencesModal for user settings (Account Settings > Display & Theme)
- Multiple theme options the user can select

Key files to investigate:
- `src/components/RecurringDeleteConfirmationModal.tsx` - The modal with incorrect styling
- `src/components/PreferencesModal.tsx` - Where theme settings are configured
- `src/app/globals.css` - CSS variables and theme definitions
- `src/components/ui/dialog.tsx` - Base dialog component from shadcn/ui
- Other modals for comparison (e.g., `EventCreationModal.tsx`, `ConflictResolutionModal.tsx`)

The "tactical" styling with HUD-like appearance and corner clipping should become an OPTIONAL style the user can select, not a hardcoded default.
</context>

<research>
Before implementing, thoroughly analyze:

1. **Theme System**: Examine how themes are defined and applied:
   - What CSS variables control theming in `globals.css`?
   - How does `PreferencesModal` store the user's theme preference?
   - What mechanism applies the selected theme to the DOM (data attributes, classes, context)?

2. **Current Modal Styling**: Compare RecurringDeleteConfirmationModal with other modals:
   - What classes/styles are hardcoded vs theme-aware?
   - Identify the specific "hud" and "tactical" classes causing the issue
   - Check if `DialogContent` from shadcn/ui has its own styling

3. **Window Style System**: Check if a window/corner style setting already exists:
   - Look for existing corner radius or window style options in PreferencesModal
   - Identify where such a setting would fit in the preferences schema
   - Find all components that would need to respect this setting
</research>

<requirements>

1. **Fix Modal Theming**:
   - Update RecurringDeleteConfirmationModal to use theme-aware CSS variables
   - Remove hardcoded HUD/tactical classes that override user theme
   - Ensure all modals in the app follow the same theming pattern
   - Verify the modal respects light/dark/mocha/true-dark themes (or whatever themes exist)

2. **Add "Tactical Corners" Window Style**:
   - Add a new setting in PreferencesModal under Display & Theme: "Window Style"
   - Options should include at minimum: "Rounded" (default), "Tactical corners" (45-degree clipped)
   - Store this preference alongside other theme settings
   - Create CSS for the 45-degree corner clip effect (using clip-path or similar)

3. **Apply Window Style Globally**:
   - When "Tactical corners" is selected, apply to:
     - All modals/dialogs
     - Cards with the `.neo-card` or similar classes
     - Sidebar panels
     - Any other window-style containers
   - The implementation should be easy to extend for future window styles

4. **Preserve Existing Functionality**:
   - Do not break any existing themes
   - Ensure the tactical corner effect works with all color themes
   - Maintain accessibility (contrast, focus states)
</requirements>

<implementation>
Suggested approach:

1. **Create window style CSS classes**:
   ```css
   /* Default rounded */
   [data-window-style="rounded"] .window-container {
     border-radius: var(--radius);
   }

   /* Tactical corners - 45-degree clips */
   [data-window-style="tactical"] .window-container {
     clip-path: polygon(
       var(--corner-cut) 0,
       calc(100% - var(--corner-cut)) 0,
       100% var(--corner-cut),
       100% calc(100% - var(--corner-cut)),
       calc(100% - var(--corner-cut)) 100%,
       var(--corner-cut) 100%,
       0 calc(100% - var(--corner-cut)),
       0 var(--corner-cut)
     );
   }
   ```

2. **Add to PreferencesModal**:
   - Add a "Window Style" dropdown/select in the Display section
   - Save preference to localStorage (or wherever other preferences are stored)
   - Apply data attribute to document root when changed

3. **Update affected components**:
   - Add `window-container` class to modals, cards, panels
   - Ensure the class hierarchy allows window style to apply

4. **Clean up RecurringDeleteConfirmationModal**:
   - Replace hardcoded HUD classes with theme variables
   - Use consistent patterns from other modals
</implementation>

<constraints>
- Do NOT remove the tactical aesthetic entirely - it should become a selectable option
- Do NOT modify the core shadcn/ui components directly; override styles instead
- Ensure the corner clip doesn't cut off modal content or buttons
- Test with all existing themes to ensure compatibility
</constraints>

<output>
Modify the following files:
- `src/app/globals.css` - Add window style CSS classes
- `src/components/PreferencesModal.tsx` - Add window style setting
- `src/components/RecurringDeleteConfirmationModal.tsx` - Fix theme compliance
- `src/components/ui/dialog.tsx` - Add window-container class if needed
- Any other modals or cards that need the window-container class

If a theme context or hook exists, update it to include window style.
</output>

<verification>
Before declaring complete, verify:

1. Open PreferencesModal and confirm "Window Style" option exists with Rounded/Tactical options
2. Select "Tactical corners" and verify modals display 45-degree clipped corners
3. Select "Rounded" and verify modals have normal rounded corners
4. Open RecurringDeleteConfirmationModal with each theme (light, dark, etc.) and verify it matches the selected theme
5. Check other modals (EventCreationModal, ConflictResolutionModal) follow the same styling
6. Verify no content is cut off by the corner clips
7. Run type-check to ensure no TypeScript errors
</verification>

<success_criteria>
- RecurringDeleteConfirmationModal matches the user's selected theme
- "Window Style" setting appears in PreferencesModal > Display & Theme
- "Tactical corners" selection applies 45-degree clips to all window-style elements
- "Rounded" selection restores normal rounded corners
- All themes work correctly with both window styles
- No regression in existing modal functionality
</success_criteria>
