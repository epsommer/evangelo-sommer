<objective>
Fix the delete recurring event and delete multiday event modals to properly receive neomorphic rounded corner styles when the user has selected this window style in Account Settings > Display & Themes.

Currently, these modals and their child elements (buttons, inputs, cards, option containers) are not respecting the window theme preference and remain with sharp/tactical corners even when "Rounded" (neomorphic) is selected.
</objective>

<context>
This is a Next.js calendar application with a theming system that supports multiple window styles:
- "neomorphic" / "Rounded" - Soft rounded corners, neomorphic shadows
- "tactical" / "Sharp" - Square corners, flat shadows
- "tactical-corners" - 45-degree clipped corners (HUD style)

The window theme preference is stored in localStorage as `window-theme` and applied as a CSS class on `document.documentElement`:
- `.neomorphic-window`
- `.tactical-window`
- `.tactical-corners-window`

The `window-container` class on elements should automatically inherit correct styling based on the active window theme class. However, the delete modals are not properly styled.

@src/components/RecurringDeleteConfirmationModal.tsx - recurring event delete modal
@src/components/ui/card.tsx - Card component used in modals
@src/components/ui/button.tsx - Button component
@src/components/ui/dialog.tsx - Dialog/Modal component
@src/app/tactical.css - Window theme CSS definitions
</context>

<research>
Before implementing, explore:

1. **Current modal structure**: Examine RecurringDeleteConfirmationModal and any multiday delete modal to understand their component hierarchy

2. **Window theme CSS**: Review tactical.css to understand how `.neomorphic-window`, `.tactical-window`, and `.tactical-corners-window` apply styles to child elements

3. **Problem identification**: Identify which elements are not receiving the theme:
   - DialogContent container
   - Card components inside modals
   - Button components
   - Option buttons/radio-style selections
   - Any nested containers

4. **Pattern from working components**: Find components where window theming DOES work correctly and understand the pattern
</research>

<requirements>
## Elements to Fix

1. **Dialog/Modal Container**
   - DialogContent should use `window-container` class to receive theme styling
   - Verify the Dialog component properly passes through theme classes

2. **Card Components**
   - Ensure Card uses `window-container` not hardcoded `tactical-frame`
   - Cards for event info, warnings, and errors should all respect theme

3. **Buttons**
   - All buttons in the modal should have appropriate border-radius based on theme
   - Primary action buttons (Delete, Cancel)
   - Option selection buttons (delete this only, delete all, etc.)

4. **Form Elements**
   - Any inputs or selects should respect theme
   - Radio-style option containers

5. **Nested Containers**
   - Description boxes
   - Warning/error alert boxes
   - Any grouped content areas

## Expected Behavior

When user has "Rounded" (neomorphic) window style selected:
- All modal elements should have rounded corners (8-12px radius)
- Soft neomorphic shadows where appropriate
- No sharp 0px corners or 45-degree clips

When user has "Sharp" (tactical) window style selected:
- All modal elements should have 0px radius (square corners)
- Flat shadows

When user has "Tactical Corners" window style selected:
- All modal elements should have 45-degree clipped corners via clip-path
</requirements>

<implementation>
Approaches to consider:

1. **Use window-container class**: Replace hardcoded styling classes with `window-container` which is automatically themed

2. **Add theme-aware utility classes**: Create or use existing utility classes that respond to the window theme

3. **CSS-based approach**: Ensure tactical.css properly targets modal elements with the window theme selectors:
   ```css
   .neomorphic-window .modal-element { border-radius: 12px; }
   .tactical-window .modal-element { border-radius: 0; }
   ```

4. **Component-level fix**: Update Dialog, Card, Button components to be theme-aware

Avoid:
- Hardcoding any specific corner style (always use theme-aware classes)
- Breaking existing tactical/tactical-corners functionality
- Adding inline styles that override theme CSS
</implementation>

<output>
Modify files as needed:
- `./src/components/RecurringDeleteConfirmationModal.tsx`
- `./src/components/ui/dialog.tsx` (if needed)
- `./src/components/ui/card.tsx` (if not already fixed)
- `./src/components/ui/button.tsx` (if needed)
- `./src/app/tactical.css` (if CSS rules are missing)

If a multiday delete modal exists separately, fix that as well.
</output>

<verification>
Test the following scenarios:

1. **Neomorphic theme test**:
   - Go to Account Settings > Display & Themes
   - Select "Rounded" window style
   - Open a recurring event delete modal
   - Verify ALL elements have rounded corners

2. **Tactical theme test**:
   - Select "Sharp" window style
   - Open delete modal
   - Verify all elements have square corners

3. **Tactical corners test**:
   - Select "Tactical Corners" window style
   - Open delete modal
   - Verify all elements have 45-degree clips

4. **Element checklist** (for each theme):
   - [ ] Modal outer container
   - [ ] Event info card
   - [ ] Option selection buttons
   - [ ] Cancel button
   - [ ] Delete button
   - [ ] Warning/error cards
   - [ ] Description text boxes
</verification>

<success_criteria>
- All delete modal elements respect the user's window style preference
- No hardcoded corner styles remain in delete modal components
- Theme switching updates modal appearance correctly
- Existing functionality unchanged (delete operations still work)
- No visual regression in other parts of the application
</success_criteria>
