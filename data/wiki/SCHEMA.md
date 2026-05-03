# Wiki Schema

## Purpose
This wiki is maintained by an LLM. You write and maintain all pages in pages/.
Raw sources are in sources/ – read them, never modify them.

## Conventions
- All pages are markdown files in pages/
- Use [[Wikilinks]] for internal cross-references
- Every page should have a # Title heading
- Entity pages: people, places, projects → pages/entities/
- Concept pages: ideas, themes, topics → pages/concepts/
- Source summaries → pages/sources/
- Overview/synthesis pages → pages/

## Ingest Workflow
When ingesting a new source:
1. Read the source document
2. Write a summary page at pages/sources/<slug>.md
3. Update or create entity/concept pages that the source touches
4. Update index.md with the new page(s)
5. Append to log.md: ## [<date>] ingest | <title>

## Query Workflow
1. Read index.md to find relevant pages
2. Read those pages
3. Synthesize an answer with citations
4. If the answer is valuable, offer to file it as a new wiki page

## Lint Workflow
Check for: contradictions, stale claims, orphan pages, missing cross-references,
concepts mentioned but lacking their own page. Report issues as a bulleted list.
