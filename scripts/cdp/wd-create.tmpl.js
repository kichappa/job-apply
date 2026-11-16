// Workday "Create Account" with a generated, DPAPI-stored password. run.ps1 cdp/wd-create.tmpl.js -PwSite <site>
// Leaves any "I agree"/terms checkbox for the user in standard mode (tick it yourself only in express mode).
async page => {
  const pw = __PW__;
  const e = page.locator('[data-automation-id=email]').first(), p = page.locator('[data-automation-id=password]').first(), v = page.locator('[data-automation-id=verifyPassword]').first();
  await e.fill(__EMAIL__); await p.fill(pw); await v.fill(pw); await page.waitForTimeout(800);
  if ((await p.inputValue()) !== pw || (await v.inputValue()) !== pw) return 'MISMATCH before submit';
  const btn = page.locator('[data-automation-id=createAccountSubmitButton]').first();
  const cf = btn.locator('xpath=..').locator('[data-automation-id=click_filter]');
  if (await cf.count()) await cf.first().click({ force: true }); else await btn.click({ force: true });
  await page.waitForTimeout(9000);
  const t = await page.locator('body').innerText();
  return (t.match(/(already|exists|verify|verification|sent|error|invalid|agree|My Information)[^\n]{0,150}/gi) || []).slice(0, 5).join(' / ') + '\nURL ' + page.url().slice(-80);
}
