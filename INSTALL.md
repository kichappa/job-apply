# Install (instructions for the agent)

1. Clone into the user's skills folder:
   - Windows: `git clone https://github.com/kichappa/job-apply "$env:USERPROFILE\.claude\skills\job-apply"`
   - macOS/Linux: `git clone https://github.com/kichappa/job-apply ~/.claude/skills/job-apply`
2. Check the prerequisites: `node --version` (18+), `pwsh --version` (7+), `python --version` (3.9+), `git`.
   Tell the user about anything missing. On Windows: `winget install Microsoft.PowerShell OpenJS.NodeJS.LTS Python.Python.3.12`.
3. Install the helpers: `npm install -g @playwright/cli@latest` and `python -m pip install --user pypdf openpyxl`.
4. Tell the user to restart Claude Code, then run `/job-apply init` and `/job-apply config`.

Do not create `~/.job-apply/config.json` with guessed values: `/job-apply config` builds it from the user's resume
and their answers.
