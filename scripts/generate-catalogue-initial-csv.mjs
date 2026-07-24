#!/usr/bin/env node
/**
 * COUR-18 : genere scripts/catalogue-initial.csv (format COUR-17) a partir
 * du corpus reel deja ecrit dans lib/mocks/recettes.mock.ts, en excluant
 * les 5 recettes deja seedees par COUR-11/14 (supabase/seed.sql, ids
 * r-001/002/006/007/012 -- memes titres, evite les doublons) et les
 * recettes communautaires (contenu utilisateur, pas du catalogue "officiel").
 *
 * Genere une fois, le resultat est committe (scripts/catalogue-initial.csv)
 * -- ne pas relancer en aveugle si le mock change, la source de verite du
 * catalogue devient le CSV une fois importe.
 *
 * Usage : node --experimental-strip-types scripts/generate-catalogue-initial-csv.mjs
 */
import { writeFileSync } from 'node:fs';

const EXCLURE = ['r-001', 'r-002', 'r-006', 'r-007', 'r-012'];
const SOURCE_DROITS = 'Coursia (recette originale) — photo Unsplash sous licence libre, aucune attribution requise';

function champCsv(valeur) {
  const s = String(valeur ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const { RECETTES_MOCK } = await import('../lib/mocks/recettes.mock.ts');
  const corpus = RECETTES_MOCK.filter((r) => !EXCLURE.includes(r.id) && !r.est_communautaire);

  const entete = [
    'cle_externe', 'titre', 'description', 'image_url', 'temps_preparation',
    'difficulte', 'cout_estime', 'calories', 'proteines_g', 'glucides_g',
    'lipides_g', 'portions', 'source', 'statut_publication', 'regimes',
    'allergenes', 'ingredients', 'etapes',
  ];

  const lignes = corpus.map((r) => {
    const row = {
      cle_externe: `catalogue-${r.id}`,
      titre: r.titre,
      description: r.description,
      image_url: r.image_url,
      temps_preparation: r.temps_preparation,
      difficulte: r.difficulte,
      cout_estime: r.cout_estime,
      calories: r.calories,
      proteines_g: '',
      glucides_g: '',
      lipides_g: '',
      portions: r.portions,
      source: SOURCE_DROITS,
      statut_publication: 'publiee',
      regimes: r.regime.join('|'),
      allergenes: r.allergenes.join('|'),
      ingredients: r.ingredients.map((i) => `${i.nom}:${i.quantite}:${i.unite}`).join(';'),
      etapes: r.etapes.join(';'),
    };
    return entete.map((c) => champCsv(row[c])).join(',');
  });

  const csv = [entete.join(','), ...lignes].join('\n') + '\n';
  writeFileSync(new URL('./catalogue-initial.csv', import.meta.url), csv, 'utf8');
  console.log(`${corpus.length} recettes ecrites dans scripts/catalogue-initial.csv`);
}

main().catch((err) => { console.error(err); process.exit(1); });
