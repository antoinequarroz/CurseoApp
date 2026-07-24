#!/usr/bin/env node
/**
 * COUR-17 : pipeline d'import CSV controle pour les recettes.
 *
 * Ce script ne fait QUE le parsing/typage du CSV (format documente dans
 * supabase/IMPORT_RECETTES_CSV.md) et l'appel a la fonction SQL
 * fn_importer_recettes_csv (migration 20260724030000), qui porte toute la
 * validation referentielle/metier et l'ecriture atomique. Aucune logique
 * de decision n'est dupliquee ici : ce fichier transforme juste des lignes
 * de texte en JSON structure.
 *
 * Usage :
 *   node scripts/import-recettes-csv.mjs <fichier.csv> [--dry-run]
 *
 * Variables d'environnement requises : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (le script cible toujours le Data API local par defaut si non fournies —
 * voir IMPORT_RECETTES_CSV.md).
 */
import { readFileSync } from 'node:fs';

const COLONNES = [
  'cle_externe', 'titre', 'description', 'image_url', 'temps_preparation',
  'difficulte', 'cout_estime', 'calories', 'proteines_g', 'glucides_g',
  'lipides_g', 'portions', 'source', 'statut_publication', 'regimes',
  'allergenes', 'ingredients', 'etapes',
];

function parserLigneCsv(ligne) {
  const champs = [];
  let champ = '';
  let dansGuillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (dansGuillemets) {
      if (c === '"' && ligne[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') { dansGuillemets = false; }
      else { champ += c; }
    } else if (c === '"') {
      dansGuillemets = true;
    } else if (c === ',') {
      champs.push(champ);
      champ = '';
    } else {
      champ += c;
    }
  }
  champs.push(champ);
  return champs;
}

function parserCsv(contenu) {
  const lignesBrutes = contenu.split(/\r?\n/).filter((l, i) => l.trim() !== '' || i === 0);
  const entete = parserLigneCsv(lignesBrutes[0]).map((c) => c.trim());
  for (const colonne of COLONNES) {
    if (!entete.includes(colonne)) {
      throw new Error(`Colonne manquante dans l'entete CSV : ${colonne}`);
    }
  }
  const lignes = [];
  for (let i = 1; i < lignesBrutes.length; i++) {
    const valeurs = parserLigneCsv(lignesBrutes[i]);
    const brut = {};
    entete.forEach((colonne, idx) => { brut[colonne] = (valeurs[idx] ?? '').trim(); });
    lignes.push({ numeroLigne: i + 1, brut });
  }
  return lignes;
}

function versNombre(valeur) {
  if (valeur === '' || valeur === undefined) return null;
  const n = Number(valeur);
  return Number.isNaN(n) ? null : n;
}

/** Transforme une ligne CSV brute en objet structure pour fn_importer_recettes_csv.
 *  Erreurs de FORME (pas de forme "nom:quantite:unite", nombre illisible) sont
 *  detectees ici ; les erreurs de FOND (reference inconnue, contrainte metier)
 *  sont laissees a la fonction SQL — un seul rapport d'erreurs fusionne les deux. */
function structurerLigne({ numeroLigne, brut }) {
  const erreurs = [];

  const ingredients = [];
  if (brut.ingredients) {
    for (const entree of brut.ingredients.split(';').map((s) => s.trim()).filter(Boolean)) {
      const parties = entree.split(':').map((s) => s.trim());
      if (parties.length !== 3) {
        erreurs.push({ ligne: numeroLigne, champ: 'ingredients', message: `format invalide (attendu nom:quantite:unite) : "${entree}"` });
        continue;
      }
      const [nom, quantiteBrute, unite] = parties;
      const quantite = versNombre(quantiteBrute);
      if (quantite === null) {
        erreurs.push({ ligne: numeroLigne, champ: 'ingredients', message: `quantite non numerique pour ${nom} : "${quantiteBrute}"` });
      }
      ingredients.push({ nom, quantite, unite });
    }
  }

  const etapes = brut.etapes ? brut.etapes.split(';').map((s) => s.trim()).filter(Boolean) : [];
  const regimes = brut.regimes ? brut.regimes.split('|').map((s) => s.trim()).filter(Boolean) : [];
  const allergenes = brut.allergenes ? brut.allergenes.split('|').map((s) => s.trim()).filter(Boolean) : [];

  const structuree = {
    ligne: numeroLigne,
    cle_externe: brut.cle_externe,
    titre: brut.titre,
    description: brut.description,
    image_url: brut.image_url,
    temps_preparation: brut.temps_preparation,
    difficulte: brut.difficulte,
    cout_estime: brut.cout_estime,
    calories: brut.calories,
    proteines_g: brut.proteines_g,
    glucides_g: brut.glucides_g,
    lipides_g: brut.lipides_g,
    portions: brut.portions,
    source: brut.source,
    statut_publication: brut.statut_publication,
    regimes,
    allergenes,
    ingredients,
    etapes,
  };

  return { structuree, erreurs };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fichier = args.find((a) => !a.startsWith('--'));
  if (!fichier) {
    console.error('Usage : node scripts/import-recettes-csv.mjs <fichier.csv> [--dry-run]');
    process.exit(2);
  }

  const apiUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY manquant (voir supabase/IMPORT_RECETTES_CSV.md).');
    process.exit(2);
  }

  const contenu = readFileSync(fichier, 'utf8');
  const lignesBrutes = parserCsv(contenu);

  const erreursNode = [];
  const lignesStructurees = [];
  for (const l of lignesBrutes) {
    const { structuree, erreurs } = structurerLigne(l);
    lignesStructurees.push(structuree);
    erreursNode.push(...erreurs);
  }

  const reponse = await fetch(`${apiUrl}/rest/v1/rpc/fn_importer_recettes_csv`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lignes: lignesStructurees, dry_run: dryRun }),
  });

  if (!reponse.ok) {
    console.error(`Echec de l'appel a fn_importer_recettes_csv : HTTP ${reponse.status}`);
    console.error(await reponse.text());
    process.exit(1);
  }

  const resultat = await reponse.json();
  const toutesErreurs = [...erreursNode, ...resultat.erreurs].sort((a, b) => a.ligne - b.ligne);

  console.log(`Fichier : ${fichier}`);
  console.log(`Mode : ${dryRun ? 'dry-run (aucune ecriture)' : 'import reel'}`);
  console.log(`Lignes : ${lignesStructurees.length} (a creer: ${resultat.resume.a_creer}, a mettre a jour: ${resultat.resume.a_mettre_a_jour})`);

  if (toutesErreurs.length > 0) {
    console.log(`\n${toutesErreurs.length} erreur(s) — aucune ligne n'a ete importee :`);
    for (const e of toutesErreurs) {
      console.log(`  ligne ${e.ligne} [${e.champ}] ${e.message}`);
    }
    process.exit(1);
  }

  if (dryRun) {
    console.log('\nApercu valide, aucune erreur. Relancer sans --dry-run pour importer.');
  } else {
    console.log(`\nImport reussi : ${resultat.importe ? 'OK' : 'ECHEC'}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
