<p align="center">
  <strong>job-apply</strong>
</p>
<p align="center">
  <strong>Find jobs. Apply to them. In your own browser, while you do something else.</strong>
</p>
<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Claude%20Code-skill-d97757?style=flat" alt="Claude Code skill">
  <img src="https://img.shields.io/badge/browser-Edge%20%7C%20Chrome-0a7cff?style=flat" alt="Edge or Chrome">
</p>

## Install

Copy and paste this into Claude Code:

```text
Install the job-apply skill from https://github.com/kichappa/job-apply, following the repo's INSTALL.md.
```

Then run:

```text
/job-apply init
```

## What it does

A Claude Code skill that drives **your real Edge or Chrome**, so your logins, saved passwords and the
[Simplify Copilot](https://simplify.jobs) extension all just work. It finds jobs, ranks them against your
resume, fills the applications, and logs every one to a spreadsheet.

It works in its own off-screen windows, so your tabs stay yours.

## What changes

<table>
<tr>
<td width="50%">

## Before

> Open LinkedIn. Scroll. Open 14 tabs. Click Apply. Make a Workday account. Wait for the code email. Run
> Simplify. Notice it said you don't need sponsorship. Fix it. Notice it said you heard about the job on
> LinkedIn. Fix it. Upload the right resume. Answer the same EEO questions again. Lose the tab. Forget
> which ones you applied to.

</td>
<td width="50%">

## After

> `/job-apply discover linkedin`
>
> `/job-apply apply the top 5`
>
> **4 submitted, 1 needs you:** Zoox: solve the captcha, then Submit.
>
> Logged to `applications.xlsx` ★★★★☆

</td>
</tr>
</table>

## Commands

5 commands. The full procedure is in [SKILL.md](./SKILL.md).

1. **`/job-apply init [edge|chrome]`**: turns on remote debugging in your browser and connects to it. You click
   **Allow** once.
2. **`/job-apply config`**: points the skill at your resume folder (the newest PDF wins) and saves your standing
   answers: work authorization, EEO, how-you-heard, companies to skip or cap.
3. **`/job-apply discover <hub>`**: searches `linkedin`, `simplify`, `handshake`, or `greenhouse:<co>` /
   `lever:<co>` / `ashby:<co>` / `workday:<url>`, and ranks each job by fit and callback chance against your resume.
4. **`/job-apply apply [express] <jobs>`**: fills each application end to end. It creates accounts, reads
   verification codes from your mail, and fixes what Simplify gets wrong.
   - **Standard:** leaves consent, attestation and e-signature boxes for you, then hands you one checklist.
   - **Express:** you pre-authorize those boxes and the final Submit for this run. Captchas still come to you,
     answers stay truthful, and anything your harness blocks gets parked, never worked around.
5. **`/job-apply update-simplify`**: syncs your Simplify profile to your newest resume and sets it as the default.

## What you get

1. **A log you can sort.** `applications.xlsx` and `.csv`, rewritten on every change. Each row has the date,
   company, role, status, resume file and version hash, fit, callback ★ rating, and blockers.
2. **Clean sources.** Tracking parameters are stripped from every link. "How did you hear" never says LinkedIn
   unless Easy Apply was the only route.
3. **Encrypted passwords.** New ATS accounts get random 18-character passwords, encrypted with Windows DPAPI.
   See them with `scripts/showcreds.ps1`, then save them in your browser.
4. **Self-updating.** Every time the skill loads, it checks this repo and fast-forwards when your copy is clean.
5. **Field notes.** [reference/ats.md](./reference/ats.md) has the quirks of Workday, Greenhouse, Lever,
   Ashby, iCIMS, ADP, Phenom, IBM, ByteDance and Easy Apply.

## Your data stays local

Everything personal lives in `~/.job-apply/`: config, resume text, application log, and encrypted credentials.
None of it is in this repo or sent anywhere except the job sites you apply to.

## Tune it

Fork it, edit `SKILL.md` or `reference/ats.md`, and point your install at your fork:

```bash
git -C ~/.claude/skills/job-apply remote set-url origin https://github.com/<you>/job-apply
```

The update check follows whatever `origin` is.

## Requirements

Windows 10/11 is fully supported. macOS and Linux work except for the encrypted password store.
You also need Edge or Chrome, Node 18+, PowerShell 7 (`pwsh`), Python 3, and the Simplify Copilot extension.

## Be a good citizen

Apply only to jobs you actually want. Read what you're agreeing to. Express mode means *you* are signing.

## License

[MIT](LICENSE).

Star ⭐ if it saved you one Workday account.
