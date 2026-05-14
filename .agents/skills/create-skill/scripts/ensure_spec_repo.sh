#!/usr/bin/env bash
#
# ensure_spec_repo.sh — Clone or update the Agent Skills Specification repo.
#
# Ensures ~/.agent-skills-spec contains a fresh copy of
# https://github.com/anthropics/skills.git
#
# Exit codes:
#   0 — repo is up-to-date
#   1 — operation failed

set -euo pipefail

readonly SPEC_DIR="${HOME}/.agent-skills-spec"
readonly REPO_URL="https://github.com/anthropics/skills.git"

main() {
  if [[ ! -d "${SPEC_DIR}" ]]; then
    echo "Cloning ${REPO_URL} → ${SPEC_DIR}"
    if ! git clone "${REPO_URL}" "${SPEC_DIR}"; then
      echo "ERROR: Failed to clone ${REPO_URL}" >&2
      return 1
    fi
    echo "Clone complete."
  else
    echo "Updating existing repo at ${SPEC_DIR}"
    if ! git -C "${SPEC_DIR}" pull --ff-only; then
      echo "ERROR: Failed to pull (fast-forward only). Manual intervention may be needed." >&2
      return 1
    fi
    echo "Update complete."
  fi
}

main "$@"
