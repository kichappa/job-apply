// Find the newest mail whose list text matches SENDER (regex) and extract CODE (regex with one capture group).
// run.ps1 cdp/mail-code.js -Vars @{SENDER='ADP|verification'; CODE='\b(\d{6})\b'}
// Polls the inbox ~50 s, then checks Junk. Requires cdp/mail-open.js first.
async page => {
  const ctx = page.context(); const base = __MAIL__;
  const ol = ctx.pages().filter(p => p.url().startsWith(base.split('/mail')[0])).pop();
  if (!ol) return 'mail window not open: run cdp/mail-open.js first';
  const sender = new RegExp(__SENDER__, 'i'), code = new RegExp(__CODE__);
  for (let k = 0; k < 7; k++) {
    const it = (await ol.locator('[role=option]').allInnerTexts()).map(x => x.replace(/\s+/g, ' '));
    const hit = it.findIndex(x => sender.test(x));
    if (hit >= 0) {
      const m0 = it[hit].match(code); if (m0) return 'CODE=' + m0[1] + '  (from list preview: ' + it[hit].slice(0, 80) + ')';
      await ol.locator('[role=option]').nth(hit).click(); await ol.waitForTimeout(3000);
      const body = await ol.locator('[role=main]').first().innerText();
      const m = body.match(code);
      return (m ? 'CODE=' + m[1] : 'CODE=none') + '  (' + it[hit].slice(0, 80) + ')' + (m ? '' : '\n' + body.slice(0, 600));
    }
    await ol.waitForTimeout(8000);
  }
  return 'no matching mail in inbox after ~55 s; check Junk/Spam or resend the code';
}
