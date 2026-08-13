/**
 * Screenshots the running storefront at desktop and phone widths and reports
 * any console error, so a visual regression is caught by looking rather than by
 * reading the source.
 *
 *   npm run dev
 *   node qa/capture-home.mjs
 */
import { chromium } from 'playwright'
const b = await chromium.launch()
for (const [name, w, h] of [['home-desktop',1440,2400],['home-phone',390,1600]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  const errs = []
  p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,140)) })
  p.on('pageerror', e => errs.push('PAGEERROR '+String(e).slice(0,160)))
  try {
    await p.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 90000 })
    await p.waitForTimeout(2500)
    await p.screenshot({ path: `qa/shots/${name}.jpg`, type: 'jpeg', quality: 78 })
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
    console.log(name, 'ok', JSON.stringify(m), errs.length ? 'ERRORS: '+errs.slice(0,4).join(' | ') : 'no console errors')
  } catch (e) { console.log(name, 'FAIL', String(e).split('\n')[0].slice(0,160), errs.slice(0,3).join(' | ')) }
  await p.close()
}
await b.close()
