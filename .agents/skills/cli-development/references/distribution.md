# Distribution

> Canonical: <https://clig.dev/#distribution> — fetch the live source
> via the tavily-extract skill or `WebFetch` against
> `https://clig.dev/llms.txt` before binding recommendations to quoted
> text. This file is a snapshot.

**If possible, distribute as a single binary.** If your language
doesn't compile to binary executables as standard, see if it has
something like [PyInstaller](https://www.pyinstaller.org/). If you
really can't distribute as a single binary, use the platform's native
package installer so you aren't scattering things on disk that can't
easily be removed. Tread lightly on the user's computer.

If you're making a language-specific tool, such as a code linter,
then this rule doesn't apply — it's safe to assume the user has an
interpreter for that language installed on their computer.

**Make it easy to uninstall.** If it needs instructions, put them at
the bottom of the install instructions — one of the most common times
people want to uninstall software is right after installing it.
