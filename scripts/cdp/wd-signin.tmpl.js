// Workday sign-in with the stored password. run.ps1 cdp/wd-signin.tmpl.js -PwSite <site>
async page => {
  const pw = __PW__;
  if (!(await page.locator('[data-automation-id=email]').isVisible().catch(() => false))) {
    await page.locator('[data-automation-id=utilityButtonSignIn], [data-automation-id=signInLink]').first().click(); await page.waitForTimeout(2500);
  }
  await page.locator('[data-automation-id=email]').fill(__EMAIL__);
  await page.locator('[data-automation-id=password]').fill(pw);
  const ok = (await page.locator('[data-automation-id=password]').inputValue()) === pw;
  const btn = page.locator('[data-automation-id=signInSubmitButton]').first();
  const cf = btn.locator('xpath=..').locator('[data-automation-id=click_filter]');
  if (await cf.count()) await cf.first().click({ force: true }); else await btn.click({ force: true });
  await page.waitForTimeout(6000);
  const err = await page.locator('[data-automation-id=errorMessage], [role=alert]').allTextContents().catch(() => []);
  return JSON.stringify({ filled: ok, url: page.url(), err });
}
