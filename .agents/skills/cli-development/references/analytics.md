# Analytics

> Canonical: <https://clig.dev/#analytics> — fetch the live source via
> the tavily-extract skill or `WebFetch` against
> `https://clig.dev/llms.txt` before binding recommendations to quoted
> text. This file is a snapshot.

Usage metrics can be helpful to understand how users are using your
program, how to make it better, and where to focus effort. But, unlike
websites, users of the command-line expect to be in control of their
environment, and it is surprising when programs do things in the
background without telling them.

**Do not phone home usage or crash data without consent.** Users will
find out, and they will be angry. Be very explicit about what you
collect, why you collect it, how anonymous it is and how you go about
anonymizing it, and how long you retain it for.

Ideally, ask users whether they want to contribute data ("opt-in").
If you choose to do it by default ("opt-out"), then clearly tell users
about it on your website or first run, and make it easy to disable.

Examples of projects that collect usage statistics:

- Angular.js [collects detailed analytics using Google
  Analytics](https://angular.io/analytics), in the name of feature
  prioritization. You have to explicitly opt in. You can change the
  tracking ID to point to your own Google Analytics property if you
  want to track Angular usage inside your organization.
- Homebrew sends metrics to Google Analytics and has [a nice
  FAQ](https://docs.brew.sh/Analytics) detailing their practices.
- Next.js [collects anonymized usage
  statistics](https://nextjs.org/telemetry) and is enabled by default.

**Consider alternatives to collecting analytics.**

- Instrument your web docs. If you want to know how people are using
  your CLI tool, make a set of docs around the use cases you'd like to
  understand best, and see how they perform over time. Look at what
  people search for within your docs.
- Instrument your downloads. This can be a rough metric to understand
  usage and what operating systems your users are running.
- Talk to your users. Reach out and ask people how they're using your
  tool. Encourage feedback and feature requests in your docs and
  repos, and try to draw out more context from those who submit
  feedback.

_Further reading: [Open Source
Metrics](https://opensource.guide/metrics/)._

## Further reading from clig.dev

The clig.dev guide ends with a [Further
reading](https://clig.dev/#further-reading) section pointing at:

- [The Unix Programming
  Environment](https://en.wikipedia.org/wiki/The_Unix_Programming_Environment),
  Brian W. Kernighan and Rob Pike
- [POSIX Utility
  Conventions](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html)
- [Program Behavior for All
  Programs](https://www.gnu.org/prep/standards/html_node/Program-Behavior.html),
  GNU Coding Standards
- [12 Factor CLI
  Apps](https://medium.com/@jdxcode/12-factor-cli-apps-dd3c227a0e46),
  Jeff Dickey
- [CLI Style Guide](https://devcenter.heroku.com/articles/cli-style-guide), Heroku
