import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday, 
  parse, 
  differenceInDays,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  addDays
} from 'date-fns';
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Droplets, Sparkles, Zap, Moon, Calendar as CalendarIcon, Info } from "lucide-react";
import { cn } from "../lib/utils";
import { getCyclePhase } from "../lib/gemini";
import { CyclePhase } from "../types";

interface CycleTrackerProps {
  cycleStartDate: string; // dd/MM/yyyy
  cycleLength: number;
}

const PHASE_COLORS: Record<CyclePhase, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  'Menstrual': { 
    bg: 'bg-rose-100', 
    text: 'text-rose-500', 
    border: 'border-rose-200',
    icon: <Droplets size={14} className="text-rose-500" />
  },
  'Follicular': { 
    bg: 'bg-sage-100', 
    text: 'text-sage-500', 
    border: 'border-sage-200',
    icon: <Zap size={14} className="text-sage-500" />
  },
  'Ovulation': { 
    bg: 'bg-gold-100', 
    text: 'text-gold-500', 
    border: 'border-gold-200',
    icon: <Sparkles size={14} className="text-gold-500" />
  },
  'Luteal': { 
    bg: 'bg-lavender-100', 
    text: 'text-lavender-500', 
    border: 'border-lavender-200',
    icon: <Moon size={14} className="text-lavender-500" />
  }
};

export function CycleTracker({ cycleStartDate, cycleLength }: CycleTrackerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();

  if (!cycleStartDate) {
    return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-300">
          <CalendarIcon size={32} />
        </div>
        <div>
          <h3 className="font-serif text-xl font-bold text-stone-800">Cycle Tracker</h3>
          <p className="text-sm text-stone-500 max-w-xs mx-auto mt-2">
            Set your last period start date in your profile to see your cycle phases and calendar.
          </p>
        </div>
      </div>
    );
  }

  const cycleInfo = getCyclePhase(cycleStartDate, cycleLength);
  const startDate = parse(cycleStartDate, 'dd/MM/yyyy', new Date());

  const getDayPhase = (date: Date): CyclePhase => {
    const diff = differenceInDays(date, startDate);
    // Handle dates before start date by going back cycles
    const day = ((diff % cycleLength) + cycleLength) % cycleLength + 1;
    
    if (day >= 1 && day <= 5) return 'Menstrual';
    if (day >= 6 && day <= 13) return 'Follicular';
    if (day >= 14 && day <= 16) return 'Ovulation';
    return 'Luteal';
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <h2 className="font-serif text-xl font-bold text-stone-800">
        {format(currentMonth, 'MMMM yyyy')}
      </h2>
      <div className="flex gap-2 items-center">
        <button 
          onClick={() => setCurrentMonth(new Date())}
          className="text-[10px] font-bold text-rose-400 uppercase tracking-widest px-3 py-1 bg-rose-50 rounded-full hover:bg-rose-100 transition-colors mr-2"
        >
          Today
        </button>
        <button 
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400"
        >
          <ChevronLeft size={20} />
        </button>
        <button 
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map(day => (
          <div key={day} className="text-center text-[10px] font-bold text-stone-400 uppercase tracking-widest py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDateCalendar = startOfWeek(monthStart);
    const endDateCalendar = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
      start: startDateCalendar,
      end: endDateCalendar,
    });

    return (
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          const phase = getDayPhase(day);
          const colors = PHASE_COLORS[phase];
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isTodayDate = isToday(day);

          return (
            <motion.div
              key={day.toString()}
              whileHover={{ scale: 1.05 }}
              className={cn(
                "relative h-12 md:h-16 rounded-xl flex flex-col items-center justify-center border transition-all cursor-default",
                !isCurrentMonth ? "opacity-20 grayscale" : "opacity-100",
                isTodayDate ? "ring-2 ring-rose-400 ring-offset-2 z-10" : "border-transparent",
                isCurrentMonth ? colors.bg : "bg-transparent"
              )}
            >
              <span className={cn(
                "text-xs font-bold",
                isCurrentMonth ? colors.text : "text-stone-300"
              )}>
                {format(day, 'd')}
              </span>
              {isCurrentMonth && (
                <div className="mt-1">
                  {colors.icon}
                </div>
              )}
              {isTodayDate && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-400 rounded-full border border-white" />
              )}
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Element */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cn(
          "col-span-1 md:col-span-2 p-6 rounded-[2rem] border shadow-sm flex flex-col justify-between relative overflow-hidden",
          PHASE_COLORS[cycleInfo.phase].bg,
          PHASE_COLORS[cycleInfo.phase].border
        )}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                {PHASE_COLORS[cycleInfo.phase].icon}
              </div>
              <span className={cn("text-xs font-bold uppercase tracking-widest", PHASE_COLORS[cycleInfo.phase].text)}>
                Current Phase
              </span>
            </div>
            <h3 className={cn("font-serif text-3xl font-bold mb-1", PHASE_COLORS[cycleInfo.phase].text)}>
              {cycleInfo.phase}
            </h3>
            <p className="text-stone-600 text-sm font-medium">
              Day {cycleInfo.day} of your {cycleLength} day cycle
            </p>
          </div>

          <div className="mt-6 relative z-10">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Next Phase</p>
                <p className="text-sm font-bold text-stone-700">
                  {cycleInfo.remainingInPhase === 0 ? "Starts tomorrow" : `In ${cycleInfo.remainingInPhase} days`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Progress</p>
                <p className="text-sm font-bold text-stone-700">{Math.round(cycleInfo.progress)}%</p>
              </div>
            </div>
            <div className="h-2 w-full bg-white/50 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${cycleInfo.progress}%` }}
                className={cn("h-full rounded-full", PHASE_COLORS[cycleInfo.phase].text.replace('text', 'bg'))}
              />
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col justify-center items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-400">
            <CalendarIcon size={32} />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Next Period</p>
            <p className="text-xl font-bold text-stone-800">
              {format(addDays(startDate, cycleLength), 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              {differenceInDays(addDays(startDate, cycleLength), today)} days to go
            </p>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm">
        {renderHeader()}
        {renderDays()}
        {renderCells()}

        <div className="mt-8 pt-6 border-t border-stone-50 grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.keys(PHASE_COLORS) as CyclePhase[]).map(phase => (
            <div key={phase} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", PHASE_COLORS[phase].bg)} />
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{phase}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Phase Info Card */}
      <div className="bg-sage-50 p-6 rounded-[2rem] border border-sage-100 flex gap-4 items-start">
        <div className="p-3 bg-white rounded-2xl text-sage-500 shadow-sm shrink-0">
          <Info size={20} />
        </div>
        <div>
          <h4 className="font-bold text-sage-800 text-sm mb-1">Phase Insight: {cycleInfo.phase}</h4>
          <p className="text-sage-600 text-xs leading-relaxed">
            {cycleInfo.phase === 'Menstrual' && "Your energy might be lower. Focus on rest, gentle movement, and iron-rich foods."}
            {cycleInfo.phase === 'Follicular' && "Energy is rising! Great time for strength training and trying new things."}
            {cycleInfo.phase === 'Ovulation' && "Peak energy and confidence. You're at your strongest—go for that personal best!"}
            {cycleInfo.phase === 'Luteal' && "Your body is slowing down. Focus on recovery, complex carbs, and self-care."}
          </p>
        </div>
      </div>
    </div>
  );
}
