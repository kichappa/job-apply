// Page URL, title, headings, buttons and the first N chars of visible text. -Vars @{N='4000'} optional.
async page => {
  const n = Number('__N__'.startsWith('__') ? 4000 : __N__) || 4000;
  const body = (await page.locator('body').innerText().catch(() => '')).replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n');
  const btns = (await page.locator('button:visible, a[role=button]:visible').allInnerTexts().catch(() => [])).map(s => s.trim()).filter(Boolean).slice(0, 30);
  return JSON.stringify({ url: page.url(), title: await page.title(), buttons: btns }, null, 1) + '\n---\n' + body.slice(0, n);
}
