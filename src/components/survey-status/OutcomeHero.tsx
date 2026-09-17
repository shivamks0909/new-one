'use client';

import { motion } from 'framer-motion';
import {
  Check,
  Users,
  FileX,
  ShieldAlert,
  Lock,
  Pause,
  UserX,
  Globe,
  WifiOff,
} from 'lucide-react';
import { OutcomeConfig, SurveyOutcome } from '../../lib/survey/outcome-config';
import { Confetti } from './Confetti';
import { soundFX } from '@/lib/survey/sound-fx';

interface OutcomeHeroProps {
  outcome: SurveyOutcome;
  config: OutcomeConfig;
}

const ICONS = {
  Check,
  Users,
  FileX,
  ShieldAlert,
  Lock,
  Pause,
  UserX,
  Globe,
  WifiOff,
};

// Symmetrical, clean accent lines (2 left, 2 right) with consistent weight and spacing
const SIDE_ACCENTS = [-6, 6];

export function OutcomeHero({ outcome, config }: OutcomeHeroProps) {
  const IconComponent = ICONS[config.icon] || Check;

  return (
    <div className="relative flex items-center justify-center select-none">
      {/* Subtle celebratory accents for COMPLETE only */}
      {config.confetti && <Confetti />}

      {/* Left Symmetrical Accent Lines */}
      <div className="absolute -left-5 top-1/2 -translate-y-1/2 flex flex-col items-end gap-1.5 pointer-events-none">
        {SIDE_ACCENTS.map((offset, i) => (
          <span
            key={`left-accent-${i}`}
            className="block h-[2.5px] w-3 rounded-full opacity-40 transition-opacity"
            style={{ backgroundColor: config.accent }}
          />
        ))}
      </div>

      {/* Rebalanced Hero Badge with Apple Liquid Glass soft ambient glow */}
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.5,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        className="relative flex items-center justify-center"
      >
        {/* Soft Ambient Glow Layer */}
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            opacity: [0.25, 0.4, 0.25],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute h-16 w-16 sm:h-18 sm:w-18 rounded-full blur-md pointer-events-none"
          style={{ backgroundColor: config.accent }}
        />

        {/* Outer Ring / Glass Rim - Clickable to Play Sound */}
        <div
          onClick={() => soundFX.playAudioFile(config.soundUrl)}
          title={`Click to play: ${config.soundTitle}`}
          className="relative flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-full transition-transform duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-md"
          style={{
            backgroundColor: config.accent,
            boxShadow: `0 8px 20px -4px ${config.accent}55, 0 0 0 4px ${config.accentLight}66`,
          }}
        >
          {/* Inner Gloss Sheen */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />

          {/* Balanced Check Icon */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.35, ease: 'easeOut' }}
            className="relative z-10 flex items-center justify-center text-white"
          >
            <IconComponent className="h-8 w-8 sm:h-9 sm:w-9 stroke-[2.8]" />
          </motion.div>
        </div>
      </motion.div>

      {/* Right Symmetrical Accent Lines */}
      <div className="absolute -right-5 top-1/2 -translate-y-1/2 flex flex-col items-start gap-1.5 pointer-events-none">
        {SIDE_ACCENTS.map((offset, i) => (
          <span
            key={`right-accent-${i}`}
            className="block h-[2.5px] w-3 rounded-full opacity-40 transition-opacity"
            style={{ backgroundColor: config.accent }}
          />
        ))}
      </div>
    </div>
  );
}
