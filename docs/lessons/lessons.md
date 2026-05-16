# Lessons Learned

## Build & Syntax Errors
- **Always Validate**: After editing `.tsx` or `.ts` files, run `npx tsc --noEmit` in the project root to catch syntax errors, missing imports, or prop-type mismatches.
- **Double-Check Style Props**: React `style` objects use camelCase (`zIndex`, `fontWeight`, `alignItems`) and never kebab-case (`z-index`).
- **JSX Braces**: Be extremely careful with ternary logic and closing braces `}` when editing large JSX blocks to avoid "Unexpected token" errors.
- **Polling Safety**: Always include a guard in polling functions (`analyzeProspectus`) to prevent clearing data when a second call is triggered for the same identifier.
