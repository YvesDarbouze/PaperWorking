---
name: debugging-strategies
description: Strategies and methodologies for methodical and systematic debugging.
---

# Debugging Strategies

Transform debugging from frustrating guesswork into systematic problem-solving with proven strategies, powerful tools, and methodical approaches.

## When to Use This Skill

- Tracking down elusive bugs
- Investigating performance issues
- Understanding unfamiliar codebases
- Debugging production issues
- Analyzing crash dumps and stack traces
- Profiling application performance
- Investigating memory leaks
- Debugging distributed systems

## Core Principles

### 1. The Scientific Method
- **Observe:** Identify the symptoms and gather data.
- **Hypothesize:** Propose a potential cause based on the data.
- **Experiment:** Test the hypothesis (e.g., through isolation, logging, or debugging tools).
- **Conclude:** Analyze the results. If the hypothesis is correct, fix it; if not, revise the hypothesis.

### 2. Isolate the Problem
- Use binary search techniques to narrow down the source of the issue (e.g., `git bisect` for regressions, commenting out code blocks).
- Ensure the bug is reproducible in a controlled environment.

### 3. Read the Error
- Carefully read the entire error message, stack trace, and logs. Look for the exact line of code causing the failure.

### 4. Rubber Duck Debugging
- Explain the code and the problem step-by-step. Often, articulating the logic reveals flaws or missed edge cases.

### 5. Check Assumptions
- Don't assume the libraries, APIs, or basic language features are working flawlessly. Verify inputs, outputs, and intermediate states.

## General Workflow

1. **Reproduce the Issue:** Always ensure you have a reliable way to trigger the bug.
2. **Review Recent Changes:** Most bugs are introduced by recent commits. Check the git history.
3. **Add Visibility:** Introduce logging or use a debugger to inspect variables at critical execution points.
4. **Fix and Validate:** Apply the fix and verify that not only is the bug resolved, but no new regressions were introduced.
