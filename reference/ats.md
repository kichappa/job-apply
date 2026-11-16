# ATS field guide

Mechanics per applicant-tracking system, learned from real runs. Always dump the form first
(`cdp/dump-form.js`, or `cdp/wd-dump.js` on Workday). Then fix only what is wrong.

## Greenhouse (job-boards.greenhouse.io, boards.greenhouse.io)

- New UI dropdowns are react-select. Focus the input, press ArrowDown, then click
  `[id="react-select-<inputId>-listbox"] [role=option]` matching your regex.
- Resume: remove Simplify's attached file (the "x" next to the file name), then `setInputFiles` on `#resume`.
- Custom questions use `question_<id>` ids. EEO fields: `gender`, `hispanic_ethnicity`, `race`, `veteran_status`,
  `disability_status`.
- Some boards email a security code before submit (the code goes in `#security-input-0..7`). Read it from mail.
- Submit button: `button[type=submit]`, labeled "Submit application".

## Ashby (jobs.ashbyhq.com)

- Fields: `.ashby-application-form-field-entry`. Yes/No questions are button pairs. Click the button whose text
  matches.
- Location is an autocomplete. Type the city and pick the first option that contains the state.
- Resume upload is `input[type=file]` inside the "Resume" entry.

## Lever (jobs.lever.co)

- Resume: `input[name=resume]`. Lever parses the resume and may overwrite name/email. Recheck them after upload.
- Custom cards: `cards[<uuid>][field0]` and similar. Location: `#location-input` (optional on many postings).
- Submit triggers an **hCaptcha**. That goes to the user (show the window; they solve it and click Submit).

## Workday (*.myworkdayjobs.com)

- Each tenant needs its own account. Create it with `cdp/wd-create.tmpl.js -PwSite <tenant>`, then
  `cdp/wd-signin.tmpl.js`.
- Steps: My Information → My Experience → Application Questions (1..n) → Voluntary Disclosures → Self Identify →
  Review. `cdp/wd-next.js` clicks Save and Continue and prints the errors.
- Dropdowns: `button[aria-haspopup=listbox]`, then `[role=option]`. Use `cdp/wd-pick.js`.
- Multi-select "prompt" fields (Field of Study, Skills, How did you hear): focus the input, type, press Enter, then
  click the matching `[data-automation-id=promptOption]`.
- Dates are spinbuttons. Focus the month spinbutton and `keyboard.type('MMDDYYYY')` or `'MMYYYY'`.
- Resume: `[data-automation-id=file-upload-input-ref]`. Delete the Simplify-attached `file-upload-item` when it
  isn't the newest resume.
- Drafts survive browser restarts: Candidate Home → My Applications → the job → **Continue Application**.
  Voluntary Disclosures and Self Identify are **not** saved in drafts. Refill them.
- Tenants sit on clusters (wd1, wd5, wd504, ...). "Workday is currently unavailable" on one cluster means
  maintenance. Retry later.

## iCIMS (*.icims.com)

- The form lives in the `#icims_content_iframe` frame. Use `page.frameLocator(...)`.
- Dropdowns are select2. Click `.select2-selection`, type in `.select2-search__field`, then pick from
  `.select2-results__option`.
- Login screens often have an hCaptcha. That goes to the user.
- Campus and experienced portals are separate sites with separate dashboards (for example campus-amd vs careers-amd).

## ADP Workforce Now (workforcenow.adp.com)

- Guest flow: name, email, and phone, then "Get your verification code". Choose email, send it, read the 6-digit
  code from mail (sender `SecurityServices_NoReply@adp.com`), then Verify.
- Drafts persist as "Pending Submission". Open the job → **Complete Your Application**.
- Dropdowns: MDFSelectBox (react-select) and `wfn-dropdown-list`. Click these with the real mouse at coordinates;
  JS clicks are ignored.
- The final step is "Self-Attest & Submit", which needs the e-sign checkbox.

## Phenom (HPE and others)

- The datepicker is react-datepicker. Open it, click the year header, pick the year, then the month and day.
- Some steps raise a native `alert`. Use `playwright-cli dialog-accept`.

## IBM (careers.ibm.com, Avature)

- Needs an IBMid, with an email code on signup. On first login IBM asks for MFA enrollment: pick Email, send the
  code, read it from mail (sender `ibmacct@iam.ibm.com`, subject "Verify your identity"). The code has a prefix
  such as `V6331-`; type only the 6 digits.
- Page 1 has the "I agree" privacy checkbox `#20527_*`. Repeating rows: `[id=addRowFor_37299]` (education) and
  `[id=addRowFor_9017]` (experience). "Is current position?" is select2. Degree type and completed are native
  selects.

## ByteDance / TikTok (jobs.bytedance.com, lifeattiktok.com)

- Password login. The "ud-select" dropdowns open only with real mouse clicks at their coordinates.
- **Never accept "parse resume to fill profile"**: it wipes the profile. Upload the file and decline.
- The source "Campus Event" forces a which-event follow-up. Use "Recruitment Website" unless there truly was an event.

## LinkedIn Easy Apply

- Use only when it is the only route. It pulls work history from the LinkedIn profile, so check each role's
  description before submitting.
- The final page has an "I Agree" or follow-company checkbox.

## Simplify Copilot (all sites)

- The panel is in a shadow DOM. `cdp/simplify.js` clicks "Autofill This Page" and waits.
- Run it once per page. Re-running reverts manual fixes (sponsorship flips back to No).
- Common mistakes: sponsorship = No, source = LinkedIn, wrong degree (Doctor of Medicine), an older resume, an
  old graduation date. Keep the Simplify profile current with `/job-apply update-simplify`.
