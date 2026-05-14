# Open Color Palette → ANSI 24-bit Escapes

The template emits 24-bit ANSI colour escapes (CSI `38;2;R;G;Bm` for foreground, `48;2;R;G;Bm` for background). Hex values come from the Open Color palette by Yuna Kim, published at <https://yeun.github.io/open-color/>. Open Color is licensed MIT, with the palette intended for UI work and a consistent ten-shade structure (0 lightest, 9 darkest) per hue family.

## Why 24-bit instead of the legacy 8/16-color set

Modern terminals — iTerm2, Kitty, Alacritty, Windows Terminal, recent VS Code, recent GNOME Terminal, Konsole, WezTerm — all support 24-bit colour and have for years. The classic eight-colour palette is constrained by the user's chosen terminal theme, so the same `tput setaf 1` looks bright crimson in one theme and muddy maroon in another. Selecting from a curated palette like Open Color guarantees the same hue regardless of theme.

The template still degrades safely. When stdout is not a TTY, when `NO_COLOR` is set in the environment, or when the script is invoked with `--no-color`, every colour variable is the empty string and printf simply emits the message without escapes.

## The Open Color families

Each family carries ten shades numbered 0 through 9. Lower numbers are paler; higher numbers are saturated. The palette is intentionally biased toward UI use, so shades 4 through 7 read clearly on both dark and light terminals.

The full set of families:

- gray
- red
- pink
- grape
- violet
- indigo
- blue
- cyan
- teal
- green
- lime
- yellow
- orange

## Default semantic mapping the template uses

The template ships with six semantic colour roles. The defaults below were picked for legibility on both dark and light backgrounds. The trailing shade name in the comment makes future swaps traceable.

| Role         | Variable     | Open Color | Hex       | RGB              |
| ------------ | ------------ | ---------- | --------- | ---------------- |
| Errors       | `C_ERROR`    | red-7      | `#f03e3e` | `240, 62, 62`    |
| Warnings     | `C_WARN`     | orange-6   | `#fd7e14` | `253, 126, 20`   |
| Success      | `C_SUCCESS`  | green-7    | `#37b24d` | `55, 178, 77`    |
| Information  | `C_INFO`     | blue-7     | `#1971c2` | `25, 113, 194`   |
| Hint / muted | `C_HINT`     | gray-6     | `#868e96` | `134, 142, 150`  |
| Section head | `C_HEADER`   | cyan-7     | `#1098ad` | `16, 152, 173`   |

The escape sequence that actually reaches the terminal looks like this for `C_ERROR`:

```
$'\033[38;2;240;62;62m'
```

The `$'...'` form lets bash interpret the `\033` escape so the literal byte `0x1b` is stored in the variable. The reset sequence is `\033[0m`, stored in `C_RESET`.

## Picking alternative shades

Two situations come up often.

The first is contrast on light backgrounds. Shades 7 and 8 generally read well on white. If the script targets users on light terminals, swap to shade 8: red-8 `#e03131`, orange-8 `#e8590c`, green-8 `#2f9e44`, blue-8 `#1864ab`, gray-8 `#495057`, cyan-8 `#0c8599`.

The second is multi-tone palettes within one script — for example, a deploy script that distinguishes "queued", "running", and "succeeded" with three shades of the same hue. Open Color makes this easy because every family has its own ramp. A queued/running/succeeded ramp might be blue-4, blue-6, blue-8.

## Reference table — every Open Color hex

The full table is small enough to keep alongside the script. RGB values are the literal triplets you splice into the escape sequence.

| Family | Shade | Hex     | RGB             |
| ------ | ----- | ------- | --------------- |
| gray   | 0     | `#f8f9fa` | `248, 249, 250` |
| gray   | 1     | `#f1f3f5` | `241, 243, 245` |
| gray   | 2     | `#e9ecef` | `233, 236, 239` |
| gray   | 3     | `#dee2e6` | `222, 226, 230` |
| gray   | 4     | `#ced4da` | `206, 212, 218` |
| gray   | 5     | `#adb5bd` | `173, 181, 189` |
| gray   | 6     | `#868e96` | `134, 142, 150` |
| gray   | 7     | `#495057` | `73, 80, 87`    |
| gray   | 8     | `#343a40` | `52, 58, 64`    |
| gray   | 9     | `#212529` | `33, 37, 41`    |
| red    | 0     | `#fff5f5` | `255, 245, 245` |
| red    | 1     | `#ffe3e3` | `255, 227, 227` |
| red    | 2     | `#ffc9c9` | `255, 201, 201` |
| red    | 3     | `#ffa8a8` | `255, 168, 168` |
| red    | 4     | `#ff8787` | `255, 135, 135` |
| red    | 5     | `#ff6b6b` | `255, 107, 107` |
| red    | 6     | `#fa5252` | `250, 82, 82`   |
| red    | 7     | `#f03e3e` | `240, 62, 62`   |
| red    | 8     | `#e03131` | `224, 49, 49`   |
| red    | 9     | `#c92a2a` | `201, 42, 42`   |
| pink   | 0     | `#fff0f6` | `255, 240, 246` |
| pink   | 6     | `#e64980` | `230, 73, 128`  |
| pink   | 7     | `#d6336c` | `214, 51, 108`  |
| pink   | 8     | `#c2255c` | `194, 37, 92`   |
| pink   | 9     | `#a61e4d` | `166, 30, 77`   |
| grape  | 6     | `#be4bdb` | `190, 75, 219`  |
| grape  | 7     | `#ae3ec9` | `174, 62, 201`  |
| grape  | 8     | `#9c36b5` | `156, 54, 181`  |
| grape  | 9     | `#862e9c` | `134, 46, 156`  |
| violet | 6     | `#7950f2` | `121, 80, 242`  |
| violet | 7     | `#7048e8` | `112, 72, 232`  |
| violet | 8     | `#6741d9` | `103, 65, 217`  |
| violet | 9     | `#5f3dc4` | `95, 61, 196`   |
| indigo | 6     | `#4c6ef5` | `76, 110, 245`  |
| indigo | 7     | `#4263eb` | `66, 99, 235`   |
| indigo | 8     | `#3b5bdb` | `59, 91, 219`   |
| indigo | 9     | `#364fc7` | `54, 79, 199`   |
| blue   | 4     | `#74c0fc` | `116, 192, 252` |
| blue   | 5     | `#4dabf7` | `77, 171, 247`  |
| blue   | 6     | `#339af0` | `51, 154, 240`  |
| blue   | 7     | `#1971c2` | `25, 113, 194`  |
| blue   | 8     | `#1864ab` | `24, 100, 171`  |
| blue   | 9     | `#0b4f80` | `11, 79, 128`   |
| cyan   | 6     | `#22b8cf` | `34, 184, 207`  |
| cyan   | 7     | `#1098ad` | `16, 152, 173`  |
| cyan   | 8     | `#0c8599` | `12, 133, 153`  |
| cyan   | 9     | `#0b7285` | `11, 114, 133`  |
| teal   | 6     | `#20c997` | `32, 201, 151`  |
| teal   | 7     | `#0ca678` | `12, 166, 120`  |
| teal   | 8     | `#099268` | `9, 146, 104`   |
| teal   | 9     | `#087f5b` | `8, 127, 91`    |
| green  | 6     | `#51cf66` | `81, 207, 102`  |
| green  | 7     | `#37b24d` | `55, 178, 77`   |
| green  | 8     | `#2f9e44` | `47, 158, 68`   |
| green  | 9     | `#2b8a3e` | `43, 138, 62`   |
| lime   | 6     | `#94d82d` | `148, 216, 45`  |
| lime   | 7     | `#74b816` | `116, 184, 22`  |
| lime   | 8     | `#66a80f` | `102, 168, 15`  |
| lime   | 9     | `#5c940d` | `92, 148, 13`   |
| yellow | 6     | `#fcc419` | `252, 196, 25`  |
| yellow | 7     | `#fab005` | `250, 176, 5`   |
| yellow | 8     | `#f59f00` | `245, 159, 0`   |
| yellow | 9     | `#f08c00` | `240, 140, 0`   |
| orange | 6     | `#fd7e14` | `253, 126, 20`  |
| orange | 7     | `#f76707` | `247, 103, 7`   |
| orange | 8     | `#e8590c` | `232, 89, 12`   |
| orange | 9     | `#d9480f` | `217, 72, 15`   |

The omitted lighter shades (0–5 for most families) appear in the source palette and follow the same hue progression. They are too pale for terminal foreground text in most themes, so the table above focuses on the shades useful for scripts.

## Honouring `NO_COLOR`

The `NO_COLOR` environment variable is the convention published at <https://no-color.org/>. The template checks it before checking its own `--no-color` flag, so a system policy that exports `NO_COLOR=1` always wins. The `--no-color` flag is a per-invocation override.
