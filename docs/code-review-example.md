# Code Review Flow - Usage Example

## Scenario: Review PR Before Merge

You've completed a feature and want to ensure code quality before opening a PR.

### Step 1: Run Review

```bash
node scripts/review.js src/features/new-dashboard/
```

### Step 2: Output

```markdown
# Code Review Report
**Target:** src/features/new-dashboard/
**Date:** 2026-06-11
**Reviewers:** security, architecture, performance

## Critical Issues (2)
- [SECURITY] SQL injection risk in Dashboard.tsx:145
  - Raw user input passed to query builder
  - Fix: Use parameterized queries
  
- [LOGIC] Race condition in useEffect (UserPanel.tsx:78)
  - State update after unmount possible
  - Fix: Add cleanup function with mounted flag

## Warnings (4)
- [PERFORMANCE] Unnecessary re-renders in child components
  - 5 components re-render on every parent state change
  - Fix: Use React.memo() or useMemo()

- [ARCHITECTURE] Tight coupling to database schema
  - Components directly reference DB column names
  - Fix: Use DTOs/interfaces for data shapes

- [ARCHITECTURE] Missing error boundaries
  - No error handling for async operations
  - Fix: Wrap components in ErrorBoundary

- [STYLE] Inconsistent naming conventions
  - Mix of camelCase and snake_case
  - Fix: Standardize to camelCase

## Suggestions (3)
- Consider extracting business logic into custom hooks
- Add loading states for async operations
- Document complex algorithms with inline comments

## Auto-Fixed (0)
*No auto-fixable issues found*
```

### Step 3: Address Critical Issues

Fix SQL injection:

```typescript
// Before (UNSAFE)
const query = `SELECT * FROM users WHERE id = ${userId}`;

// After (SAFE)
const query = db.prepare('SELECT * FROM users WHERE id = ?').bind(userId);
```

Fix race condition:

```typescript
useEffect(() => {
  let mounted = true;
  
  fetchData().then(data => {
    if (mounted) {
      setState(data);
    }
  });
  
  return () => { mounted = false; };
}, []);
```

### Step 4: Re-run Review

```bash
node scripts/review.js src/features/new-dashboard/
```

### Step 5: Verify Clean

```markdown
# Code Review Report
**Target:** src/features/new-dashboard/
**Date:** 2026-06-11

## ✅ No Critical Issues Found

## Warnings (2)
- [PERFORMANCE] Consider memoization for expensive calculations
- [ARCHITECTURE] Could benefit from dependency injection

## Suggestions (3)
- Add JSDoc comments for public APIs
- Consider splitting large components
- Add unit tests for business logic
```

### Step 6: Open PR

Now that critical issues are resolved, open PR with confidence.

## Scenario: Nightly Sprint Review

Automatically review uncommitted changes:

```typescript
// In scripts/nightly-sprint.ts
const uncommitted = await exec('git diff --name-only');
if (uncommitted.stdout.trim()) {
  const review = await exec('node scripts/review.js . --output=docs/nightly-review.md');
  
  if (review.exitCode !== 0) {
    // Critical issues found
    await createGitHubIssue({
      title: 'Code Review: Critical Issues Found',
      body: fs.readFileSync('docs/nightly-review.md', 'utf8'),
      labels: ['code-review', 'critical']
    });
  }
}
```

## Scenario: Pre-commit Gate

Block commits with critical issues:

```bash
#!/bin/bash
# .git/hooks/pre-commit

STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')

if [ -n "$STAGED" ]; then
  node scripts/review.js $STAGED
  
  if [ $? -ne 0 ]; then
    echo "❌ Critical issues found. Fix or commit with --no-verify"
    exit 1
  fi
fi

echo "✅ Code review passed"
```

## Tips

1. **Review early and often** - Catch issues before they compound
2. **Fix critical first** - Security and logic bugs take priority
3. **Use auto-fix** - Let agents handle formatting automatically
4. **Iterate** - Re-run after fixes to verify resolution
5. **Configure thresholds** - Adjust severity levels in `config/code-review.json`
