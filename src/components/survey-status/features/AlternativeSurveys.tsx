'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Clock, Coins } from 'lucide-react';
import { soundFX } from '@/lib/survey/sound-fx';

interface AlternativeSurveysProps {
  accentColor: string;
}

const ALTERNATIVE_LIST = [
  {
    id: 'ALT-101',
    title: 'Digital Banking & UPI Habits',
    time: '6m',
    reward: '₹80 Instant',
    match: '98% Match',
  },
  {
    id: 'ALT-102',
    title: 'Streaming & Video Media',
    time: '8m',
    reward: '₹120 Instant',
    match: '95% Match',
  },
];

export function AlternativeSurveys({ accentColor }: AlternativeSurveysProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-2xl bg-white/95 backdrop-blur-xl p-3 sm:p-3.5 border border-white/95 shadow-sm flex flex-col gap-2"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <h3 className="text-xs font-extrabold text-slate-900 leading-tight">
            Active Alternative Surveys
          </h3>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.2 text-[9.5px] font-bold text-emerald-600 border border-emerald-200">
          Instant Match
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ALTERNATIVE_LIST.map((survey) => (
          <div
            key={survey.id}
            className="flex items-center justify-between gap-2 rounded-xl bg-slate-50/90 p-2 border border-slate-200/60 hover:bg-white hover:border-blue-300 transition-all"
          >
            <div className="flex flex-col min-w-0">
              <span className="truncate text-[11px] font-bold text-slate-900">
                {survey.title}
              </span>
              <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5 text-slate-400" />
                  {survey.time}
                </span>
                <span className="font-semibold text-emerald-700">
                  {survey.reward}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => soundFX.playClick()}
              className="inline-flex items-center justify-center shrink-0 rounded-lg px-2.5 py-1 text-[10.5px] font-bold text-white shadow-2xs transition-transform active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              <span>Enter</span>
              <ArrowRight className="h-3 w-3 ml-0.5" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
