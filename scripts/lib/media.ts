/**
 * Le stockage des photographies, tenu a jour en meme temps que le catalogue.
 *
 * LE TROU QUE CECI BOUCHE. La synchronisation rapatriait les donnees d'un
 * produit et laissait sa photographie chez le client. Tant que le site pointait
 * sur nowtechcenter.com cela ne se voyait pas; le jour ou il sert ses propres
 * images, un produit ajoute le matin arrive dans le catalogue avec une image
 * introuvable. Les donnees et les fichiers doivent bouger ensemble ou pas du
 * tout.
 *
 * CE N'EST PAS L'ORIGINE DU CLIENT QUE L'ON SOLLICITE, et c'est ce qui rend
 * l'operation acceptable. Mesure sur leurs fichiers: `cf-cache-status: HIT` et
 * `Cache-Control: public, max-age=10368000`, donc les images sont servies par le
 * cache de Cloudflare et leur serveur, qui repond entre 2,9 et 17,6 secondes sur
 * l'API, n'est pas touche. Le rapatriement complet des 6 686 fichiers a pris 12
 * minutes pour 374 Mo, sans un seul echec; une synchronisation courante n'en
 * demande que quelques uns.
 *
 * ET LES NOUVELLES IMAGES LOURDES SONT ALLEGEES AU PASSAGE, sinon la panne
 * revient. Les fiches produit ont repondu 502 sur Vercel a cause de 53 fichiers
 * de plus d'un mega, tous en PNG, 47 generes par une IA et deposes sans
 * compression: 3 a 5 secondes d'encodage quelle que soit la largeur demandee.
 * Le correctif fut de les reencoder une fois et de les servir depuis le depot.
 * Si rien ne surveille les arrivees, la premiere photographie de 2,5 Mo deposee
 * demain reintroduit exactement la meme panne. Le seuil est donc verifie ici, a
 * l'entree, et la table de substitution est reecrite dans la foulee.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import sharp from 'sharp'

const AGENT =
  'NowTechCenterSync/1.0 (+https://now-tech-website.vercel.app; synchronisation des photographies)'
const PREFIXE = 'https://nowtechcenter.com/wp-content/uploads/'

/** Au dela, l'optimiseur d'images depasse son budget: voir l'en-tete. */
const SEUIL_LOURD = 1024 * 1024
/** Une photographie de produit n'a jamais besoin de plus. */
const LARGEUR_MAX = 1080

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export interface BilanMedia {
  demandees: number
  telechargees: number
  dejaLa: number
  echecs: number
  allegees: number
  octets: number
  manquantes: string[]
}

/**
 * Rapatrie les fichiers absents, et seulement ceux-la.
 *
 * La presence sur le disque fait foi plutot qu'une date: une image WordPress ne
 * change pas de contenu sous la meme adresse, elle change d'adresse. Comparer
 * des dates couterait une requete par fichier pour un cas qui n'existe pas.
 */
export async function synchroniserImages(
  urls: readonly string[],
  racine: string,
  dire: (ligne: string) => void,
): Promise<BilanMedia> {
  const uniques = [...new Set(urls.filter((u) => u.startsWith(PREFIXE)))]
  const bilan: BilanMedia = {
    demandees: uniques.length,
    telechargees: 0,
    dejaLa: 0,
    echecs: 0,
    allegees: 0,
    octets: 0,
    manquantes: [],
  }

  const aFaire = uniques.filter((u) => {
    const chemin = join(racine, u.slice(PREFIXE.length))
    if (existsSync(chemin) && statSync(chemin).size > 0) {
      bilan.dejaLa++
      return false
    }
    return true
  })

  if (aFaire.length === 0) {
    dire(`  photographies : ${bilan.dejaLa} deja presentes, aucune a rapatrier`)
    return bilan
  }
  dire(`  photographies : ${aFaire.length} a rapatrier (${bilan.dejaLa} deja presentes)`)

  for (const url of aFaire) {
    const rel = url.slice(PREFIXE.length)
    const dest = join(racine, rel)
    let ok = false
    for (let essai = 1; essai <= 3 && !ok; essai++) {
      try {
        const r = await fetch(url, {
          headers: { 'user-agent': AGENT },
          signal: AbortSignal.timeout(60_000),
        })
        if (!r.ok) {
          if (essai === 3) break
          await sleep(1500 * essai)
          continue
        }
        const buf = Buffer.from(await r.arrayBuffer())
        mkdirSync(dirname(dest), { recursive: true })
        writeFileSync(dest, buf)
        bilan.telechargees++
        bilan.octets += buf.length
        ok = true
      } catch {
        if (essai === 3) break
        await sleep(1500 * essai)
      }
    }
    if (!ok) {
      bilan.echecs++
      bilan.manquantes.push(url)
    }
    // Le cache de Cloudflare encaisse sans peine, mais rien n'oblige a se
    // comporter comme un aspirateur.
    await sleep(120)
  }

  return bilan
}

/**
 * Reecrit la table des images allegees d'apres ce qui est reellement sur le
 * disque.
 *
 * Elle est reconstruite en entier plutot que completee: un fichier remplace en
 * amont par une version legere doit sortir de la table, et une table qui ne fait
 * que grandir garderait une substitution vers un fichier qui n'a plus lieu
 * d'etre.
 */
export async function allegerLesLourdes(
  urls: readonly string[],
  racine: string,
  dossierAllege: string,
  tableChemin: string,
  dire: (ligne: string) => void,
): Promise<number> {
  const table: Record<string, string> = {}
  let reencodees = 0

  for (const url of [...new Set(urls.filter((u) => u.startsWith(PREFIXE)))]) {
    const rel = url.slice(PREFIXE.length)
    const source = join(racine, rel)
    if (!existsSync(source) || statSync(source).size <= SEUIL_LOURD) continue

    const relAllege = rel.replace(/\.[a-z]+$/i, '.webp')
    const dest = join(dossierAllege, relAllege)
    table[url] = '/allege/' + relAllege

    // Ne reencode que ce qui manque: l'operation coute 114 ms par fichier et
    // n'a aucune raison d'etre refaite a chaque synchronisation.
    if (existsSync(dest) && statSync(dest).size > 0) continue
    mkdirSync(dirname(dest), { recursive: true })
    const buf = await sharp(source)
      .resize({ width: LARGEUR_MAX, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
    writeFileSync(dest, buf)
    reencodees++
    dire(
      `    allegee : ${(statSync(source).size / 1048576).toFixed(1)} Mo -> ` +
        `${Math.round(buf.length / 1024)} Ko  ${rel.split('/').pop()}`,
    )
  }

  const avant = existsSync(tableChemin)
    ? (JSON.parse(readFileSync(tableChemin, 'utf8')) as Record<string, string>)
    : {}
  writeFileSync(tableChemin, JSON.stringify(table, null, 1) + '\n')

  const total = Object.keys(table).length
  if (total !== Object.keys(avant).length || reencodees) {
    dire(`  images lourdes : ${total} dans la table, ${reencodees} reencodees`)
  }
  return reencodees
}
