# Code Review Flow - Implementation Notes

**Date:** 2026-06-11  
**Context:** Built custom code review orchestration using subagent system

## Architecture

### Core Components

1. **Skill Definition** (`skills/code-review/SKILL.md`)
   - Trigger patterns
   - Agent delegation strategy
   - Output format specification

2. **Orchestration Script** (`scripts/code-review.ts`)
   - Parallel subagent spawning
   - Finding aggregation
   - Report generation
   - Auto-fix capabilities

3. **Integration Points**
   - Mission Control tasks (pre-"Done" validation)
   - GitHub Actions (PR reviews)
   - Pre-commit hooks
   - Nightly sprints

### Agent Delegation

| Agent | Expertise | Review Focus |
|-------|-----------|--------------|
| **Sentinel** | QA/Security | Vulnerabilities, edge cases, test coverage |
| **Jason** | Architecture | SOLID, patterns, coupling, readability |
| **Scout** | Research | Performance, complexity, dependencies |

### Parallel Execution

- All agents run concurrently using `Promise.all()`
- Timeout handling per agent (failures don't block others)
- Results aggregated by severity level
- Exit code 1 on critical issues (useful for CI/CD gates)

## Design Decisions

### Why TypeScript Script vs. Pure Skill?

- **Flexibility**: Need programmatic control over subagent orchestration
- **Reusability**: Can be called from CLI, Git hooks, CI, or Mission Control
- **Structured Output**: JSON parsing + markdown generation
- **Auto-fix**: Integration with formatters/linters

### Why Parallel vs. Sequential?

- **Speed**: 3 agents in parallel vs. sequential saves ~60% time
- **Independence**: Each agent has distinct focus, no dependencies
- **Graceful Degradation**: One agent failure doesn't block others

### Severity Levels

- **Critical**: Security holes, logic errors → Exit code 1
- **Warning**: Code smells, potential issues → Exit code 0
- **Suggestion**: Style, optimization ideas → Exit code 0

## Integration Strategy

### Mission Control

Before marking any task "Done", run review on changed files:

```typescript
const changedFiles = await git.diff(['--name-only', 'HEAD']);
if (changedFiles.length > 0) {
  const review = await codeReview(changedFiles);
  if (review.hasCritical) {
    throw new Error('Code review failed - critical issues found');
  }
}
```

### GitHub Workflow

Trigger on PR creation → Run review → Post as comment

### Pre-commit Hook

Lightweight check on staged files only, with `--no-verify` escape hatch

## Future Enhancements

- [ ] VS Code extension with inline annotations
- [ ] Interactive fix application (choose which auto-fixes to apply)
- [ ] Custom rule engine (project-specific checks)
- [ ] Learning from past reviews (track recurring issues)
- [ ] Integration with Mission Control UI (visual review dashboard)

## Key Learnings

1. **Subagent orchestration is powerful** - Each agent brings specialized expertise
2. **Parallel execution scales well** - No reason to wait sequentially
3. **Structured output matters** - JSON + markdown gives best of both worlds
4. **Exit codes for CI** - Non-zero on critical issues enables automated gates
5. **Auto-fix cautiously** - Only safe, deterministic fixes (formatting, imports)

## Testing

```bash
# Test on a known-good file
node scripts/review.js src/app/page.tsx

# Test on directory with issues
node scripts/review.js src/components/

# Test auto-fix
node scripts/review.js src/utils/ --auto-fix

# Test output to file
node scripts/review.js . --output=test-review.md
```

## Related Files

- `skills/code-review/SKILL.md` - Skill definition
- `scripts/code-review.ts` - Main orchestrator
- `scripts/review.js` - Convenience wrapper
- `docs/code-review-integration.md` - Integration guide
