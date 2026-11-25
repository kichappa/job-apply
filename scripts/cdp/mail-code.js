// Find the newest mail whose list text matches SENDER (regex) and extract CODE (regex with one capture group).
// run.ps1 cdp/mail-code.js -Vars @{SENDER='ADP|verification'; CODE='\b(\d{6})\b'}
// Polls the inbox ~50 s, then checks Junk. Requires cdp/mail-open.js first.
// Gmail: the window shows in:anywhere newer_than:1h (every tab and Spam), SENDER also matches sender addresses, and the
// search is re-run each poll because Gmail does not live-update search results.
async page => {
  const ctx = page.context(); const base = __MAIL__;
  const gmail = /mail\.google\.com/.test(base);
  const ol = ctx.pages().filter(p => gmail ? p.url().startsWith(base.split('#')[0]) && p.url().includes('#search/in%3Aanywhere')
                                           : p.url().startsWith(base.split('/mail')[0])).pop();
  if (!ol) return 'mail window not open: run cdp/mail-open.js first';
  const sender = new RegExp(__SENDER__, 'i'), code = new RegExp(__CODE__);
  const row = gmail ? 'tr.zA:visible' : '[role=option]';
  const views = ['#search/in%3Aanywhere+newer_than%3A1h', '#search/in%3Aanywhere+newer_than%3A61m'];
  for (let k = 0; k < 7; k++) {
    if (gmail && k > 0) { await ol.evaluate(h => { location.hash = h; }, views[k % 2]); await ol.waitForTimeout(3000); }
    const it = await ol.locator(row).evaluateAll(rs => rs.map(r =>
      (r.innerText + ' ' + [...r.querySelectorAll('[email]')].map(e => e.getAttribute('email')).join(' ')).replace(/\s+/g, ' ')));
    const hit = it.findIndex(x => sender.test(x));
    if (hit >= 0) {
      const m0 = it[hit].match(code); if (m0) return 'CODE=' + m0[1] + '  (from list preview: ' + it[hit].slice(0, 80) + ')';
      await ol.locator(row).nth(hit).click(); await ol.waitForTimeout(3000);
      const body = gmail ? await ol.locator('div.a3s:visible').last().innerText().catch(() => '')
                         : await ol.locator('[role=main]').first().innerText();
      if (gmail) await ol.goBack().catch(() => {});   // back to the search list so the window is found next time
      const m = body.match(code);
      return (m ? 'CODE=' + m[1] : 'CODE=none') + '  (' + it[hit].slice(0, 80) + ')' + (m ? '' : '\n' + body.slice(0, 600));
    }
    await ol.waitForTimeout(gmail ? 5000 : 8000);
  }
  return gmail ? 'no matching mail in the last hour after ~55 s (all tabs and Spam searched); resend the code'
               : 'no matching mail in inbox after ~55 s; check Junk/Spam or resend the code';
}
