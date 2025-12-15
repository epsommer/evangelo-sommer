<objective>
Refactor the System Preferences page from a card-based layout to a clean list-based layout.

The current design uses cards with backgrounds, borders, and padding grouped in a 2-column grid.
The new design should display settings as a simple, vertically stacked list where each setting item flows naturally without card containers.
</objective>

<context>
File to modify: `src/app/system-preferences/page.tsx`

Current Layout Structure:
- Two-column grid: `grid grid-cols-1 lg:grid-cols-2 gap-8`
- Cards with: `bg-hud-background-primary border-2 border-hud-border p-6`
- Card headings: `h3` elements with uppercase text
- Settings items inside cards with borders and padding

This is the Becky CRM portion of the evangelosommer.com project.
</context>

<requirements>
1. Remove the 2-column grid layout from all tabs (display, notifications, workflow, performance, conversations, eventParsing, integrations)
2. Remove card containers (`bg-hud-background-primary border-2 border-hud-border p-6`)
3. Convert to a clean list layout where:
   - Each setting item is a row with label on left, control on right
   - Use subtle dividers between items (light border-bottom) instead of card boundaries
   - Group related settings under section headings without card wrappers
4. Keep section headings (`h3`) but remove their card container background
5. Maintain all existing functionality - only change the visual layout structure
6. Preserve the existing sidebar navigation (left side) - only refactor the main content area (right side)
</requirements>

<implementation>
For each tab section, transform from:
```jsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  <div className="bg-hud-background-primary border-2 border-hud-border p-6">
    <h3>Section Title</h3>
    <div className="space-y-6">
      {/* settings */}
    </div>
  </div>
</div>
```

To:
```jsx
<div className="space-y-8">
  <div>
    <h3 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-4 pb-2 border-b border-hud-border">
      Section Title
    </h3>
    <div className="divide-y divide-hud-border">
      {/* settings items as list rows */}
    </div>
  </div>
</div>
```

For individual setting items, transform from bordered boxes to cleaner list rows:
- Remove `p-4 border border-hud-border` wrapper
- Use `py-4` for vertical spacing
- Let the `divide-y` on parent handle separators

For select dropdowns and other form elements:
- Keep full-width styling
- Add subtle background hover states
</implementation>

<output>
Modify: `./src/app/system-preferences/page.tsx`
- Refactor all tab content sections to use list layout
- Remove grid layouts and card wrappers
- Apply consistent list styling across all tabs
</output>

<verification>
After changes:
1. All preference tabs should display as clean vertical lists
2. No card containers should be visible
3. Settings should be organized under section headings with dividers
4. All toggle switches, selects, and inputs should remain functional
5. The sidebar navigation should be unchanged
6. Visual hierarchy should be maintained through typography and spacing
</verification>

<success_criteria>
- Cards removed: No elements with `bg-hud-background-primary border-2 border-hud-border` pattern in main content
- Grid removed: No `grid grid-cols-1 lg:grid-cols-2` in tab content areas
- List layout: Settings displayed as simple rows with dividers
- Functionality preserved: All preferences still work correctly
</success_criteria>
