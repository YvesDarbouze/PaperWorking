# Errors

> Canonical: <https://clig.dev/#errors> — fetch the live source via the
> tavily-extract skill or `WebFetch` against `https://clig.dev/llms.txt`
> before binding recommendations to quoted text. This file is a snapshot.

One of the most common reasons to consult documentation is to fix
errors. If you can make errors into documentation, then this will save
the user loads of time.

**Catch errors and rewrite them for humans.** If you're expecting an
error to happen, catch it and rewrite the error message to be useful.
Think of it like a conversation, where the user has done something
wrong and the program is guiding them in the right direction. Example:
"Can't write to file.txt. You might need to make it writable by
running 'chmod +w file.txt'."

**Signal-to-noise ratio is crucial.** The more irrelevant output you
produce, the longer it's going to take the user to figure out what
they did wrong. If your program produces multiple errors of the same
type, consider grouping them under a single explanatory header instead
of printing many similar-looking lines.

**Consider where the user will look first.** Put the most important
information at the end of the output. The eye will be drawn to red
text, so use it intentionally and sparingly.

**If there is an unexpected or unexplainable error, provide debug and
traceback information, and instructions on how to submit a bug.** That
said, don't forget about the signal-to-noise ratio: you don't want to
overwhelm the user with information they don't understand. Consider
writing the debug log to a file instead of printing it to the
terminal.

**Make it effortless to submit bug reports.** One nice thing you can
do is provide a URL and have it pre-populate as much information as
possible.

_Further reading: [Google: Writing Helpful Error
Messages](https://developers.google.com/tech-writing/error-messages),
[Nielsen Norman Group: Error-Message
Guidelines](https://www.nngroup.com/articles/error-message-guidelines)._
