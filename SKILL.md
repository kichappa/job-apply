---
name: job-apply
description: Find jobs on a job hub (LinkedIn, Simplify, Handshake, company Greenhouse/Lever/Ashby/Workday boards) and apply to them end to end in the user's own Edge or Chrome, using the Simplify Copilot extension plus Playwright over CDP. Subcommands - init (set up browser remote debugging and attach), config (resume folder, profile, standing answers), discover <hub> (search and rank jobs against the resume), apply [express] <jobs> (fill and submit applications; express = user pre-authorizes consents and submit), update-simplify (sync the Simplify profile to the newest resume). Use whenever the user asks to find, rank, or apply to jobs or internships, fill an application form, create an ATS account, or update Simplify.
allowed-tools: Bash(playwright-cli:*) Bash(pwsh:*) Bash(python:*) Bash(git:*)
---

# job-apply

`$SKILL` below means this skill's folder (the folder holding this file). `$CFG` means
`%USERPROFILE%\.job-apply\` (Windows) or `~/.job-apply/` (macOS/Linux). Everything personal (resume path,
answers, tracker, credentials) lives in `$CFG`, never in `$SKILL`, so the skill can be shared publicly.

## 0. Every time this skill loads

1. Run `pwsh -NoProfile -File "$SKILL/scripts/update-check.ps1"`.
   - `UP-TO-DATE` or `SKIPPED`: carry on.
   - `UPDATE-AVAILABLE`: tell the user in one line, run it again with `-Apply` (fast-forward only), then
     re-read this file before continuing. If it prints `DIRTY` or `DIVERGED`, don't pull; tell the user.
2. Read `$CFG/config.json`. If it is missing, run **config** first (unless the subcommand is `init`).
3. Run `python "$SKILL/scripts/py/tracker.py" summary` (and `list` when you need ids) to see what was already
   discovered, applied to, or parked.

## Subcommands

The text after `/job-apply` picks the mode. No argument: show the tracker summary and ask which mode.

| Command | Does |
|---|---|
| `init [edge\|chrome] [outlook\|gmail]` | Sets up remote debugging in the user's real browser and attaches Playwright to it. Section 1 |
| `config` | Creates or edits `$CFG/config.json`: resume folder, profile, standing answers, rules. Section 2 |
| `discover <hub> [query]` | Finds jobs on a hub, ranks them against the newest resume, and records them in the tracker. Section 3 |
| `apply [express] <jobs>` | Fills and submits applications. `<jobs>` = URLs, tracker ids, or "the top N". Section 4 |
| `update-simplify` | Brings the Simplify profile up to date with the newest resume. Section 5 |

---

## 1. init

Run `pwsh -NoProfile -File "$SKILL/scripts/init.ps1" -Browser <edge|chrome> -Mail <outlook|gmail>` and follow what
it prints. If the user didn't say which mail receives their verification codes, ask (Outlook or Gmail).

1. It checks for Node, `playwright-cli` (`npm i -g @playwright/cli`), PowerShell 7 and Python, and installs
   `playwright-cli` if it is missing.
2. If the browser's `DevToolsActivePort` file is missing or stale, the user must open
   `edge://inspect/#remote-debugging` (or `chrome://inspect/#remote-debugging`) and switch on
   **"Allow remote debugging for this browser instance"**. The script opens that page for them.
3. With `-Relaunch` it restarts the browser with flags that keep covered and off-screen windows rendering
   (`--disable-features=CalculateNativeWinOcclusion --disable-backgrounding-occluded-windows
   --disable-renderer-backgrounding --disable-background-timer-throttling --restore-last-session`).
   Ask before using `-Relaunch`: it closes every browser window (tabs come back).
4. It attaches with `playwright-cli -s=<session> attach --cdp=ws://localhost:<port><path>`. The browser shows
   an **Allow** prompt: tell the user to click it. Every re-attach needs another Allow.
5. Ask the user to install the Simplify Copilot extension and sign in to Simplify, their mail (for
   verification codes; `-Mail` opens it) and any job hub they will use. For Gmail, ask which signed-in account
   slot holds it (`/u/0/`, `/u/1/`, ...).

If a later command says `The browser '<session>' is not open`, the browser restarted: run
`init.ps1 -AttachOnly`.

## 2. config

Goal: a filled `$CFG/config.json` (shape in `$SKILL/config.example.json`).

1. Ask for the resume folder (or accept a path the user gave). The newest PDF in it is "the resume";
   `pwsh "$SKILL/scripts/resume.ps1"` prints its path and extracts its text to `$CFG/resume.txt`.
2. Prefill the profile from the resume text (name, school, degree, graduation date, links). Ask the user
   only for what a resume can't tell you, in one AskUserQuestion batch: work authorization, sponsorship,
   EEO preferences, how-did-you-hear answer, the account email for new ATS accounts, the mail web URL
   (Outlook `https://outlook.cloud.microsoft/mail/` or Gmail `https://mail.google.com/mail/u/<N>/`),
   companies to skip or cap, jobs to fill but never submit.
3. Show the finished config as a short table and save it. Re-running `config` edits fields in place.

## 3. discover <hub>

| Hub | How |
|---|---|
| `linkedin` | `python "$SKILL/scripts/py/linkedin.py" search` using the public guest endpoints (no login). Then `jd <ids>` for descriptions and `applyurl <ids>` to resolve the employer's own apply link |
| `greenhouse:<board>`, `lever:<co>`, `ashby:<org>` | `python "$SKILL/scripts/py/boards.py" <ats> <name> [--q regex]` (public JSON APIs) |
| `simplify`, `handshake`, `workday:<url>`, any URL | Open it in a work window (4.1) and read listings with `cdp/dump-text.js`; page through results |

Then:

1. Drop jobs already in the tracker, companies in `config.rules.skip_companies`, and companies at their cap.
2. Read each surviving description (`jd`) and judge fit against `$CFG/resume.txt`: how well the
   requirements match, seniority, degree level and season, plus visa or export-control red flags
   ("US person", "citizenship", "clearance"). Rate fit and callback chance as high/med/low, with one
   line of reasoning each.
3. Show the top results in groups of no more than 5: title, company, the reason, and a clean URL
   (`python "$SKILL/scripts/py/cleanurl.py" <url>` strips `source=`, `utm_*`, `trk`, `refId`,
   `trackingId` and LinkedIn redirect wrappers). If the user asked for a spread across areas, balance it.
4. Log each shown job (see **Logging**) with `status: "discovered"`, `fit`, and `callback_stars`.

## 4. apply [express] <jobs>

### 4.1 Window discipline (never skip)

- Never use `tab-new` or `goto` in the user's own tab. Open every job in its own new window, moved off
  screen: `pwsh "$SKILL/scripts/run.ps1" cdp/newwin.js -Vars @{URL='<clean url>'}` prints its page
  index. Then `playwright-cli -s=<session> tab-select <index>`.
- Do not minimize work windows: minimized windows stop rendering, and Simplify and dropdowns hang.
  Off-screen windows work.
- To hand a window to the user: `run.ps1 cdp/show.js`. To put it back: `cdp/hide.js`.
- `cdp/targets.js` lists every open page across all windows.

### 4.2 Per job

1. Clean the URL (3.3). Open it in a work window.
2. Check the tracker and the company caps. Never apply twice to the same requisition.
3. If the site needs an account, create one with `config.account_email`. Generate and store the
   password with `run.ps1 <template>.tmpl.js -PwSite <site>` (`__PW__` is replaced from an encrypted
   store; Windows DPAPI at `$CFG/creds/<site>.dpapi`). Never print, log, or echo a password. Read
   verification codes from the user's mail with `cdp/mail-open.js` then
   `cdp/mail-code.js -Vars @{SENDER='<regex>'; CODE='<regex with one group>'}`. Both work with Outlook and Gmail
   (picked from `config.mail_url`); on Gmail they search every tab and Spam, and SENDER also matches the address.
4. Click Simplify's **Autofill This Page** with `cdp/simplify.js`. Run it **once per page**: a second
   run after manual fixes reverts them.
5. Dump the form (`cdp/dump-form.js`, or `cdp/wd-dump.js` on Workday) and fix it against config.
   Simplify often gets these wrong:
   - **Sponsorship**: Simplify answers "No". Answer from `config.answers` exactly as the question is
     worded. A question about the future, or about sponsorship in general, takes the sponsorship answer.
   - **Source** ("how did you hear"): Simplify picks LinkedIn. Use `config.answers.source`. Never
     LinkedIn unless LinkedIn Easy Apply was the only route.
   - **Degree**: match "Doctor of Philosophy" or "PhD" exactly. Regexes like `/Doctor/` catch "Doctor of
     Medicine".
   - **Resume**: Simplify may attach an old PDF. Replace it with the newest PDF. Never put the CV in a
     cover-letter slot.
   - Veteran and disability: pick the plain "not a veteran" / "decline" option the user configured.
6. Site-specific mechanics are in `reference/ats.md` (Greenhouse, Ashby, Lever, Workday, iCIMS, ADP,
   Phenom, Avature, Oracle, SmartRecruiters, ByteDance/TikTok, LinkedIn Easy Apply).
7. Free-text questions: answer truthfully from the resume and config. Never invent experience, dates,
   referrals, or citizenship. If a fact isn't known, ask (standard) or leave a clearly marked gap and
   report it (express).
8. Go through to the final page. Then follow **4.3 standard** or **4.4 express**.
9. Log the outcome right away, not at the end of the batch (see **Logging**): `submitted`, `parked` (with
   the exact blocker and where the window is), or `skipped` (with the reason). Jobs in
   `config.rules.never_submit` stop at Review and are `parked` with blocker "never_submit".

### 4.3 Standard mode

- Leave every consent, privacy, arbitration, attestation, and e-signature box for the user. Never
  use Simplify or any other indirect route to tick a box you didn't tick yourself.
- Batch the jobs: fill all of them, then give the user one table of the remaining clicks per window,
  and ask before each final Submit unless the user already said "submit".
- Obstacles (captcha, login wall, broken page): park the job and move on. After the queue, retry the
  parked jobs once yourself; hand back only what truly needs the user.

### 4.4 Express mode (`apply express ...`)

Typing `express` is the user's explicit, standing authorization for this run to:

- tick consent, privacy-notice, terms, and "information is true and complete" attestation boxes on
  their behalf;
- type their legal name (from config) and today's date into e-signature and self-identification
  name/date fields;
- click the final Submit without asking first.

Express does **not** change:

- **Truthfulness.** Answers come from the resume and config, never invented.
- **Captchas.** They go to the user.
- **`never_submit`.** Those jobs still stop at Review.
- **Arbitration agreements.** Tick these only if `config.express.arbitration` is `true`. Otherwise park
  the job.
- **Blocked actions.** If the harness or a permission check blocks an action, that block stands. Do
  not retry it through Simplify, a different selector, keyboard tricks, or JS clicks. Park the job, say
  which box it was, and continue with the next job.

At the end, list what express ticked and signed, per job, so the user has a record.

### 4.5 Report

After a batch, report in this order:

1. Submitted. Name each job, and give the running total from the tracker.
2. Parked. A table with job / the user's exact next click / where the window is.
3. Answers worth double-checking: judgment calls such as government employee, NDA, or salary.
4. One next action.

## Logging (automatic, every job)

`python "$SKILL/scripts/py/tracker.py" add '<json>'` upserts one row. The JSONL in `config.log_dir`
(default `$CFG`) is the source of truth. Every write also rewrites `applications.csv` and a colored,
filterable `applications.xlsx` next to it. Fields:

| field | value |
|---|---|
| `company`, `title`, `req_id`, `location`, `pay`, `ats`, `url` | from the posting (clean URL) |
| `status` | discovered / parked / submitted / skipped / rejected / interview / offer |
| `resume_file` | absolute path of the PDF actually uploaded. `resume_version` (folder, name, mtime, sha1) is filled automatically |
| `fit` | high / med / low against the resume |
| `callback_stars` | 1-5: your honest estimate of an interview callback. Rendered as ★★★☆☆ in `callback` |
| `source_answer`, `account`, `express` | what "how did you hear" was set to, the account email or site, and the boxes express ticked |
| `blocker`, `notes` | what the user must do, and judgment calls worth checking |

`tracker.py set <id> status=rejected` when the user reports an outcome. If the xlsx is open in Excel,
the CSV and JSONL still update; tell the user to close Excel to refresh the xlsx.

## 5. update-simplify

1. Run `pwsh "$SKILL/scripts/resume.ps1"`. It prints the newest resume and its text.
2. Open `https://simplify.jobs/profile` in a work window and dump it with `cdp/dump-text.js`. You need
   education (with graduation date), experience, projects, skills and links.
3. Compare the dump to the resume and list the differences: missing or extra roles, wrong dates, an old
   graduation date, missing skills, outdated bullet text.
4. Standard mode: show the diff and ask. Express: apply it directly. Edit each field in Simplify's
   profile editor (open the entry's edit dialog, fill, save, then re-dump to verify).
5. Upload the newest PDF in Simplify's resume manager and make it the **default** resume. Decline any
   "parse resume to update profile" prompt: you already edited the profile by hand, and parsing
   overwrites it.
6. Report the fields changed and the default resume now set.

## Gotchas learned the hard way

- An Edge restart drops every work window and the Playwright attach. Workday and ADP keep drafts:
  sign back in and "Continue Application". Voluntary Disclosure answers (EEO) are **not** saved in
  Workday drafts. Refill them.
- Workday tenants live on separate clusters (wd1, wd5, wd504...). One can be in maintenance while
  others work, especially on weekend nights. Retry later.
- ByteDance/TikTok "parse resume" wipes the profile. Never accept it.
- Some portals (ADP, IBM) need email one-time codes. Mail renders reliably only in its own off-screen
  window (`cdp/mail-open.js`), not in a background tab.
- Startups that build hardware may screen out non-US persons through export-control questions. Flag
  these to the user before applying.
