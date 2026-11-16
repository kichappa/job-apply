// Click "Autofill This Page" in the Simplify Copilot panel (shadow DOM) and wait for it to finish. Run ONCE per page.
async page => {
  const shadowText = () => page.evaluate(() => { let s = ''; document.querySelectorAll('*').forEach(e => { if (e.shadowRoot && /Simplify|Autofill/.test(e.shadowRoot.textContent)) s += e.shadowRoot.textContent; }); return s; });
  const clicked = await page.evaluate(() => {
    for (const e of document.querySelectorAll('*')) {
      if (!e.shadowRoot) continue;
      const b = [...e.shadowRoot.querySelectorAll('button')].find(x => /Autofill This Page|Run Autofill Again/i.test(x.textContent));
      if (b) { b.click(); return b.textContent.trim(); }
    }
    return null;
  });
  if (!clicked) return 'no autofill button; panel: ' + (await shadowText()).slice(0, 300);
  const t0 = Date.now();
  await page.waitForTimeout(3000);
  while (Date.now() - t0 < 150000) {
    const t = await shadowText();
    if (/Autofill complete|Completed!|Continue Application|Submit Application|Complete \d+ required/i.test(t) && !/Autofilling this page/i.test(t)) return 'done in ' + Math.round((Date.now() - t0) / 1000) + 's: ' + (t.match(/(Autofill complete!|Completed!)[\s\S]{0,200}/) || [''])[0];
    await page.waitForTimeout(1000);
  }
  return 'timeout 150s: ' + (await shadowText()).slice(-300);
}
