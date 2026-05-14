#!/usr/bin/env bash
#
# {{SCRIPT_PURPOSE}}
#
# Author: {{AUTHOR}}
# Created: {{DATE}}

# ---------------------------------------------------------------------------
# Section markers
# ---------------------------------------------------------------------------
# Lines flanked by `# >>> OPTIONAL: <name> <<<` and `# <<< OPTIONAL: <name> >>>`
# are removable units. The scaffolder deletes the whole block (markers
# included) when the user does not request that feature. Anything outside an
# OPTIONAL block is part of the always-on core.
# ---------------------------------------------------------------------------

# Enable bash xtrace when DEBUG is set to 1, yes, or true.
if [[ ${DEBUG-} =~ ^(1|yes|true)$ ]]; then
  set -o xtrace
fi

# Strict mode is enabled only when the script is executed directly, never when
# it is sourced. Sourced strict mode would mutate the caller's shell options.
# Detection idiom: https://stackoverflow.com/a/28776166
if ! (return 0 2>/dev/null); then
  set -o errexit   # Exit immediately on most errors. See `man bash` for caveats.
  set -o nounset   # Treat reads of unset variables as errors.
  set -o pipefail  # A pipeline's exit code is the last non-zero exit, not the final command's.
fi

# Inherit the ERR trap into shell functions, command substitutions, and
# subshells. Without this, errtrace handlers fire only at the top level.
set -o errtrace

# ===========================================================================
# Trap handlers
# ===========================================================================

#######################################
# Handles unexpected errors. Disables further error trapping to prevent
# recursion, prints diagnostic information when running under cron, and exits
# with the supplied code.
# Globals:
#   cron, script_output, script_path, script_params, C_RESET
# Arguments:
#   $1 (optional): Numeric exit code; defaults to 1.
#######################################
function script_trap_err() {
  local exit_code=1

  trap - ERR
  set +o errexit
  set +o pipefail

  if [[ ${1-} =~ ^[0-9]+$ ]]; then
    exit_code="$1"
  fi

  # >>> OPTIONAL: cron-mode <<<
  # When running under cron, output was redirected to a log file. Restore the
  # original descriptors and dump diagnostic information so the cron daemon
  # captures something useful in the failure email.
  if [[ -n ${cron-} ]]; then
    if [[ -n ${script_output-} ]]; then
      exec 1>&3 2>&4
    fi

    printf '%b\n' "${C_RESET-}"
    printf '***** Abnormal termination of script *****\n'
    printf 'Script Path:        %s\n' "${script_path}"
    printf 'Script Parameters:  %s\n' "${script_params}"
    printf 'Script Exit Code:   %s\n' "${exit_code}"
    if [[ -n ${script_output-} ]]; then
      # shellcheck disable=SC2312
      printf 'Script Output:\n\n%s' "$(cat "${script_output}")"
    else
      printf 'Script Output:      None (failed before log init)\n'
    fi
  fi
  # <<< OPTIONAL: cron-mode >>>

  exit "${exit_code}"
}

#######################################
# Handles normal exit. Restores the original working directory, removes any
# transient files created during the run, and resets the terminal so colour
# state never leaks back to the caller's shell.
# Globals:
#   orig_cwd, cron, script_output, script_lock, C_RESET
#######################################
function script_trap_exit() {
  cd "${orig_cwd}"

  # >>> OPTIONAL: cron-mode <<<
  if [[ -n ${cron-} && -f ${script_output-} ]]; then
    rm "${script_output}"
  fi
  # <<< OPTIONAL: cron-mode >>>

  # >>> OPTIONAL: lock <<<
  if [[ -d ${script_lock-} ]]; then
    rmdir "${script_lock}"
  fi
  # <<< OPTIONAL: lock >>>

  printf '%b' "${C_RESET-}"
}

# ===========================================================================
# Exit and logging primitives
# ===========================================================================

#######################################
# Exits the script with a message. A second argument switches the exit into
# the error trap so cleanup behaves the same as for an unexpected failure.
# Convention used here for exit codes:
#   0  Normal exit
#   1  Abnormal exit due to external error
#   2  Abnormal exit due to script error
# Arguments:
#   $1 (required): Message to print.
#   $2 (optional): Numeric exit code; defaults to 0.
#######################################
function script_exit() {
  if [[ $# -eq 1 ]]; then
    printf '%s\n' "$1"
    exit 0
  fi

  if [[ ${2-} =~ ^[0-9]+$ ]]; then
    printf '%b\n' "$1"
    if [[ $2 -ne 0 ]]; then
      script_trap_err "$2"
    else
      exit 0
    fi
  fi

  script_exit 'Missing required argument to script_exit()!' 2
}

#######################################
# Initialises commonly used path variables. Call this once from main() before
# anything else uses ${script_dir} or ${script_name}.
# Globals (set):
#   orig_cwd, script_path, script_dir, script_name, script_params
# Arguments:
#   $@ (optional): Original arguments, captured for diagnostics.
# Note:
#   ${script_path} is the literal invocation path. It does not resolve
#   symlinks; reach for `realpath` if you need the resolved location.
#######################################
# shellcheck disable=SC2034
function script_init() {
  readonly orig_cwd="${PWD}"
  readonly script_params="$*"
  readonly script_path="${BASH_SOURCE[0]}"
  script_dir="$(dirname "${script_path}")"
  script_name="$(basename "${script_path}")"
  readonly script_dir script_name
}

# >>> OPTIONAL: colors <<<
#######################################
# Initialises colour variables using the Open Color palette
# (https://yeun.github.io/open-color/) emitted as 24-bit ANSI escape
# sequences. Honours --no-color, the standard NO_COLOR environment variable,
# and a non-TTY stdout. Falls back to empty strings whenever colour cannot be
# safely emitted.
# Globals (set):
#   C_RESET, C_BOLD, C_DIM, C_UNDERLINE,
#   C_ERROR, C_WARN, C_SUCCESS, C_INFO, C_HINT, C_HEADER
# Note:
#   24-bit colour is widely supported by modern terminals (iTerm2, kitty,
#   alacritty, Windows Terminal, recent gnome-terminal). When unsupported the
#   sequences degrade visually but do not break the layout.
#######################################
# shellcheck disable=SC2034
function color_init() {
  local enable_color=true

  if [[ -n ${no_color-} || -n ${NO_COLOR-} ]]; then
    enable_color=false
  elif [[ ! -t 1 ]]; then
    enable_color=false
  fi

  if [[ "${enable_color}" == true ]]; then
    # Text attributes from the standard SGR set.
    readonly C_RESET=$'\033[0m'
    readonly C_BOLD=$'\033[1m'
    readonly C_DIM=$'\033[2m'
    readonly C_UNDERLINE=$'\033[4m'

    # Open Color palette, picked for legibility on both dark and light
    # terminals. The shade name in the trailing comment matches the official
    # palette so swaps stay traceable.
    readonly C_ERROR=$'\033[38;2;240;62;62m'    # red-7    #f03e3e
    readonly C_WARN=$'\033[38;2;253;126;20m'    # orange-6 #fd7e14
    readonly C_SUCCESS=$'\033[38;2;55;178;77m'  # green-7  #37b24d
    readonly C_INFO=$'\033[38;2;25;113;194m'    # blue-7   #1971c2
    readonly C_HINT=$'\033[38;2;134;142;150m'   # gray-6   #868e96
    readonly C_HEADER=$'\033[38;2;16;152;173m'  # cyan-7   #1098ad
  else
    readonly C_RESET=''
    readonly C_BOLD=''
    readonly C_DIM=''
    readonly C_UNDERLINE=''
    readonly C_ERROR=''
    readonly C_WARN=''
    readonly C_SUCCESS=''
    readonly C_INFO=''
    readonly C_HINT=''
    readonly C_HEADER=''
  fi
}
# <<< OPTIONAL: colors >>>

#######################################
# Prints a message to stderr with a timestamp prefix. Use for any output that
# is not the script's primary product, so callers can pipe stdout cleanly.
# Arguments:
#   $1 (required): Severity tag, e.g. INFO, WARN, ERROR.
#   $2 (required): Message body.
#   $3 (optional): Colour escape sequence to wrap the severity tag.
#######################################
function log() {
  local severity="$1"
  local message="$2"
  local color="${3-}"
  local timestamp
  timestamp="$(date +'%Y-%m-%dT%H:%M:%S%z')"
  printf '[%s] %b%s%b %s\n' \
    "${timestamp}" "${color}" "${severity}" "${C_RESET-}" "${message}" >&2
}

# >>> OPTIONAL: verbose <<<
#######################################
# Logs an INFO line only when verbose mode is enabled. Verbose mode is opt-in
# via the --verbose flag.
# Globals: verbose, C_INFO
# Arguments: $1 message body.
#######################################
function verbose_log() {
  if [[ -n ${verbose-} ]]; then
    log 'INFO' "$1" "${C_INFO-}"
  fi
}
# <<< OPTIONAL: verbose >>>

# >>> OPTIONAL: cron-mode <<<
#######################################
# Initialises cron mode. Redirects stdout and stderr into a temp file so
# nothing reaches the cron daemon unless the script fails, in which case
# script_trap_err() restores descriptors and dumps the captured output.
# Globals (set): script_output
#######################################
function cron_init() {
  if [[ -n ${cron-} ]]; then
    script_output="$(mktemp -t "${script_name}.XXXXXX")"
    readonly script_output
    exec 3>&1 4>&2 1>"${script_output}" 2>&1
  fi
}
# <<< OPTIONAL: cron-mode >>>

# >>> OPTIONAL: lock <<<
#######################################
# Acquires a directory-based lock so only one instance runs at a time. Uses
# `mkdir`, which is atomic on every POSIX filesystem. The lock is released by
# script_trap_exit() on any exit path.
# Globals (set): script_lock
# Arguments:
#   $1 (required): Scope of the lock. 'system' for one instance per host;
#                  'user' for one instance per UID.
#######################################
function lock_init() {
  local lock_dir
  case "$1" in
    system) lock_dir="/tmp/${script_name}.lock" ;;
    user)   lock_dir="/tmp/${script_name}.${UID}.lock" ;;
    *)      script_exit 'Missing or invalid argument to lock_init()!' 2 ;;
  esac

  if mkdir "${lock_dir}" 2>/dev/null; then
    readonly script_lock="${lock_dir}"
    verbose_log "Acquired script lock: ${script_lock}"
  else
    script_exit "Unable to acquire script lock: ${lock_dir}" 1
  fi
}
# <<< OPTIONAL: lock >>>

# >>> OPTIONAL: check-binary <<<
#######################################
# Verifies a binary is on PATH. Treats absence as fatal when a second argument
# is supplied; otherwise returns non-zero so the caller can recover.
# Arguments:
#   $1 (required): Binary name.
#   $2 (optional): Any value to make a missing binary fatal.
# Returns: 0 if found, 1 otherwise (when not fatal).
#######################################
function check_binary() {
  if [[ $# -lt 1 ]]; then
    script_exit 'Missing required argument to check_binary()!' 2
  fi

  if ! command -v "$1" >/dev/null 2>&1; then
    if [[ -n ${2-} ]]; then
      script_exit "Missing dependency: couldn't locate $1." 1
    fi
    verbose_log "Missing dependency: $1"
    return 1
  fi

  verbose_log "Found dependency: $1"
  return 0
}
# <<< OPTIONAL: check-binary >>>

# >>> OPTIONAL: superuser <<<
#######################################
# Verifies the caller has root privileges, optionally trying sudo to acquire
# them. Caches sudo credentials so subsequent run_as_root calls don't prompt.
# Arguments:
#   $1 (optional): Any value to skip the sudo escalation attempt.
# Returns: 0 when root credentials are available, 1 otherwise.
#######################################
function check_superuser() {
  local superuser
  if [[ ${EUID} -eq 0 ]]; then
    superuser=true
  elif [[ -z ${1-} ]]; then
    if check_binary sudo; then
      verbose_log 'Sudo: updating cached credentials...'
      if ! sudo -v; then
        verbose_log "Sudo: couldn't acquire credentials."
      else
        local test_euid
        test_euid="$(sudo -H -- "${BASH}" -c 'printf "%s" "${EUID}"')"
        if [[ "${test_euid}" -eq 0 ]]; then
          superuser=true
        fi
      fi
    fi
  fi

  if [[ -z ${superuser-} ]]; then
    verbose_log 'Unable to acquire superuser credentials.'
    return 1
  fi

  verbose_log 'Successfully acquired superuser credentials.'
  return 0
}

#######################################
# Runs a command as root, escalating via sudo when necessary. Pass `0` as the
# first argument to refuse sudo and require existing root.
# Arguments:
#   $1 (optional): Literal `0` to skip sudo.
#   $@ (required): Command and its arguments.
#######################################
function run_as_root() {
  if [[ $# -eq 0 ]]; then
    script_exit 'Missing required argument to run_as_root()!' 2
  fi

  local skip_sudo
  if [[ ${1-} =~ ^0$ ]]; then
    skip_sudo=true
    shift
  fi

  if [[ ${EUID} -eq 0 ]]; then
    "$@"
  elif [[ -z ${skip_sudo-} ]]; then
    sudo -H -- "$@"
  else
    script_exit "Unable to run requested command as root: $*" 1
  fi
}
# <<< OPTIONAL: superuser >>>

# >>> OPTIONAL: dry-run <<<
#######################################
# Runs a command unless --dry-run is set, in which case the command is logged
# but not executed. Use for any side-effecting operation users may want to
# preview.
# Globals: dry_run
# Arguments: $@ command and its arguments.
#######################################
function maybe_run() {
  if [[ -n ${dry_run-} ]]; then
    log 'DRY-RUN' "$*" "${C_HINT-}"
    return 0
  fi
  "$@"
}
# <<< OPTIONAL: dry-run >>>

# ===========================================================================
# CLI surface
# ===========================================================================

#######################################
# Prints usage help.
#######################################
function script_usage() {
  cat <<EOF
Usage: ${script_name-script} [options]

Options:
  -h, --help          Show this help and exit.
# >>> OPTIONAL: verbose <<<
  -v, --verbose       Enable verbose logging.
# <<< OPTIONAL: verbose >>>
# >>> OPTIONAL: colors <<<
      --no-color      Disable colored output.
# <<< OPTIONAL: colors >>>
# >>> OPTIONAL: cron-mode <<<
      --cron          Run silently; emit captured output only on failure.
# <<< OPTIONAL: cron-mode >>>
# >>> OPTIONAL: dry-run <<<
      --dry-run       Print actions without executing them.
# <<< OPTIONAL: dry-run >>>
EOF
}

#######################################
# Parses command-line parameters into globals consumed by main(). Add new
# flags here, mirror the entry in script_usage(), and document the global it
# sets in the function comment.
# Globals (set): verbose, no_color, cron, dry_run
#######################################
function parse_params() {
  local param
  while [[ $# -gt 0 ]]; do
    param="$1"
    shift
    case "${param}" in
      -h | --help)
        script_usage
        exit 0
        ;;
      # >>> OPTIONAL: verbose <<<
      -v | --verbose)
        verbose=true
        ;;
      # <<< OPTIONAL: verbose >>>
      # >>> OPTIONAL: colors <<<
      --no-color | --no-colour)
        no_color=true
        ;;
      # <<< OPTIONAL: colors >>>
      # >>> OPTIONAL: cron-mode <<<
      --cron)
        cron=true
        ;;
      # <<< OPTIONAL: cron-mode >>>
      # >>> OPTIONAL: dry-run <<<
      --dry-run)
        dry_run=true
        ;;
      # <<< OPTIONAL: dry-run >>>
      *)
        script_exit "Invalid parameter: ${param}" 1
        ;;
    esac
  done
}

# ===========================================================================
# Main
# ===========================================================================

#######################################
# Entry point. Wires up traps, parses args, and runs the script's actual
# work. Replace the body of the work block with the behaviour you actually
# want; everything above this point is scaffolding.
#######################################
function main() {
  trap script_trap_err ERR
  trap script_trap_exit EXIT

  script_init "$@"
  parse_params "$@"
  # >>> OPTIONAL: cron-mode <<<
  cron_init
  # <<< OPTIONAL: cron-mode >>>
  # >>> OPTIONAL: colors <<<
  color_init
  # <<< OPTIONAL: colors >>>
  # >>> OPTIONAL: lock <<<
  lock_init user
  # <<< OPTIONAL: lock >>>
  # >>> OPTIONAL: superuser <<<
  check_superuser
  # <<< OPTIONAL: superuser >>>

  # ----- replace the lines below with the real work -----
  log 'INFO' "${script_name} starting" "${C_INFO-}"
  log 'INFO' "${script_name} done" "${C_SUCCESS-}"
}

# Invoke main only when executed directly, never when sourced. This lets the
# script double as a library if any of its functions are useful elsewhere.
if ! (return 0 2>/dev/null); then
  main "$@"
fi

# vim: ft=bash ts=2 sw=2 sts=2 et
