/** Echelle typographique CoursIA — police systeme (SF Pro/Roboto, moodboard v2), DM Mono (chiffres/prix). */
import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { useTheme } from '@/lib/theme-context';
import { TRONCATURE } from '@/lib/troncature';

type Props = TextProps & { children: React.ReactNode };

function make(
  className: string,
  colorKey: 'textPrimary' | 'textSecondary' | 'textMuted' | 'priceColor' | 'savingsColor' = 'textPrimary',
  baseStyle?: TextProps['style'],
) {
  return function Preset({ style, children, ...props }: Props) {
    const { colors } = useTheme();
    return (
      <RNText className={className} style={[{ color: colors[colorKey] }, baseStyle, style]} {...props}>
        {children}
      </RNText>
    );
  };
}

export const DisplayXL = make('font-bold text-[32px]', 'textPrimary', {
  lineHeight: 38,
  letterSpacing: -0.8,
});
export const DisplayLG = make('font-bold text-[26px]', 'textPrimary', {
  lineHeight: 32,
  letterSpacing: -0.45,
});
export const Heading = make('font-semibold text-xl', 'textPrimary', { lineHeight: 26, letterSpacing: -0.2 });
export const Subheading = make('font-semibold text-[15px]', 'textPrimary', { lineHeight: 20 });
export const Body = make('text-[15px]', 'textPrimary', { lineHeight: 22 });
export const BodySm = make('text-[13px]', 'textSecondary', { lineHeight: 19 });
export const Caption = make('text-xs', 'textMuted', { lineHeight: 16 });
export const Price = make('font-dm-mono-medium text-lg', 'priceColor', { fontVariant: ['tabular-nums'] });
export const PriceLG = make('font-dm-mono-medium text-2xl leading-9', 'priceColor', {
  fontVariant: ['tabular-nums'],
});
/** Grand montant hero (ex. budget restant, carte d'onboarding) — lineHeight explicite pour éviter que la Card (overflow: hidden) coupe le chiffre. */
export const PriceXL = make('font-dm-mono-medium text-[32px] leading-10', 'priceColor', {
  fontVariant: ['tabular-nums'],
});
export const Savings = make('font-dm-mono-medium text-lg', 'savingsColor', {
  fontVariant: ['tabular-nums'],
});
/** Grand montant hero d'économies — même logique que PriceXL. */
export const SavingsXL = make('font-dm-mono-medium text-[32px] leading-10', 'savingsColor', {
  fontVariant: ['tabular-nums'],
});
export const Data = make('font-dm-mono text-[13px]', 'textSecondary', { fontVariant: ['tabular-nums'] });

/** Applique une règle de troncature centralisée (lib/troncature.ts) à un preset existant. */
function withTroncature(
  Preset: React.ComponentType<Props>,
  troncature: Pick<TextProps, 'numberOfLines' | 'ellipsizeMode'>,
) {
  return function TroncatedPreset({ numberOfLines, ellipsizeMode, ...props }: Props) {
    return (
      <Preset numberOfLines={troncature.numberOfLines} ellipsizeMode={troncature.ellipsizeMode} {...props} />
    );
  };
}

/** Titre de recette dans une RecetteCard. */
export const TitreRecetteCard = withTroncature(Heading, TRONCATURE.titreRecetteCard);
/** Description de recette dans une RecetteCard. */
export const DescriptionRecetteCard = withTroncature(BodySm, TRONCATURE.descriptionRecetteCard);
/** Titre de recette affiché dans un slot du planning. */
export const TitreRecettePlanning = withTroncature(BodySm, TRONCATURE.titreRecettePlanning);
/** Nom de produit dans la liste de courses. */
export const NomProduitCourse = withTroncature(Body, TRONCATURE.nomProduitCourse);
