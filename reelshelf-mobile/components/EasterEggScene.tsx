import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import type { EasterEgg } from '@/lib/easterEggs';

interface EasterEggSceneProps {
  egg: EasterEgg;
}

export function EasterEggScene({ egg }: EasterEggSceneProps) {
  return (
    <View pointerEvents="none" style={styles.scene}>
      {egg === 'starfield' ? <Image source={require('../assets/images/easter-eggs/cosmic-dust.webp')} style={styles.cosmicTexture} contentFit="cover" /> : null}
      {egg === 'spice' ? <Image source={require('../assets/images/easter-eggs/desert-dunes.webp')} style={styles.desertTexture} contentFit="cover" /> : null}
      {egg === 'web' ? <Image source={require('../assets/images/easter-eggs/spider-silk.webp')} style={styles.webTexture} contentFit="fill" /> : null}
      {egg === 'wizardry' ? <Image source={require('../assets/images/easter-eggs/wizard-light.webp')} style={styles.wizardTexture} contentFit="cover" /> : null}
      {egg === 'vigilante' ? <Image source={require('../assets/images/easter-eggs/vigilante-city.webp')} style={styles.vigilanteTexture} contentFit="cover" /> : null}
      {egg === 'middleEarth' ? <Image source={require('../assets/images/easter-eggs/mythic-highlands.webp')} style={styles.middleEarthTexture} contentFit="cover" /> : null}
      {egg === 'shield' ? <Image source={require('../assets/images/easter-eggs/heroic-metal.webp')} style={styles.shieldTexture} contentFit="cover" /> : null}
      {egg === 'heroic' ? <Image source={require('../assets/images/easter-eggs/heroic-metal.webp')} style={styles.heroicTexture} contentFit="cover" /> : null}
      {egg === 'stormforge' ? <Image source={require('../assets/images/easter-eggs/storm-forge.webp')} style={styles.stormTexture} contentFit="cover" /> : null}
      {egg === 'cosmicRelics' ? <Image source={require('../assets/images/easter-eggs/cosmic-relics.webp')} style={styles.relicTexture} contentFit="cover" /> : null}
      {egg === 'prehistoric' ? <Image source={require('../assets/images/easter-eggs/prehistoric-rainforest.webp')} style={styles.prehistoricTexture} contentFit="cover" /> : null}
      {egg === 'babylon' ? <Image source={require('../assets/images/easter-eggs/art-deco-marquee.webp')} style={styles.babylonTexture} contentFit="cover" /> : null}
      {egg === 'hyperspace' ? <Image source={require('../assets/images/easter-eggs/deep-space-travel.webp')} style={styles.hyperspaceTexture} contentFit="cover" /> : null}
      {egg === 'codeRain' ? <Image source={require('../assets/images/easter-eggs/digital-night.webp')} style={styles.digitalTexture} contentFit="cover" /> : null}
      {egg === 'cinephile' ? <Image source={require('../assets/images/easter-eggs/analog-cinema.webp')} style={styles.cinephileTexture} contentFit="cover" /> : null}
      {egg === 'otherworld' ? <Image source={require('../assets/images/easter-eggs/otherworld-upside-down.webp')} style={styles.otherworldTexture} contentFit="cover" /> : null}
      {egg === 'dynasty' ? <Image source={require('../assets/images/easter-eggs/dynasty-fire-winter.webp')} style={styles.dynastyTexture} contentFit="cover" /> : null}
      {egg === 'outlaw' ? <Image source={require('../assets/images/easter-eggs/outlaw-desert.webp')} style={styles.outlawTexture} contentFit="cover" /> : null}
      {egg === 'aftermath' ? <Image source={require('../assets/images/easter-eggs/aftermath-street.webp')} style={styles.aftermathTexture} contentFit="cover" /> : null}
      {egg === 'kitchenHeat' ? <Image source={require('../assets/images/easter-eggs/kitchen-heat.webp')} style={styles.kitchenTexture} contentFit="cover" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: StyleSheet.absoluteFillObject,
  cosmicTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.42,
  },
  desertTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.38,
  },
  webTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.32,
  },
  wizardTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.42,
  },
  vigilanteTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  middleEarthTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  shieldTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.38,
  },
  heroicTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.34,
  },
  stormTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  relicTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.42,
  },
  prehistoricTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  babylonTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  hyperspaceTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  digitalTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.38,
  },
  cinephileTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  otherworldTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.56,
  },
  dynastyTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.68,
  },
  outlawTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  aftermathTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  kitchenTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.48,
  },
});
