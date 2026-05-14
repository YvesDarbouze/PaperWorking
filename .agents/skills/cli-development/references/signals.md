# Signals and control characters

> Canonical: <https://clig.dev/#signals> — fetch the live source via the
> tavily-extract skill or `WebFetch` against `https://clig.dev/llms.txt`
> before binding recommendations to quoted text. This file is a snapshot.

**If a user hits Ctrl-C (the INT signal), exit as soon as possible.**
Say something immediately, before you start clean-up. Add a timeout
to any clean-up code so it can't hang forever.

**If a user hits Ctrl-C during clean-up operations that might take a
long time, skip them.** Tell the user what will happen when they hit
Ctrl-C again, in case it is a destructive action.

For example, when quitting Docker Compose, you can hit Ctrl-C a second
time to force your containers to stop immediately instead of shutting
them down gracefully.

```
$  docker-compose up
…
^CGracefully stopping... (press Ctrl+C again to force)
```

Your program should expect to be started in a situation where clean-up
has not been run. (See [Crash-only software: More than meets the
eye](https://lwn.net/Articles/191059/).)
