import { existsSync } from 'node:fs'
import { join } from 'node:path'

import {
  BRAND_ASSETS,
  departmentAsset,
  type BrandAssetId,
  type BrandAssetSlot,
} from '@/constants/brand-assets'

/**
 * Whether a reserved slot has been filled.
 *
 * Checked on the filesystem at render time rather than tracked in a list, so
 * delivery really is a drag and drop: the designer drops the file into
 * `public/brand/` and it appears. Nobody has to remember to also edit a
 * manifest, which is the step that always gets missed.
 *
 * Server-only by construction: it reads the disk.
 */

const BRAND_DIR = join(process.cwd(), 'public', 'brand')

export interface ResolvedAsset {
  readonly slot: BrandAssetSlot
  /** Public path when the file exists, `null` while the slot is still empty. */
  readonly src: string | null
}

function resolve(slot: BrandAssetSlot): ResolvedAsset {
  const present = existsSync(join(BRAND_DIR, slot.file))
  return { slot, src: present ? `/brand/${slot.file}` : null }
}

export function getAsset(id: BrandAssetId): ResolvedAsset {
  return resolve(BRAND_ASSETS[id])
}

export function getDepartmentAsset(slug: string): ResolvedAsset {
  return resolve(departmentAsset(slug))
}

/** Every slot and its state, for the delivery checklist. */
export function auditAssets(): { id: string; file: string; delivered: boolean }[] {
  return Object.entries(BRAND_ASSETS).map(([id, slot]) => ({
    id,
    file: slot.file,
    delivered: existsSync(join(BRAND_DIR, slot.file)),
  }))
}
