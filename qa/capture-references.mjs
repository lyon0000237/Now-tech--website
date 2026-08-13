/**
 * Reference capture.
 *
 * Screenshots the research references with a real headless browser so the
 * inspiration board shows what the sites actually look like today, rather than
 * a list of links. Also captures the current nowtechcenter.com, which is the
 * only honest "before" we can put next to a proposal.
 *
 *   node qa/capture-references.mjs
 */

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(import.meta.dirname, 'shots', 'refs')
mkdirSync(OUT, { recursive: true })

/** height: how tall a slice to keep. Homepages need more than a fold. */
const DESKTOP = [
  // --- the "before": the client's live site -------------------------------
  { id: 'now-home', url: 'https://nowtechcenter.com/', height: 2400 },
  { id: 'now-category', url: 'https://nowtechcenter.com/categorie-produit/ordinateur/', height: 2000 },
  { id: 'now-product', url: 'https://nowtechcenter.com/produit/baie-amoire-de-brassage-9u/', height: 1600 },

  // --- market ---------------------------------------------------------------
  { id: 'glotelho', url: 'https://www.glotelho.cm/', height: 2200 },
  { id: 'jumia-ng', url: 'https://www.jumia.com.ng/', height: 1800 },

  // --- deep-catalog IA & navigation -----------------------------------------
  { id: 'mcmaster-home', url: 'https://www.mcmaster.com/', height: 1400 },
  { id: 'mcmaster-screws', url: 'https://www.mcmaster.com/products/screws/', height: 1600 },
  { id: 'thomann-cat', url: 'https://www.thomann.co.uk/guitars_and_basses.html', height: 2000 },
  { id: 'screwfix', url: 'https://www.screwfix.com/', height: 1600 },
  { id: 'ikea', url: 'https://www.ikea.com/us/en/', height: 1600 },
  { id: '1stdibs', url: 'https://www.1stdibs.com/', height: 1800 },
  { id: 'manufactum', url: 'https://www.manufactum.com/', height: 1800 },

  // --- product grid & PDP ----------------------------------------------------
  { id: 'ubnt-switching', url: 'https://store.ui.com/us/en/category/all-switching', height: 1800 },
  { id: 'axis-cameras', url: 'https://www.axis.com/products/network-cameras', height: 1600 },
  { id: 'muji-all', url: 'https://www.muji.eu/', height: 1800 },
  { id: 'apple-specs', url: 'https://www.apple.com/macbook-pro/specs/', height: 1600 },
  { id: 'ifixit-parts', url: 'https://www.ifixit.com/Parts/MacBook_Pro', height: 1600 },

  // --- hero / art direction ---------------------------------------------------
  { id: 'backmarket', url: 'https://www.backmarket.com/en-us', height: 1600 },
  { id: 'teenage-store', url: 'https://teenage.engineering/store', height: 1600 },
  { id: 'teenage-products', url: 'https://teenage.engineering/products', height: 1600 },
  { id: 'nothing', url: 'https://nothing.tech', height: 1600 },
  { id: 'ubnt-home', url: 'https://ui.com', height: 1400 },
  { id: 'klim', url: 'https://klim.co.nz', height: 1400 },
  { id: 'rijksstudio', url: 'https://www.rijksmuseum.nl/en/rijksstudio', height: 1600 },

  // --- architectural / spatial -------------------------------------------------
  { id: 'oma-projects', url: 'https://www.oma.com/projects', height: 1600 },
  { id: 'hdm', url: 'https://www.herzogdemeuron.com', height: 1400 },
  { id: 'usm', url: 'https://www.usm.com', height: 1400 },
  { id: 'vitsoe', url: 'https://www.vitsoe.com/us/606', height: 1600 },
  { id: 'dsrny', url: 'https://www.dsrny.com', height: 1400 },

  // --- motion ------------------------------------------------------------------
  { id: 'linear', url: 'https://linear.app', height: 1400 },
  { id: 'cosmos', url: 'https://www.cosmos.so', height: 1400 },
]

const MOBILE = [
  { id: 'm-now-home', url: 'https://nowtechcenter.com/', height: 1800 },
  { id: 'm-glotelho', url: 'https://www.glotelho.cm/', height: 1600 },
  { id: 'm-backmarket', url: 'https://www.backmarket.com/en-us', height: 1600 },
  { id: 'm-muji', url: 'https://www.muji.eu/', height: 1600 },
  { id: 'm-ikea', url: 'https://www.ikea.com/us/en/', height: 1600 },
  { id: 'm-teenage', url: 'https://teenage.engineering/store', height: 1600 },
]

/** Cookie walls ruin every screenshot, so dismiss the common ones. */
const CONSENT = [
  'button:has-text("Accept all")', 'button:has-text("Accept All")',
  'button:has-text("Tout accepter")', 'button:has-text("Accepter")',
  'button:has-text("I accept")', 'button:has-text("Agree")',
  'button:has-text("Allow all")', 'button:has-text("Got it")',
  'button:has-text("OK")', '#onetrust-accept-btn-handler',
  '[aria-label="Accept cookies"]', '[data-testid="cookie-accept-all"]',
]

async function capture(context, { id, url, height }, width) {
  const page = await context.newPage()
  await page.setViewportSize({ width, height: Math.min(height, 2400) })
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.waitForTimeout(3500)

    for (const selector of CONSENT) {
      try {
        const button = page.locator(selector).first()
        if (await button.isVisible({ timeout: 250 })) {
          await button.click({ timeout: 1200 })
          await page.waitForTimeout(700)
          break
        }
      } catch {
        /* no consent wall matched this selector */
      }
    }

    // Nudge the scroll so lazy images below the first fold decode, then return.
    await page.evaluate(() => window.scrollTo(0, 900))
    await page.waitForTimeout(1400)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(900)

    await page.screenshot({ path: join(OUT, `${id}.jpg`), type: 'jpeg', quality: 72 })
    console.log(`  ok    ${id}`)
  } catch (error) {
    console.log(`  FAIL  ${id} — ${String(error).split('\n')[0].slice(0, 110)}`)
  } finally {
    await page.close()
  }
}

const browser = await chromium.launch()

console.log(`desktop (1440) — ${DESKTOP.length} pages`)
const desktopContext = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  locale: 'en-GB',
  deviceScaleFactor: 1,
})
for (const target of DESKTOP) await capture(desktopContext, target, 1440)
await desktopContext.close()

console.log(`mobile (390) — ${MOBILE.length} pages`)
const mobileContext = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  locale: 'fr-FR',
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
})
for (const target of MOBILE) await capture(mobileContext, target, 390)
await mobileContext.close()

await browser.close()
console.log(`done -> ${OUT}`)
