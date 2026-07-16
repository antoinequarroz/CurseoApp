"""
Genere les assets d'icone/splash Coursia (vert foret + toque blanche simplifiee)
a partir de primitives PIL — remplace le logo "A" bleu par defaut d'Expo et le
splash placeholder gris, jamais mis a jour depuis le rebranding.
Usage ponctuel : python scripts/generate-icons.py
"""
from PIL import Image, ImageDraw

VERT_FORET = (15, 45, 39, 255)  # #0F2D27
BLANC = (255, 255, 255, 255)

def toque(draw: ImageDraw.ImageDraw, cx: int, cy: int, taille: int, couleur):
    """Silhouette simplifiee de toque de chef : bandeau + poches arrondies (echo du ChefHat lucide utilise partout dans l'app)."""
    largeur_bandeau = taille * 0.62
    hauteur_bandeau = taille * 0.22
    y_bandeau = cy + taille * 0.30

    draw.rounded_rectangle(
        [cx - largeur_bandeau / 2, y_bandeau, cx + largeur_bandeau / 2, y_bandeau + hauteur_bandeau],
        radius=hauteur_bandeau * 0.35,
        fill=couleur,
    )

    rayon_poche = taille * 0.20
    centres = [
        (cx - taille * 0.26, cy - taille * 0.02),
        (cx, cy - taille * 0.22),
        (cx + taille * 0.26, cy - taille * 0.02),
    ]
    for (px, py) in centres:
        draw.ellipse([px - rayon_poche, py - rayon_poche, px + rayon_poche, py + rayon_poche], fill=couleur)
    draw.rectangle([cx - largeur_bandeau / 2, cy, cx + largeur_bandeau / 2, y_bandeau + 2], fill=couleur)


def icone_pleine(taille: int, chemin: str):
    img = Image.new('RGBA', (taille, taille), VERT_FORET)
    draw = ImageDraw.Draw(img)
    toque(draw, taille / 2, taille / 2, taille * 0.62, BLANC)
    img.save(chemin)


def icone_transparente(taille: int, chemin: str, marge_ratio: float = 0.62):
    img = Image.new('RGBA', (taille, taille), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    toque(draw, taille / 2, taille / 2, taille * marge_ratio, BLANC)
    img.save(chemin)


def fond_plein(taille: int, chemin: str):
    img = Image.new('RGBA', (taille, taille), VERT_FORET)
    img.save(chemin)


if __name__ == '__main__':
    icone_pleine(1024, 'assets/icon.png')
    icone_transparente(1024, 'assets/splash-icon.png', marge_ratio=0.42)
    icone_transparente(1024, 'assets/android-icon-foreground.png', marge_ratio=0.5)
    fond_plein(1024, 'assets/android-icon-background.png')
    icone_transparente(1024, 'assets/android-icon-monochrome.png', marge_ratio=0.5)
    icone_pleine(196, 'assets/favicon.png')
    print('Assets generes.')
