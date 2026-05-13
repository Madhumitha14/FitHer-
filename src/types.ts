export type LifeStage = 'teen' | 'reproductive_age' | 'pregnancy' | 'postpartum' | 'perimenopause' | 'menopause';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type DietType = 'vegetarian' | 'non-vegetarian' | 'vegan' | 'eggetarian';
export type CuisinePreference = 'Indian' | 'South Indian' | 'North Indian' | 'Continental' | 'Mixed';
export type Goal = 'weight loss' | 'muscle tone' | 'energy & mood' | 'general wellness';
export type Mood = 'great' | 'okay' | 'tired' | 'stressed' | 'low';

export interface UserProfile {
  name?: string;
  age?: number;
  weight?: number; // kg
  height?: number; // cm
  life_stage?: LifeStage;
  fitness_level?: FitnessLevel;
  cycle_start_date?: string; // DD/MM/YYYY
  cycle_length?: number;
  diet_type?: DietType;
  cuisine_preference?: CuisinePreference;
  allergies?: string;
  pantry_items?: string;
  goal?: Goal;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface WorkoutHistoryItem {
  date: string;
  muscles: string[];
  duration: number;
  calories: number;
}

export type CyclePhase = 'Menstrual' | 'Follicular' | 'Ovulation' | 'Luteal';

export interface Exercise {
  name: string;
  type: string;
  sets: number | string;
  reps: number | string;
  rest: string;
  kcal: number;
  difficulty: number;
  muscles: string;
  tip: string;
  icon?: string;
  videoUrl?: string;
  muscleGroup?: string;
}

export interface DailyPlan {
  workout: {
    phase: CyclePhase;
    exercises?: Exercise[];
    warmup: string;
    cooldown: string;
    tip: string;
  };
  meals: {
    phase: CyclePhase;
    breakfast: { meal: string; why: string; cal: number };
    lunch: { meal: string; why: string; cal: number };
    dinner: { meal: string; why: string; cal: number };
    snacks: string[];
    hydration: string;
    missingLink?: string;
  };
  nudges: {
    morning: string;
    midday: string;
    evening: string;
  };
  focusWord: string;
}
