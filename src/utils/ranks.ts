import type { ImageSourcePropType } from 'react-native';

import type { StrengthRank } from '@/api/types';

export const RANK_ORDER: StrengthRank[] = [
  'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER', 'OLYMPIAN',
];

interface RankInfo {
  label: string;
  color: string;
  image: ImageSourcePropType;
  min: number;
}

// Selos dos 9 ranks (arte do usuário) e faixas de nota: cada rank cobre 100 pontos; Olímpico vai de 800 a 1000.
export const RANKS: Record<StrengthRank, RankInfo> = {
  BRONZE: { label: 'Bronze', color: '#D08A5A', image: require('../../assets/ranks/bronze.png'), min: 0 },
  SILVER: { label: 'Prata', color: '#C4CCD8', image: require('../../assets/ranks/silver.png'), min: 100 },
  GOLD: { label: 'Ouro', color: '#F2C94C', image: require('../../assets/ranks/gold.png'), min: 200 },
  PLATINUM: { label: 'Platina', color: '#5FD4C4', image: require('../../assets/ranks/platinum.png'), min: 300 },
  DIAMOND: { label: 'Diamante', color: '#7EA6FF', image: require('../../assets/ranks/diamond.png'), min: 400 },
  MASTER: { label: 'Mestre', color: '#B58CFF', image: require('../../assets/ranks/master.png'), min: 500 },
  GRANDMASTER: { label: 'Grão-Mestre', color: '#FF7A8A', image: require('../../assets/ranks/grandmaster.png'), min: 600 },
  CHALLENGER: { label: 'Desafiante', color: '#FFB547', image: require('../../assets/ranks/challenger.png'), min: 700 },
  OLYMPIAN: { label: 'Olímpico', color: '#C8F55A', image: require('../../assets/ranks/olympian.png'), min: 800 },
};

export function rankLabel(rank: StrengthRank | null | undefined) {
  return rank ? RANKS[rank].label : 'Sem rank';
}

// LP de 0 a 100 dentro do rank (Olímpico: 0 a 200).
export function rankProgress(rank: StrengthRank, lp: number) {
  const span = rank === 'OLYMPIAN' ? 200 : 100;
  return Math.max(0, Math.min(100, (lp / span) * 100));
}

// Grupos musculares como vêm da API (já traduzidos) — usados nos filtros.
export const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Dorsais', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraços', 'Abdômen', 'Quadríceps',
  'Posteriores de coxa', 'Glúteos', 'Panturrilhas', 'Lombar', 'Trapézio', 'Abdutores', 'Adutores', 'Pescoço',
];

export const EQUIPMENT_LABELS: Record<string, string> = {
  BARBELL: 'Barra',
  DUMBBELL: 'Halteres',
  MACHINE: 'Máquina',
  CABLE: 'Polia',
  BODYWEIGHT: 'Peso corporal',
};

export const GOAL_LABELS: Record<string, string> = {
  STRENGTH: 'Força',
  HYPERTROPHY: 'Hipertrofia',
  ENDURANCE: 'Resistência',
};

export const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
};
