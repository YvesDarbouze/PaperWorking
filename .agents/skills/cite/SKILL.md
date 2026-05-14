---
name: cite
description: >-
  Generate APA-format citations from paper links. This skill should be used
  when the user asks to "cite a paper", "generate APA citations", "format
  references", or provides paper links (arXiv, DOI, conference URLs) for
  citation formatting.
metadata:
  context: fork
---

# Cite

Fetch paper(s) from the provided link(s) and generate APA-format citations.

## Input

$ARGUMENTS

## Process

1. Fetch each URL and extract metadata (authors, year, title, venue, identifiers).
2. Format each as an APA citation with a direct link.
3. Return all citations to the user.

If no URLs are provided, ask the user for the paper link(s) to cite.
