// Dump visible form fields: TYPE:id | label = value  (* = required). Works on most ATS pages.
async page => {
  return await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('input:not([type=hidden]), select, textarea').forEach(e => {
      if (!e.getClientRects().length && e.type !== 'file' && e.type !== 'radio' && e.type !== 'checkbox') return;
      let lab = e.labels?.[0]?.innerText || e.getAttribute('aria-label') || '';
      if (!lab && e.getAttribute('aria-labelledby')) lab = e.getAttribute('aria-labelledby').split(' ').map(i => document.getElementById(i)?.innerText || '').join(' ');
      if (!lab) { let c = e.parentElement; for (let i = 0; i < 3 && c && !(c.innerText || '').trim(); i++) c = c.parentElement; lab = (c?.innerText || '').slice(0, 80); }
      let v = e.type === 'radio' || e.type === 'checkbox' ? (e.checked ? '[x]' : '[ ]') : e.tagName === 'SELECT' ? (e.selectedOptions[0]?.text || '') : e.type === 'file' ? '(file)' : e.value;
      out.push(e.tagName[0] + ':' + (e.id || e.name).slice(-30) + ' | ' + lab.replace(/\s+/g, ' ').trim().slice(0, 90) + ' = ' + String(v).slice(0, 60) + (e.required || e.getAttribute('aria-required') === 'true' ? ' *' : ''));
    });
    return out.join('\n');
  });
}
