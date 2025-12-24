<objective>
Fix Vercel deployment build failures caused by missing modules.

The production build is failing with two "Module not found" errors that must be resolved for successful deployment.
</objective>

<context>
Next.js 15.5.7 project deployed to Vercel. The build fails during webpack compilation with:

1. `Module not found: Can't resolve '@/components/ui/popover'`
   - Imported by: `src/components/ScheduleCalendar.tsx`

2. `Module not found: Can't resolve '@notionhq/client'`
   - Imported by: `src/app/api/calendar/sync/notion/pull/route.ts`

Examine:
- `./package.json` for dependencies
- `./src/components/ui/popover.tsx` to verify it exists
- `./src/components/ScheduleCalendar.tsx` for the import statement
</context>

<requirements>
1. Ensure `@/components/ui/popover` resolves correctly:
   - Verify `src/components/ui/popover.tsx` exists and exports properly
   - If missing, create a Radix UI-based Popover component following project patterns

2. Ensure `@notionhq/client` is properly installed:
   - Verify it's in package.json dependencies (should be there already)
   - Run `npm install` if needed to ensure node_modules is in sync

3. Verify the build succeeds locally before completing
</requirements>

<implementation>
Steps:
1. Check if `src/components/ui/popover.tsx` exists - if not, create it using Radix UI Popover matching project patterns
2. Check if `@notionhq/client` is in package.json - if not, add it
3. Run `npm install` to sync dependencies
4. Run `npm run build` to verify fixes work locally
</implementation>

<verification>
Before declaring complete:
1. Run `npm run build` locally - must complete without errors
2. Confirm both modules resolve correctly during build
3. Stage and commit all necessary files if any were created/modified
</verification>

<success_criteria>
- `npm run build` completes successfully with no "Module not found" errors
- All required files are committed and ready to push to trigger new Vercel deployment
</success_criteria>
