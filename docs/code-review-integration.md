# Code Review Integration Guide

## Overview

Automated code review flow using parallel subagent analysis (Sentinel, Jason, Scout).

## Quick Start

```bash
# Review a single file
node ~/.openclaw/workspace/scripts/code-review.ts src/app/page.tsx

# Review directory
node ~/.openclaw/workspace/scripts/code-review.ts src/components/

# Review with auto-fix
node ~/.openclaw/workspace/scripts/code-review.ts src/ --auto-fix

# Save report to file
node ~/.openclaw/workspace/scripts/code-review.ts src/ --output=review-report.md

# Skip specific agents
node ~/.openclaw/workspace/scripts/code-review.ts src/ --no-performance
```

## Integration Points

### 1. Mission Control Tasks

Add to task completion workflow:

```typescript
// Before marking task as "Done"
const reviewResult = await exec('node scripts/code-review.ts path/to/changes');
if (reviewResult.exitCode !== 0) {
  updateTaskStatus(taskId, 'waiting');
  await sendMessage('⚠️ Code review found critical issues. Review required.');
}
```

### 2. GitHub Actions

`.github/workflows/code-review.yml`:

```yaml
name: Code Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g openclaw
      - run: node scripts/code-review.ts . --output=review.md
      - uses: actions/upload-artifact@v3
        with:
          name: review-report
          path: review.md
```

### 3. Pre-commit Hook

`.git/hooks/pre-commit`:

```bash
#!/bin/bash
echo "Running code review on staged files..."
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')

if [ -n "$STAGED_FILES" ]; then
  node ~/.openclaw/workspace/scripts/code-review.ts $STAGED_FILES
  if [ $? -ne 0 ]; then
    echo "❌ Code review failed. Fix critical issues or commit with --no-verify"
    exit 1
  fi
fi
```

### 4. Nightly Sprint

Add to `scripts/nightly-sprint.ts`:

```typescript
// Review uncommitted changes
const uncommitted = await exec('git diff --name-only');
if (uncommitted.stdout.trim()) {
  await exec('node scripts/code-review.ts . --output=docs/nightly-review.md');
}
```

## Agent Responsibilities

| Agent | Focus | Model |
|-------|-------|-------|
| **Sentinel** | Security, edge cases, test coverage | `google/gemini-2.5-flash` |
| **Jason** | Architecture, patterns, code quality | `gpt-5.2-codex` |
| **Scout** | Performance, dependencies, research | `google/gemini-2.5-flash` |

## Output Format

Structured markdown with:
- Critical issues (exit code 1)
- Warnings (exit code 0)
- Suggestions (exit code 0)
- Auto-fixed items

## Configuration

Create `~/.openclaw/workspace/config/code-review.json`:

```json
{
  "default_agents": ["security", "architecture", "performance"],
  "auto_fix": true,
  "severity_threshold": "warning",
  "exclude_patterns": ["*.test.ts", "*.spec.ts"],
  "custom_rules": {
    "max_function_lines": 50,
    "max_file_lines": 300,
    "require_types": true
  }
}
```

## Best Practices

1. **Run Before PRs**: Always review locally before pushing
2. **Fix Critical First**: Prioritize security and logic issues
3. **Use Auto-Fix**: Let agents handle formatting automatically
4. **Iterative Review**: Re-run after addressing issues
5. **Team Standards**: Customize rules in config file

## Troubleshooting

**Agent timeouts:**
```bash
# Increase timeout in sessions_spawn calls
# or review smaller chunks
node scripts/code-review.ts src/components/ --no-performance
```

**False positives:**
```bash
# Exclude specific patterns
node scripts/code-review.ts src/ --exclude="*.test.ts"
```

**Missing agents:**
```bash
# Verify agents exist
openclaw agents list
```

## Next Steps

- [ ] Add VS Code extension integration
- [ ] Implement AI-powered auto-fix suggestions
- [ ] Create interactive review UI in Mission Control
- [ ] Add support for custom linting rules
- [ ] Integrate with Jira/Linear for automated issue creation
