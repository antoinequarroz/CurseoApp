import fs from 'node:fs';

const catalogueInitial = 'scripts/catalogue-initial.csv';
const catalogueExtension = 'scripts/catalogue-v1-extension.csv';

// Sélection éditoriale COUR-51. Chaque URL a été contrôlée en HTTP avant
// intégration; le script rend l'opération reproductible et protège ensuite
// le catalogue contre le retour de visuels dupliqués.
const nouveauxVisuels = {
  'catalogue-v1-r-021': '1505253716362-afaea1d3d1af',
  'catalogue-v1-r-023': '1490645935967-10de6ba17061',
  'catalogue-v1-r-024': '1543353071-873f17a7a088',
  'catalogue-v1-r-025': '1563379926898-05f4575a45d8',
  'catalogue-v1-r-026': '1528712306091-ed0763094c98',
  'catalogue-v1-r-027': '1551183053-bf91a1d81141',
  'catalogue-v1-r-029': '1555939594-58d7cb561ad1',
  'catalogue-v1-r-031': '1540189549336-e6e99c3679fe',
  'catalogue-v1-r-032': '1565958011703-44f9829ba187',
  'catalogue-v1-r-033': '1515003197210-e0cd71810b5f',
  'catalogue-v1-r-034': '1478145046317-39f10e56b5e9',
  'catalogue-v1-r-035': '1525351484163-7529414344d8',
  'catalogue-v1-r-037': '1498837167922-ddd27525d352',
  'catalogue-v1-r-038': '1539136788836-5699e78bfc75',
  'catalogue-v1-r-039': '1547592166-23ac45744acd',
  'catalogue-v1-r-040': '1569718212165-3a8278d5f624',
  'catalogue-v1-r-041': '1569058242253-92a9c755a0ec',
  'catalogue-v1-r-042': '1529042410759-befb1204b468',
  'catalogue-v1-r-043': '1484723091739-30a097e8f929',
  'catalogue-v1-r-044': '1482049016688-2d3e1b311543',
  'catalogue-v1-r-045': '1473093295043-cdd812d0e601',
  'catalogue-v1-r-046': '1572449043416-55f4685c9bb7',
  'catalogue-v1-r-047': '1565299624946-b28f40a0ae38',
  'catalogue-v1-r-048': '1574484284002-952d92456975',
  'catalogue-v1-r-049': '1571997478779-2adcbbe9ab2f',
  'catalogue-v1-r-050': '1585032226651-759b368d7246',
  'catalogue-v1-r-051': '1601050690597-df0568f70950',
  'catalogue-v1-r-052': '1600891964092-4316c288032e',
  'catalogue-v1-r-054': '1551218808-94e220e084d2',
  'catalogue-v1-r-055': '1543352634-a1c51d9f1fa7',
};

const urlPour = (id) => `https://images.unsplash.com/photo-${id}`;

function appliquerSelection() {
  const lignes = fs.readFileSync(catalogueExtension, 'utf8').split(/\r?\n/);
  const resultat = lignes.map((ligne, index) => {
    if (index === 0 || !ligne) return ligne;
    const cle = ligne.slice(0, ligne.indexOf(','));
    const imageId = nouveauxVisuels[cle];
    return imageId ? ligne.replace(/https:\/\/images\.unsplash\.com\/[^,"]+/, urlPour(imageId)) : ligne;
  });
  fs.writeFileSync(catalogueExtension, resultat.join('\n'), 'utf8');
}

function verifierUnicite() {
  const urls = [];
  for (const fichier of [catalogueInitial, catalogueExtension]) {
    const lignes = fs.readFileSync(fichier, 'utf8').split(/\r?\n/).slice(1);
    for (const ligne of lignes) {
      const url = ligne.match(/https:\/\/images\.unsplash\.com\/[^,"]+/)?.[0];
      if (url) urls.push(url);
    }
  }
  if (urls.length !== 50) throw new Error(`50 visuels attendus, ${urls.length} trouvés.`);
  if (new Set(urls).size !== urls.length) throw new Error('Des recettes utilisent encore le même visuel.');
  console.log('COUR-51 : 50 recettes, 50 URL de visuel uniques.');
}

if (!process.argv.includes('--check')) appliquerSelection();
verifierUnicite();
