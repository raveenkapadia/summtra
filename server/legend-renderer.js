const { createCanvas } = require('canvas');

const LEGEND_WIDTH = 1200;
const LEGEND_HEIGHT = 1600;

const THEME = {
  background: '#FDF8F0',
  headerBg: '#2D1B4E',
  gold: '#D4AF37',
  goldLight: '#E8D5A3',
  textDark: '#1A1A2E',
  textMuted: '#666666',
  cardBg: '#FFFFFF',
  borderLight: 'rgba(45, 27, 78, 0.1)'
};

const PLANETS = [
  {
    name: 'Sun',
    symbol: '☉',
    color: '#FF8C00',
    keywords: ['Identity', 'Vitality', 'Leadership', 'Recognition'],
    meaning: 'Where you shine brightest. Locations with Sun lines enhance your sense of self, boost confidence, and bring recognition.',
    goalRelevance: { Career: 'Primary', Wealth: 'Primary', Education: 'Primary' }
  },
  {
    name: 'Moon',
    symbol: '☽',
    color: '#C0C0C0',
    keywords: ['Emotions', 'Home', 'Comfort', 'Intuition'],
    meaning: 'Where you feel emotionally at home. Moon lines create a sense of belonging, emotional security, and nurturing environments.',
    goalRelevance: { Love: 'Secondary', Settlement: 'Primary' }
  },
  {
    name: 'Mercury',
    symbol: '☿',
    color: '#4ECDC4',
    keywords: ['Communication', 'Business', 'Learning', 'Travel'],
    meaning: 'Where your mind thrives. Mercury lines enhance communication skills, business acumen, and intellectual pursuits.',
    goalRelevance: { Career: 'Primary', Wealth: 'Primary', Education: 'Primary' }
  },
  {
    name: 'Venus',
    symbol: '♀',
    color: '#FF69B4',
    keywords: ['Love', 'Beauty', 'Pleasure', 'Wealth'],
    meaning: 'Where love and abundance flow. Venus lines attract romantic opportunities, financial ease, and aesthetic appreciation.',
    goalRelevance: { Love: 'Primary', Wealth: 'Primary', Settlement: 'Primary' }
  },
  {
    name: 'Mars',
    symbol: '♂',
    color: '#DC143C',
    keywords: ['Energy', 'Action', 'Courage', 'Competition'],
    meaning: 'Where you take bold action. Mars lines energize ambition but may also bring conflicts or impulsive decisions.',
    goalRelevance: { Career: 'Secondary', Love: 'Secondary' }
  },
  {
    name: 'Jupiter',
    symbol: '♃',
    color: '#FFD700',
    keywords: ['Expansion', 'Luck', 'Wisdom', 'Prosperity'],
    meaning: 'Where fortune smiles upon you. Jupiter lines bring growth, opportunities, optimism, and good fortune in all endeavors.',
    goalRelevance: { Career: 'Primary', Wealth: 'Primary', Education: 'Primary', Love: 'Primary', Settlement: 'Primary' }
  },
  {
    name: 'Saturn',
    symbol: '♄',
    color: '#708090',
    keywords: ['Discipline', 'Structure', 'Challenges', 'Mastery'],
    meaning: 'Where hard work pays off. Saturn lines demand effort but reward with lasting achievements and authority.',
    goalRelevance: { Career: 'Primary', Settlement: 'Primary' }
  },
  {
    name: 'Uranus',
    symbol: '♅',
    color: '#00BFFF',
    keywords: ['Innovation', 'Change', 'Freedom', 'Surprises'],
    meaning: 'Where the unexpected happens. Uranus lines bring sudden changes, technological opportunities, and unconventional paths.',
    goalRelevance: { Education: 'Secondary' }
  },
  {
    name: 'Neptune',
    symbol: '♆',
    color: '#9370DB',
    keywords: ['Spirituality', 'Creativity', 'Dreams', 'Illusion'],
    meaning: 'Where imagination flourishes. Neptune lines enhance creativity and spirituality but may cloud practical judgment.',
    goalRelevance: { Love: 'Secondary' }
  },
  {
    name: 'Pluto',
    symbol: '♇',
    color: '#8B008B',
    keywords: ['Transformation', 'Power', 'Rebirth', 'Intensity'],
    meaning: 'Where deep transformation occurs. Pluto lines bring powerful changes, helping you shed old patterns for new beginnings.',
    goalRelevance: { Career: 'Secondary', Wealth: 'Secondary' }
  },
  {
    name: 'North Node',
    symbol: '☊',
    color: '#8B5CF6',
    keywords: ['Destiny', 'Growth', 'Purpose', 'Future'],
    meaning: 'Where your soul purpose calls. North Node lines align you with your life path and attract destined encounters.',
    goalRelevance: { Career: 'Secondary', Wealth: 'Secondary', Education: 'Secondary' }
  },
  {
    name: 'Chiron',
    symbol: '⚷',
    color: '#CD853F',
    keywords: ['Healing', 'Wisdom', 'Teaching', 'Wounds'],
    meaning: 'Where healing happens. Chiron lines help you transform past wounds into wisdom and the ability to help others.',
    goalRelevance: {}
  }
];

const LINE_TYPES = [
  {
    type: 'AC',
    name: 'Ascendant',
    lineStyle: 'solid',
    meaning: 'How you present yourself. AC lines affect your personality expression, physical vitality, and how others perceive you.',
    appearance: 'Curved line running roughly north-south'
  },
  {
    type: 'DC',
    name: 'Descendant',
    lineStyle: 'dashed',
    meaning: 'How you relate to others. DC lines influence partnerships, relationships, and one-on-one interactions.',
    appearance: 'Curved line opposite to AC'
  },
  {
    type: 'MC',
    name: 'Midheaven',
    lineStyle: 'dotted',
    meaning: 'Your public image and career. MC lines affect professional success, reputation, and life direction.',
    appearance: 'Nearly vertical line'
  },
  {
    type: 'IC',
    name: 'Imum Coeli',
    lineStyle: 'fine-dotted',
    meaning: 'Your roots and foundation. IC lines influence home life, family matters, and inner security.',
    appearance: 'Nearly vertical line opposite to MC'
  }
];

class LegendRenderer {
  constructor() {
    this.canvas = createCanvas(LEGEND_WIDTH, LEGEND_HEIGHT);
    this.ctx = this.canvas.getContext('2d');
  }
  
  drawHeader() {
    this.ctx.fillStyle = THEME.headerBg;
    this.ctx.fillRect(0, 0, LEGEND_WIDTH, 100);
    
    this.ctx.fillStyle = THEME.gold;
    this.ctx.font = 'bold 28px Arial, sans-serif';
    this.ctx.fillText('SSUMITRA', 40, 55);
    
    this.ctx.fillStyle = THEME.goldLight;
    this.ctx.font = '14px Arial, sans-serif';
    this.ctx.fillText('PLANETARY LINES GUIDE', 40, 78);
    
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = THEME.goldLight;
    this.ctx.font = '12px Arial, sans-serif';
    this.ctx.fillText('Reference Guide', LEGEND_WIDTH - 40, 60);
    this.ctx.textAlign = 'left';
  }
  
  drawSectionTitle(title, y) {
    this.ctx.fillStyle = THEME.textDark;
    this.ctx.font = 'bold 22px Arial, sans-serif';
    this.ctx.fillText(title, 40, y);
    
    this.ctx.strokeStyle = THEME.gold;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(40, y + 8);
    this.ctx.lineTo(40 + this.ctx.measureText(title).width, y + 8);
    this.ctx.stroke();
    
    return y + 40;
  }
  
  drawPlanetCard(planet, x, y, width, height) {
    this.ctx.fillStyle = THEME.cardBg;
    this.ctx.strokeStyle = THEME.borderLight;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, 6);
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.fillStyle = planet.color;
    this.ctx.fillRect(x, y, 6, height);
    
    this.ctx.fillStyle = planet.color;
    this.ctx.font = '28px Arial, sans-serif';
    this.ctx.fillText(planet.symbol, x + 18, y + 38);
    
    this.ctx.fillStyle = THEME.textDark;
    this.ctx.font = 'bold 14px Arial, sans-serif';
    this.ctx.fillText(planet.name, x + 55, y + 25);
    
    this.ctx.fillStyle = THEME.textMuted;
    this.ctx.font = '10px Arial, sans-serif';
    this.ctx.fillText(planet.keywords.join(' • '), x + 55, y + 42);
    
    this.ctx.fillStyle = THEME.textDark;
    this.ctx.font = '11px Arial, sans-serif';
    this.wrapText(planet.meaning, x + 20, y + 62, width - 40, 14);
  }
  
  drawLineTypeCard(lineType, x, y, width, height) {
    this.ctx.fillStyle = THEME.cardBg;
    this.ctx.strokeStyle = THEME.borderLight;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, 6);
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.strokeStyle = THEME.gold;
    this.ctx.lineWidth = 3;
    
    if (lineType.lineStyle === 'dashed') {
      this.ctx.setLineDash([8, 4]);
    } else if (lineType.lineStyle === 'dotted') {
      this.ctx.setLineDash([3, 3]);
    } else if (lineType.lineStyle === 'fine-dotted') {
      this.ctx.setLineDash([1, 3]);
    } else {
      this.ctx.setLineDash([]);
    }
    
    this.ctx.beginPath();
    this.ctx.moveTo(x + 20, y + 30);
    this.ctx.lineTo(x + 70, y + 30);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
    this.ctx.fillStyle = THEME.headerBg;
    this.ctx.font = 'bold 16px Arial, sans-serif';
    this.ctx.fillText(lineType.type, x + 85, y + 35);
    
    this.ctx.fillStyle = THEME.textDark;
    this.ctx.font = 'bold 13px Arial, sans-serif';
    this.ctx.fillText(lineType.name, x + 120, y + 25);
    
    this.ctx.fillStyle = THEME.textMuted;
    this.ctx.font = 'italic 10px Arial, sans-serif';
    this.ctx.fillText(lineType.appearance, x + 120, y + 42);
    
    this.ctx.fillStyle = THEME.textDark;
    this.ctx.font = '11px Arial, sans-serif';
    this.wrapText(lineType.meaning, x + 20, y + 65, width - 40, 14);
  }
  
  drawHowToRead(y) {
    y = this.drawSectionTitle('How to Read Your Map', y);
    
    const tips = [
      { icon: '🎯', title: 'Primary Lines', text: 'Bright, glowing lines indicate strongest planetary influences for your chosen goal.' },
      { icon: '📍', title: 'City Markers', text: 'Larger, greener markers indicate higher scores. Hover to see detailed planetary influences.' },
      { icon: '⭐', title: 'Birth Location', text: 'The red star marks your birth place - your astrological reference point.' },
      { icon: '🔮', title: 'Power Zones', text: 'Where multiple beneficial lines cross, creating areas of amplified positive energy.' }
    ];
    
    const tipWidth = 270;
    const tipHeight = 80;
    const gap = 15;
    
    tips.forEach((tip, i) => {
      const tx = 40 + i * (tipWidth + gap);
      
      this.ctx.fillStyle = THEME.cardBg;
      this.ctx.strokeStyle = THEME.borderLight;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.roundRect(tx, y, tipWidth, tipHeight, 6);
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.font = '24px Arial, sans-serif';
      this.ctx.fillText(tip.icon, tx + 15, y + 35);
      
      this.ctx.fillStyle = THEME.textDark;
      this.ctx.font = 'bold 12px Arial, sans-serif';
      this.ctx.fillText(tip.title, tx + 50, y + 25);
      
      this.ctx.fillStyle = THEME.textMuted;
      this.ctx.font = '10px Arial, sans-serif';
      this.wrapText(tip.text, tx + 50, y + 42, tipWidth - 65, 13);
    });
    
    return y + tipHeight + 30;
  }
  
  wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    words.forEach(word => {
      const testLine = line + word + ' ';
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && line !== '') {
        this.ctx.fillText(line.trim(), x, currentY);
        line = word + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    });
    
    this.ctx.fillText(line.trim(), x, currentY);
    return currentY + lineHeight;
  }
  
  render() {
    this.ctx.fillStyle = THEME.background;
    this.ctx.fillRect(0, 0, LEGEND_WIDTH, LEGEND_HEIGHT);
    
    this.drawHeader();
    
    let y = 130;
    
    y = this.drawSectionTitle('Planetary Influences', y);
    
    const cardWidth = 550;
    const cardHeight = 95;
    const gap = 15;
    
    PLANETS.forEach((planet, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 40 + col * (cardWidth + gap);
      const cardY = y + row * (cardHeight + gap);
      
      this.drawPlanetCard(planet, x, cardY, cardWidth, cardHeight);
    });
    
    y += Math.ceil(PLANETS.length / 2) * (cardHeight + gap) + 30;
    
    y = this.drawSectionTitle('Line Types', y);
    
    const lineCardWidth = 550;
    const lineCardHeight = 90;
    
    LINE_TYPES.forEach((lineType, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 40 + col * (lineCardWidth + gap);
      const cardY = y + row * (lineCardHeight + gap);
      
      this.drawLineTypeCard(lineType, x, cardY, lineCardWidth, lineCardHeight);
    });
    
    y += Math.ceil(LINE_TYPES.length / 2) * (lineCardHeight + gap) + 30;
    
    y = this.drawHowToRead(y);
    
    this.ctx.fillStyle = THEME.textMuted;
    this.ctx.font = '10px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('© Ssumitra • Confidential Report', LEGEND_WIDTH / 2, LEGEND_HEIGHT - 30);
    
    return this.canvas.toBuffer('image/png');
  }
}

module.exports = LegendRenderer;
module.exports.PLANETS = PLANETS;
module.exports.LINE_TYPES = LINE_TYPES;
