// Workday: set a dropdown. LABEL = regex for the field label, OPTION = regex for the option text (anchored by you).
// run.ps1 cdp/wd-pick.js -Vars @{LABEL='veteran status'; OPTION='^I AM NOT A VETERAN$'}
async page => {
  const f = page.locator('[data-automation-id^=formField]').filter({ hasText: new RegExp(__LABEL__, 'i') }).last();
  const b = f.locator('button[aria-haspopup=listbox]').first(); await b.scrollIntoViewIfNeeded(); await b.click(); await page.waitForTimeout(900);
  const o = page.locator('[role=option]'); const tx = (await o.allInnerTexts()).map(x => x.trim()); const re = new RegExp(__OPTION__, 'i');
  const k = tx.findIndex(t => re.test(t));
  if (k < 0) { await page.keyboard.press('Escape'); return 'NO MATCH. options: ' + tx.join(' / ').slice(0, 500); }
  await o.nth(k).click({ force: true }); await page.waitForTimeout(600);
  return 'set: ' + (await b.innerText()).trim();
}
