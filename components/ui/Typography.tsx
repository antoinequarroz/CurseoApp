/** Echelle typographique Courseo — DM Sans (titres), Inter (corps), DM Mono (chiffres/prix). */
import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { useTheme } from '@/lib/theme-context';

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

export const DisplayXL = make('font-dm-sans-bold text-[32px]');
export const DisplayLG = make('font-dm-sans-bold text-2xl');
export const Heading = make('font-dm-sans-medium text-lg');
export const Subheading = make('font-dm-sans-medium text-[15px]');
export const Body = make('font-inter text-[15px]');
export const BodySm = make('font-inter text-[13px]', 'textSecondary');
export const Caption = make('font-inter text-xs', 'textMuted');
export const Price = make('font-dm-mono-medium text-lg', 'priceColor');
export const PriceLG = make('font-dm-mono-medium text-2xl font-dm-sans-bold', 'priceColor');
export const Savings = make('font-dm-mono-medium text-lg', 'savingsColor');
export const Data = make('font-dm-mono text-[13px]', 'textSecondary');
