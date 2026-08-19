#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const FICHIERS = ['scripts/catalogue-initial.csv', 'scripts/catalogue-v1-extension.csv'];
const REGIMES = new Set(['vegetarien', 'vegan', 'halal', 'sans_gluten', 'sans_lactose', 'sans_noix', 'poisson']);

function parserLigne(ligne) {
  const champs = [];
  let champ = '';
  let guillemets = false;
  for (let i = 0; i < ligne.length; i += 1) {
    const caractere = ligne[i];
    if (guillemets && caractere === '"' && ligne[i + 1] === '"') {
      champ += '"';
      i += 1;
    } else if (caractere === '"') {
      guillemets = !guillemets;
    } else if (caractere === ',' && !guillemets) {
      champs.push(champ);
      champ = '';
    } else {
      champ += caractere;
    }
  }
  champs.push(champ);
  return champs;
}

function lireCatalogue(chemin) {
  const lignes = readFileSync(chemin, 'utf8').trim().split(/\r?\n/);
  const entete = parserLigne(lignes.shift());
  return lignes.map((ligne, index) => {
    const valeurs = parserLigne(ligne);
    const recette = Object.fromEntries(entete.map((cle, colonne) => [cle, valeurs[colonne]?.trim() ?? '']));
    return { ...recette, fichier: chemin, ligne: index + 2 };
  });
}

function erreur(recette, message) {
  return `${recette.fichier}:${recette.ligne} [${recette.cle_externe || '?'}] ${message}`;
}

const recettes = FICHIERS.flatMap(lireCatalogue);
const erreurs = [];
const images = new Set();
const ids = new Set();

for (const recette of recettes) {
  const regimes = new Set(recette.regimes.split('|').filter(Boolean));
  const allergenes = new Set(recette.allergenes.split('|').filter(Boolean));
  const ingredients = recette.ingredients.split(';').filter(Boolean);
  const etapes = recette.etapes.split(';').filter(Boolean);
  const temps = Number(recette.temps_preparation);
  const portions = Number(recette.portions);
  const cout = Number(recette.cout_estime);
  const calories = Number(recette.calories);

  if (!recette.cle_externe || ids.has(recette.cle_externe)) erreurs.push(erreur(recette, 'identifiant absent ou dupliqué'));
  ids.add(recette.cle_externe);
  if (recette.titre.length < 5) erreurs.push(erreur(recette, 'titre trop court'));
  if (recette.description.length < 20) erreurs.push(erreur(recette, 'description trop courte'));
  if (!/^https:\/\/images\.(unsplash|pexels)\.com\//.test(recette.image_url)) erreurs.push(erreur(recette, 'URL image non approuvée'));
  if (images.has(recette.image_url)) erreurs.push(erreur(recette, 'visuel dupliqué'));
  images.add(recette.image_url);
  if (!Number.isFinite(temps) || temps < 5 || temps > 180) erreurs.push(erreur(recette, 'durée incohérente'));
  if (!Number.isInteger(portions) || portions < 1 || portions > 12) erreurs.push(erreur(recette, 'portions incohérentes'));
  if (!Number.isFinite(cout) || cout <= 0) erreurs.push(erreur(recette, 'budget estimé invalide'));
  if (!Number.isFinite(calories) || calories <= 0) erreurs.push(erreur(recette, 'calories estimées invalides'));
  if (ingredients.length < 4) erreurs.push(erreur(recette, 'moins de 4 ingrédients'));
  if (etapes.length < 3) erreurs.push(erreur(recette, 'moins de 3 étapes'));
  for (const regime of regimes) if (!REGIMES.has(regime)) erreurs.push(erreur(recette, `régime inconnu : ${regime}`));
  if (regimes.has('vegan') && !regimes.has('vegetarien')) erreurs.push(erreur(recette, 'vegan doit aussi être végétarien'));
  if (regimes.has('vegan') && ['lactose', 'oeuf', 'poisson'].some((a) => allergenes.has(a))) erreurs.push(erreur(recette, 'vegan incompatible avec les allergènes déclarés'));
  if (regimes.has('sans_gluten') && allergenes.has('gluten')) erreurs.push(erreur(recette, 'sans gluten mais allergène gluten déclaré'));
  if (regimes.has('sans_lactose') && allergenes.has('lactose')) erreurs.push(erreur(recette, 'sans lactose mais allergène lactose déclaré'));
  if (regimes.has('poisson') !== allergenes.has('poisson')) erreurs.push(erreur(recette, 'régime pescétarien/poisson incohérent avec l’allergène poisson'));
}

if (recettes.length !== 50) erreurs.push(`catalogue : 50 recettes attendues, ${recettes.length} trouvées`);

if (erreurs.length) {
  console.error(`COUR-67 : ${erreurs.length} anomalie(s) détectée(s).`);
  for (const message of erreurs) console.error(`- ${message}`);
  process.exit(1);
}

console.log(`COUR-67 : ${recettes.length} recettes valides, ${images.size} visuels uniques, cohérence régimes/allergènes vérifiée.`);
console.log('La pertinence sémantique photo ↔ recette reste soumise à la recette éditoriale documentée.');
