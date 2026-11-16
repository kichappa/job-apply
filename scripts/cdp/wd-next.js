// Workday: click "Save and Continue"/Next and report the new step plus any validation errors.
async page => {
  await page.locator('[data-automation-id=pageFooterNextButton]').first().click(); await page.waitForTimeout(8000);
  const err = await page.evaluate(() => [...document.querySelectorAll('[data-automation-id=errorMessage], [data-automation-id*=rror]')].filter(e => e.getClientRects().length).map(e => e.innerText.trim().slice(0, 120)).filter(Boolean));
  const step = (await page.locator('body').innerText()).match(/current step \d+ of \d+\n[^\n]+/)?.[0];
  return (step || page.url()).replace(/\n/, ': ') + '\nERR: ' + [...new Set(err)].slice(0, 6).join(' / ');
}
