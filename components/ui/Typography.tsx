/** Echelle typographique Coursia — Quicksand (titres, ronde/douce), Inter (corps), DM Mono (chiffres/prix). */
import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { useTheme } from '@/lib/theme-context';
import { TRONCATURE } from '@/lib/troncature';

type Props = TextProps & { children: React.ReactNode };

function make(className: string, colorKey: 'textPrimary' | 'textSecondary' | 'textMuted' | 'priceColor' | 'savingsColor' = 'textPrimary') {
  return function Preset({ style, children, ...props }: Props) {
    const { colors } = useTheme();
    return (
      <RNText className={className} style={[{ color: colors[colorKey] }, style]} {...props}>
        {children}
      </RNText>
    );
  };
}

export const DisplayXL = make('font-heading-bold text-[32px]');
export const DisplayLG = make('font-heading-bold text-2xl');
export const Heading = make('font-heading-medium text-lg');
export const Subheading = make('font-heading-medium text-[15px]');
export const Body = make('font-inter text-[15px]');
export const BodySm = make('font-inter text-[13px]', 'textSecondary');
export const Caption = make('font-inter text-xs', 'textMuted');
export const Price = make('font-dm-mono-medium text-lg', 'priceColor');
export const PriceLG = make('font-dm-mono-medium text-2xl leading-9', 'priceColor');
/** Grand montant hero (ex. budget restant, carte d'onboarding) — lineHeight explicite pour éviter que la Card (overflow: hidden) coupe le chiffre. */
export const PriceXL = make('font-dm-mono-medium text-[32px] leading-10', 'priceColor');
export const Savings = make('font-dm-mono-medium text-lg', 'savingsColor');
/** Grand montant hero d'économies — même logique que PriceXL. */
export const SavingsXL = make('font-dm-mono-medium text-[32px] leading-10', 'savingsColor');
export const Data = make('font-dm-mono text-[13px]', 'textSecondary');

/** Applique une règle de troncature centralisée (lib/troncature.ts) à un preset existant. */
function withTroncature(Preset: React.ComponentType<Props>, troncature: Pick<TextProps, 'numberOfLines' | 'ellipsizeMode'>) {
  return function TroncatedPreset({ numberOfLines, ellipsizeMode, ...props }: Props) {
    return <Preset numberOfLines={troncature.numberOfLines} ellipsizeMode={troncature.ellipsizeMode} {...props} />;
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
