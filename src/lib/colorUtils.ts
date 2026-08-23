export const STANDARD_COLOR_MAP: Record<string, string> = {
  // Woods & Metals
  'oak': '#d7c29d',
  'natural oak': '#d7c29d',
  'white oak': '#d8cca3',
  'ash': '#e5dec9',
  'walnut': '#4b382a',
  'dark walnut': '#3b281a',
  'steel': '#8a9597',
  'stainless steel': '#A8A9AD',
  'chrome': '#E8E8E8',
  'silver': '#E0E0E2',
  'brass': '#B5A642',
  'gold': '#D4AF37',
  'bronze': '#CD7F32',
  'copper': '#B87333',
  'iron': '#434343',
  'aluminum': '#848789',

  // Neutrals & Monochromes
  'black': '#1c1c1c',
  'matt black': '#151515',
  'white': '#ffffff',
  'pure white': '#ffffff',
  'off white': '#fbfaf8',
  'cream': '#FFFDD0',
  'ivory': '#FFFFF0',
  'beige': '#F5F5DC',
  'natural': '#e8d8c1',
  'sand': '#C2B280',
  'tan': '#D2B48C',
  'taupe': '#8B8589',
  'khaki': '#C3B091',
  'camel': '#C19A6B',
  'gray': '#808080',
  'grey': '#808080',
  'light gray': '#D3D3D3',
  'dark gray': '#A9A9A9',
  'charcoal': '#36454F',
  'anthracite': '#293133',
  'smoke': '#738276',

  // Chromatic Colors
  'cobalt': '#0047AB',
  'cobalt blue': '#0047AB',
  'blue': '#1E40AF',
  'navy': '#0A192F',
  'sky blue': '#87CEEB',
  'teal': '#008080',
  'cyan': '#00BCD4',
  'orange': '#FF4500',
  'burnt orange': '#CC5500',
  'red': '#D32F2F',
  'terracotta': '#C85A32',
  'clay': '#B66A50',
  'brick': '#9C413D',
  'rust': '#B7410E',
  'coral': '#FF7F50',
  'salmon': '#FA8072',
  'pink': '#F8BBD0',
  'rose': '#FF007F',
  'magenta': '#FF00FF',
  'purple': '#7B1FA2',
  'violet': '#8A2BE2',
  'lavender': '#E6E6FA',
  'plum': '#DDA0DD',
  'burgundy': '#800020',
  'bordeaux': '#5C0120',
  'wine': '#722F37',
  'maroon': '#800000',
  'brown': '#6F4E37',
  'green': '#2E7D32',
  'forest green': '#228B22',
  'olive': '#556B2F',
  'olive green': '#556B2F',
  'sage': '#9CAF88',
  'sage green': '#9CAF88',
  'mint': '#98FF98',
  'moss': '#8A9A5B',
  'emerald': '#50C878',
  'yellow': '#FBC02D',
  'mustard': '#E1AD01',
  'ochre': '#CC7722',
  'lemon': '#FFF44F',
  'glass': '#A9D6E5',
  'leather': '#8B4513'
};

export function resolveColorHex(name: string, customHex?: string): string {
  if (customHex && typeof customHex === 'string' && customHex.trim() && customHex.trim() !== '#888888') {
    return customHex.trim();
  }
  const cleanName = (name || '').toLowerCase().trim();
  if (!cleanName) return customHex || '#888888';

  // 1. Direct match
  if (STANDARD_COLOR_MAP[cleanName]) {
    return STANDARD_COLOR_MAP[cleanName];
  }

  // 2. Multi-word or partial matching (e.g. "Terracotta Fabric" -> "terracotta")
  for (const [key, val] of Object.entries(STANDARD_COLOR_MAP)) {
    if (cleanName === key || cleanName.includes(key) || key.includes(cleanName)) {
      return val;
    }
  }

  return customHex && customHex.trim() ? customHex.trim() : '#888888';
}
