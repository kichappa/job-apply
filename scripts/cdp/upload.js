// Put a file into a file input. SEL = CSS selector of the <input type=file> (default first file input), FILE = absolute path.
// If the site opens a native chooser instead, use: playwright-cli -s=<session> upload "<absolute path>"
async page => {
  const sel = '__SEL__'.startsWith('__') ? 'input[type=file]' : __SEL__;
  await page.locator(sel).first().setInputFiles(__FILE__); await page.waitForTimeout(3000);
  return 'uploaded to ' + sel;
}
