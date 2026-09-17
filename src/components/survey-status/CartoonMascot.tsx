'use client';

import { motion } from 'framer-motion';
import { SurveyOutcome, OUTCOME_CONFIG } from '../../lib/survey/outcome-config';
import { soundFX } from '@/lib/survey/sound-fx';

export type MascotCharacter = 'shinchan' | 'tom_jerry' | 'bheem';

interface CartoonMascotProps {
  outcome: SurveyOutcome;
  character: MascotCharacter;
}

export function CartoonMascot({ outcome, character }: CartoonMascotProps) {
  const soundUrl = OUTCOME_CONFIG[outcome].soundUrl;
  const soundTitle = OUTCOME_CONFIG[outcome].soundTitle;

  const handleClick = () => {
    soundFX.playAudioFile(soundUrl);
  };

  if (character === 'shinchan') {
    return (
      <div
        onClick={handleClick}
        title={`Click Shinchan to play: ${soundTitle}`}
        className="relative flex flex-col items-center select-none cursor-pointer transition-transform hover:scale-105 active:scale-95"
      >
        <motion.div
          animate={
            outcome === 'COMPLETE'
              ? { rotate: [-4, 4, -4], y: [0, -6, 0] }
              : outcome === 'TERMINATE'
              ? { y: [0, 4, 0], rotate: [-2, 2, -2] }
              : { rotate: [-3, 3, -3] }
          }
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-20 h-20 sm:w-22 sm:h-22"
        >
          {/* Cohesive Clean Vector Shin-chan Mascot */}
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Soft Ambient Floor Shadow */}
            <ellipse cx="100" cy="195" rx="32" ry="4.5" fill="#0f172a" opacity="0.07" />

            {/* Red T-Shirt & Yellow Shorts */}
            <path d="M72 140 L62 176 L138 176 L128 140 Z" fill="#EF4444" stroke="#1E293B" strokeWidth="3" strokeLinejoin="round" />
            <path d="M62 174 L54 193 L96 193 L98 174 Z" fill="#FACC15" stroke="#1E293B" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M102 174 L104 193 L146 193 L138 174 Z" fill="#FACC15" stroke="#1E293B" strokeWidth="2.5" strokeLinejoin="round" />
            
            {/* Shoes */}
            <ellipse cx="73" cy="193" rx="12" ry="4.5" fill="#FDE047" stroke="#1E293B" strokeWidth="2.2" />
            <ellipse cx="127" cy="193" rx="12" ry="4.5" fill="#FDE047" stroke="#1E293B" strokeWidth="2.2" />

            {/* Arms */}
            <motion.path
              animate={outcome === 'COMPLETE' ? { rotate: [-6, 6, -6] } : {}}
              d="M64 144 Q44 153 52 166"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <motion.path
              animate={outcome === 'COMPLETE' ? { rotate: [6, -6, 6] } : {}}
              d="M136 144 Q156 153 148 166"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />

            {/* Ears */}
            <path d="M152 82 C163 82, 163 100, 150 100 Z" fill="#FED7AA" stroke="#1E293B" strokeWidth="3" />
            <path d="M48 82 C37 82, 37 100, 50 100 Z" fill="#FED7AA" stroke="#1E293B" strokeWidth="3" />

            {/* Head Contour */}
            <path
              d="M55 78 C52 42, 75 24, 110 24 C146 24, 158 46, 155 78 C152 97, 157 115, 142 134 C124 146, 76 146, 58 134 C43 117, 48 97, 55 78 Z"
              fill="#FED7AA"
              stroke="#1E293B"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />

            {/* Cropped Hair */}
            <path
              d="M54 75 C52 40, 75 24, 110 24 C146 24, 156 44, 154 75 C145 55, 126 44, 105 44 C82 44, 64 55, 54 75 Z"
              fill="#1E293B"
            />

            {/* Bushy Eyebrows */}
            <motion.path
              animate={outcome === 'COMPLETE' ? { y: [0, -3, 0] } : { y: [0, 2, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              d="M60 65 C72 49, 86 57, 92 66 C85 64, 73 59, 62 70 Z"
              fill="#1E293B"
            />
            <motion.path
              animate={outcome === 'COMPLETE' ? { y: [0, -3, 0] } : { y: [0, 2, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              d="M112 66 C118 57, 132 49, 144 65 C137 59, 125 64, 118 70 Z"
              fill="#1E293B"
            />

            {/* Eyes */}
            <ellipse cx="80" cy="85" rx="12" ry="15" fill="#1E293B" />
            <circle cx="83" cy="81" r="5" fill="#FFFFFF" />
            <circle cx="78" cy="90" r="2.2" fill="#FFFFFF" />

            <ellipse cx="125" cy="85" rx="12" ry="15" fill="#1E293B" />
            <circle cx="128" cy="81" r="5" fill="#FFFFFF" />
            <circle cx="123" cy="90" r="2.2" fill="#FFFFFF" />

            {/* Soft Blushing Cheeks */}
            <ellipse cx="64" cy="104" rx="11" ry="7" fill="#FB7185" opacity="0.75" />
            <ellipse cx="142" cy="104" rx="11" ry="7" fill="#FB7185" opacity="0.75" />

            {/* Nose */}
            <path d="M102 93 Q105 97 101 99" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Cheerful Mouth */}
            {outcome === 'COMPLETE' ? (
              <g>
                <path d="M93 107 Q103 128 113 107 Z" fill="#EF4444" stroke="#1E293B" strokeWidth="2.8" strokeLinejoin="round" />
                <path d="M96 112 Q103 121 110 112" fill="#FCA5A5" />
              </g>
            ) : (
              <path d="M94 114 Q103 106 112 114" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" fill="none" />
            )}
          </svg>
        </motion.div>
      </div>
    );
  }

  if (character === 'tom_jerry') {
    return (
      <div
        onClick={handleClick}
        title={`Click Jerry to play: ${soundTitle}`}
        className="relative flex flex-col items-center select-none py-1 cursor-pointer transition-transform hover:scale-105 active:scale-95"
      >
        <motion.div
          animate={
            outcome === 'COMPLETE'
              ? { scale: [1, 1.08, 1], y: [0, -6, 0] }
              : { y: [0, 3, 0] }
          }
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-24 h-24 sm:w-28 sm:h-28 drop-shadow-md"
        >
          <svg viewBox="0 0 160 160" className="w-full h-full">
            {/* Jerry Vector Mascot */}
            {/* Big Round Ears */}
            <circle cx="36" cy="48" r="28" fill="#B45309" stroke="#78350F" strokeWidth="3" />
            <circle cx="36" cy="48" r="18" fill="#FDE68A" />
            <circle cx="124" cy="48" r="28" fill="#B45309" stroke="#78350F" strokeWidth="3" />
            <circle cx="124" cy="48" r="18" fill="#FDE68A" />

            {/* Head */}
            <ellipse cx="80" cy="85" rx="44" ry="40" fill="#D97706" stroke="#78350F" strokeWidth="3" />

            {/* Cheeks/Muzzle */}
            <ellipse cx="65" cy="98" rx="20" ry="15" fill="#FDE68A" />
            <ellipse cx="95" cy="98" rx="20" ry="15" fill="#FDE68A" />

            {/* Big Jerry Eyes */}
            <ellipse cx="66" cy="74" rx="10" ry="14" fill="#FFFFFF" stroke="#78350F" strokeWidth="2" />
            <ellipse cx="67" cy="74" rx="5" ry="8" fill="#1E293B" />
            <ellipse cx="94" cy="74" rx="10" ry="14" fill="#FFFFFF" stroke="#78350F" strokeWidth="2" />
            <ellipse cx="93" cy="74" rx="5" ry="8" fill="#1E293B" />

            {/* Cute Nose */}
            <polygon points="80,88 74,94 86,94" fill="#1E293B" />

            {/* Whiskers */}
            <line x1="45" y1="95" x2="20" y2="92" stroke="#78350F" strokeWidth="2" />
            <line x1="45" y1="102" x2="22" y2="108" stroke="#78350F" strokeWidth="2" />
            <line x1="115" y1="95" x2="140" y2="92" stroke="#78350F" strokeWidth="2" />
            <line x1="115" y1="102" x2="138" y2="108" stroke="#78350F" strokeWidth="2" />

            {/* Smile or surprise */}
            {outcome === 'COMPLETE' ? (
              <path d="M70 102 Q80 118 90 102" stroke="#78350F" strokeWidth="3" fill="#EF4444" />
            ) : (
              <circle cx="80" cy="106" r="6" fill="#1E293B" />
            )}
          </svg>
        </motion.div>
      </div>
    );
  }

  // Chhota Bheem
  return (
    <div
      onClick={handleClick}
      title={`Click Chhota Bheem to play: ${soundTitle}`}
      className="relative flex flex-col items-center select-none py-1 cursor-pointer transition-transform hover:scale-105 active:scale-95"
    >
      <motion.div
        animate={
          outcome === 'COMPLETE'
            ? { rotate: [-4, 4, -4], y: [0, -7, 0] }
            : { y: [0, 4, 0] }
        }
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-24 h-24 sm:w-28 sm:h-28 drop-shadow-md"
      >
        <svg viewBox="0 0 160 160" className="w-full h-full">
          {/* Chhota Bheem Character Vector */}
          {/* Ears */}
          <circle cx="34" cy="80" r="12" fill="#D97706" stroke="#92400E" strokeWidth="2.5" />
          <circle cx="126" cy="80" r="12" fill="#D97706" stroke="#92400E" strokeWidth="2.5" />

          {/* Round face */}
          <circle cx="80" cy="82" r="46" fill="#FBBF24" stroke="#92400E" strokeWidth="3" />

          {/* Hair knot / Choti */}
          <circle cx="80" cy="26" r="12" fill="#0F172A" />
          <path d="M42 66 C42 36, 60 26, 80 26 C100 26, 118 36, 118 66 Z" fill="#0F172A" />

          {/* Red Tilak on Forehead */}
          <ellipse cx="80" cy="56" rx="4" ry="8" fill="#DC2626" />
          <circle cx="80" cy="68" r="2.5" fill="#F59E0B" />

          {/* Cheerful Eyes */}
          <ellipse cx="62" cy="78" rx="8" ry="11" fill="#0F172A" />
          <circle cx="64" cy="76" r="4" fill="#FFFFFF" />
          <ellipse cx="98" cy="78" rx="8" ry="11" fill="#0F172A" />
          <circle cx="100" cy="76" r="4" fill="#FFFFFF" />

          {/* Laddu in hand */}
          <g transform="translate(112, 98)">
            <circle cx="12" cy="12" r="13" fill="#EA580C" stroke="#C2410C" strokeWidth="2" />
            <circle cx="8" cy="9" r="2" fill="#FDE047" />
            <circle cx="14" cy="14" r="2" fill="#FDE047" />
          </g>

          {/* Big Confident Smile */}
          <path
            d="M66 96 Q80 114 94 96"
            stroke="#92400E"
            strokeWidth="3.5"
            fill={outcome === 'COMPLETE' ? '#DC2626' : 'none'}
            strokeLinecap="round"
          />
        </svg>
      </motion.div>
    </div>
  );
}
