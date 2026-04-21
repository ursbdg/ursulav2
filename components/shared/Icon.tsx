import React from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface IconProps extends Omit<LucideProps, 'name'> {
  name: string;
}

const ICON_MAPPING: Record<string, string> = {
    // Sports
    'basket': 'Trophy',
    'basketball': 'Trophy',
    'futsal': 'Dumbbell',
    'sepak bola': 'Dumbbell',
    'bola': 'Dumbbell',
    'badminton': 'Trophy',
    'bulutangkis': 'Trophy',
    'volley': 'Trophy',
    'voli': 'Trophy',
    'ping pong': 'Trophy',
    'tenis meja': 'Trophy',
    'catur': 'Crown',
    'chess': 'Crown',
    'renang': 'Waves',
    'swimming': 'Waves',
    
    // Martial Arts
    'pencak silat': 'Swords',
    'silat': 'Swords',
    'karate': 'Swords',
    'taekwondo': 'Swords',
    'aikido': 'Swords',
    
    // Music & Arts
    'paduan suara': 'Mic2',
    'choir': 'Mic2',
    'vokal': 'Mic2',
    'solo vokal': 'Mic2',
    'musik': 'Music',
    'biola': 'Music',
    'gitar': 'Music',
    'piano': 'Music',
    'keyboard': 'Music',
    'band': 'Music',
    'kolintang': 'Music',
    'angklung': 'Music',
    'ansambel': 'Music',
    'orchestra': 'Music',
    'tari': 'Footprints',
    'dance': 'Footprints',
    'modern dance': 'Footprints',
    'balet': 'Footprints',
    'ballet': 'Footprints',
    'teater': 'Drama',
    'drama': 'Drama',
    'seni': 'Palette',
    'lukis': 'Palette',
    'gambar': 'Palette',
    'menggambar': 'Palette',
    'seni rupa': 'Palette',
    'desain grafis': 'Paintbrush',
    'kerajinan': 'Scissors',
    
    // Tech & Science
    'it': 'Monitor',
    'komputer': 'Monitor',
    'coding': 'Monitor',
    'programming': 'Monitor',
    'robotik': 'Monitor',
    'robotics': 'Monitor',
    'karya ilmiah': 'Microscope',
    'kir': 'Microscope',
    'science': 'Microscope',
    'math': 'Binary',
    'matematika': 'Binary',
    'astronomi': 'Telescope',
    
    // Social & Humaniora
    'pramuka': 'Tent',
    'scout': 'Tent',
    'pmr': 'HeartPulse',
    'palang merah': 'HeartPulse',
    'paskibra': 'Flag',
    'jurnalistik': 'PenTool',
    'english': 'Languages',
    'english club': 'Languages',
    'bahasa': 'Languages',
    'mandarin': 'Languages',
    'jepang': 'Languages',
    'korea': 'Languages',
    'fotografi': 'Camera',
    'photography': 'Camera',
    'sinematografi': 'Video',
    
    // Others
    'kuliner': 'Utensils',
    'tata boga': 'Utensils',
    'cooking': 'Utensils',
    'literasi': 'BookOpen',
    'perpustakaan': 'Library',
};

const toPascalCase = (str: string) => {
    if (!str) return '';
    
    // Check mapping first
    const mapped = ICON_MAPPING[str.toLowerCase()];
    if (mapped) return mapped;

    // Handle kebab-case and space-separated names
    return str
        .split(/[- ]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
};

const Icon: React.FC<IconProps> = ({ name, ...props }) => {
  const iconName = toPascalCase(name);
  
  // Try to find the icon in the LucideIcons object
  const LucideIcon = (LucideIcons as any)[iconName];

  if (!LucideIcon) {
    // Fallback to CircleHelp or HelpCircle
    const FallbackIcon = (LucideIcons as any)['CircleHelp'] || (LucideIcons as any)['HelpCircle'];
    if (!FallbackIcon) return null;
    return <FallbackIcon {...props} />;
  }

  return <LucideIcon {...props} />;
};

export default Icon;
