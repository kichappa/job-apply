// Workday: dump every formField on the current step with its current value and dropdown/checkbox options.
async page => {
  const step = (await page.locator('body').innerText()).match(/current step \d+ of \d+\n?[^\n]*/)?.[0] || '';
  const ffs = page.locator('[data-automation-id^=formField]'); const n = await ffs.count(); const out = [step.replace(/\n/, ': ')];
  for (let i = 0; i < n; i++) {
    const f = ffs.nth(i); if (!(await f.isVisible())) continue;
    const lab = (await f.locator('label, legend').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    let opts = []; const b = f.locator('button[aria-haspopup=listbox]').first(); let cur = '';
    if (await b.count()) { cur = (await b.innerText()).trim(); await b.click(); await page.waitForTimeout(700); opts = await page.locator('[role=option]').allInnerTexts(); await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    else { opts = await f.locator('input[type=checkbox], input[type=radio]').evaluateAll(es => es.map(e => (e.checked ? '[x]' : '[ ]') + (e.labels?.[0]?.innerText || ''))); cur = (await f.locator('input[type=text], input:not([type]), textarea').evaluateAll(es => es.map(e => e.value))).join(';'); }
    out.push(i + ' ' + lab.slice(0, 300) + '\n   = ' + cur + (opts.length ? '  OPTS: ' + opts.map(o => o.trim()).join(' / ').slice(0, 400) : ''));
  }
  return out.join('\n');
}
