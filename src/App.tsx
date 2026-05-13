/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Calendar as CalendarIcon, 
  Utensils, 
  Dumbbell, 
  Heart, 
  ChevronRight,
  ChevronLeft,
  Home,
  BarChart2,
  CheckCircle2,
  Droplets,
  Flame,
  Clock,
  ArrowRight,
  MessageSquare,
  Mic,
  Volume2,
  VolumeX,
  Send,
  Share2,
  Trophy,
  History,
  Zap,
  Plus,
  X,
  Play,
  BookOpen,
  Moon,
  Brain,
  Activity,
  BarChart3,
  Menu,
  User
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, parse, differenceInDays } from 'date-fns';
import { cn } from "./lib/utils";
import { UserProfile, DailyPlan, CyclePhase, LifeStage, FitnessLevel, DietType, CuisinePreference, Goal, Mood, ChatMessage, Exercise, WorkoutHistoryItem } from "./types";
import { SYSTEM_INSTRUCTION, CHAT_SYSTEM_INSTRUCTION, getCyclePhase } from "./lib/gemini";
import { exerciseLibrary } from "./lib/exercises";
import { fitherKnowledgeBase } from "./lib/knowledgeBase";
import { CycleTracker } from "./components/CycleTracker";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function getYouTubeEmbedUrl(url: string) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?autoplay=1`;
  }
  return url;
}

export default function App() {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'home' | 'workout' | 'meals' | 'progress' | 'learn' | 'meditate' | 'sleep' | 'ai' | 'cycle'>('home');
  const [isLoading, setIsLoading] = useState(false);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    age: 25,
    weight: 60,
    height: 165,
    life_stage: 'reproductive_age',
    fitness_level: 'intermediate',
    cycle_start_date: '',
    cycle_length: 28,
    diet_type: 'vegetarian',
    cuisine_preference: 'Indian',
    allergies: 'none',
    pantry_items: '',
    goal: 'general wellness',
  });
  const [mood, setMood] = useState<Mood>('okay');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>([]);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [intensity, setIntensity] = useState(2); // 0: Rest, 1: Light, 2: Moderate, 3: Strong, 4: Beast
  const [isFocusOverridden, setIsFocusOverridden] = useState(false);
  const [showFocusPicker, setShowFocusPicker] = useState(false);
  const [exerciseReactions, setExerciseReactions] = useState<Record<string, string>>({});
  const [sleepLogs, setSleepLogs] = useState<{ date: string, bedtime: string, wakeTime: string, hours: number }[]>([]);
  const [streak, setStreak] = useState(12);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isNudgesLoading, setIsNudgesLoading] = useState(false);
  const [isWorkoutLoading, setIsWorkoutLoading] = useState(false);
  const [isMealsLoading, setIsMealsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedProfile = localStorage.getItem('fither_profile');
    if (savedProfile) {
      const parsedProfile = JSON.parse(savedProfile);
      setProfile(parsedProfile);
      setHasOnboarded(true);
      fetchDailyPlan(parsedProfile, mood);
    }

    const savedHistory = localStorage.getItem('fither_workout_history');
    if (savedHistory) {
      setWorkoutHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    if (profile.cycle_start_date) {
      const info = getCyclePhase(profile.cycle_start_date, profile.cycle_length);
      let suggestedIntensity = 2;
      
      if (info.phase === 'Menstrual') {
        suggestedIntensity = mood === 'tired' || mood === 'low' ? 0 : 1;
      } else if (info.phase === 'Follicular') {
        suggestedIntensity = mood === 'great' ? 3 : 2;
      } else if (info.phase === 'Ovulation') {
        suggestedIntensity = mood === 'great' ? 4 : 3;
      } else if (info.phase === 'Luteal') {
        suggestedIntensity = mood === 'stressed' ? 1 : 2;
      }
      
      setIntensity(suggestedIntensity);
    }
  }, [profile.cycle_start_date, profile.cycle_length, mood]);

  const logWorkout = (muscles: string[], duration: number, calories: number) => {
    const newItem: WorkoutHistoryItem = {
      date: new Date().toISOString(),
      muscles,
      duration,
      calories
    };
    const updatedHistory = [newItem, ...workoutHistory].slice(0, 7);
    setWorkoutHistory(updatedHistory);
    localStorage.setItem('fither_workout_history', JSON.stringify(updatedHistory));
    setCompletedExercises([]);
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.rate = 0.9;
    utterance.pitch = 1.1; // Slightly warmer/higher pitch
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
        handleSendChatMessage(transcript);
      };

      recognition.start();
    } catch (e) {
      console.error("Speech recognition start error:", e);
      setIsListening(false);
    }
  };

  const handleSendChatMessage = async (text: string) => {
    const messageText = text || chatInput;
    if (!messageText.trim() || isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: messageText, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: { systemInstruction: CHAT_SYSTEM_INSTRUCTION },
        history: chatMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
      });

      const result = await chat.sendMessage({ message: messageText });
      const modelMsg: ChatMessage = { role: 'model', text: result.text || "...", timestamp: Date.now() };
      setChatMessages(prev => [...prev, modelMsg]);
      
      // Auto-speak if it's a short motivational message or if user is in voice mode
      if (modelMsg.text.length < 200) {
        speak(modelMsg.text);
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchDailyPlan = async (currentProfile: UserProfile, currentMood: Mood, forceRefresh = false) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const cacheKey = `fither_daily_plan_${today}`;
    
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setDailyPlan(JSON.parse(cached));
        setLoadingProgress(100);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setLoadingProgress(0);
    
    // Step 1: Instant local data
    const cycleInfo = getCyclePhase(currentProfile.cycle_start_date, currentProfile.cycle_length);
    const initialPlan: DailyPlan = {
      workout: { phase: cycleInfo.phase, exercises: [], warmup: '', cooldown: '', tip: '' },
      meals: { phase: cycleInfo.phase, breakfast: { meal: '', why: '', cal: 0 }, lunch: { meal: '', why: '', cal: 0 }, dinner: { meal: '', why: '', cal: 0 }, snacks: [], hydration: '' },
      nudges: { morning: '', midday: '', evening: '' },
      focusWord: ''
    };
    setDailyPlan(initialPlan);

    // Step 2: Nudges (Fastest)
    setIsNudgesLoading(true);
    let updatedPlan = { ...initialPlan };
    try {
      const nudgesPrompt = `Give 3 short one-line motivational nudges for a woman in ${cycleInfo.phase} phase feeling ${currentMood}. Respond in JSON only. No markdown. No explanation. No preamble. First token must be {
      Format: {"morning": "string", "midday": "string", "evening": "string", "focusWord": "string"}`;
      
      const nudgesResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: nudgesPrompt,
        config: { responseMimeType: "application/json" },
      });
      const nudgesData = JSON.parse(nudgesResponse.text || '{}');
      updatedPlan = { ...updatedPlan, nudges: nudgesData, focusWord: nudgesData.focusWord };
      setDailyPlan({ ...updatedPlan });
      setLoadingProgress(33);
    } catch (e) { console.error("Nudges error:", e); }
    setIsNudgesLoading(false);

    // Step 3: Workout
    setIsWorkoutLoading(true);
    try {
      const workoutPrompt = `Give 4 exercises for ${cycleInfo.phase} phase, ${intensity <= 1 ? 'Light' : 'Moderate'} intensity. Respond in JSON only. No markdown. No explanation. No preamble. First token must be {
      Format: {"exercises": [{"name": "string", "sets": "string", "reps": "string", "kcal": number, "difficulty": number, "muscles": "string", "tip": "string"}], "warmup": "string", "cooldown": "string", "tip": "string"}`;
      
      const workoutResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: workoutPrompt,
        config: { responseMimeType: "application/json" },
      });
      const workoutData = JSON.parse(workoutResponse.text || '{}');
      updatedPlan = { ...updatedPlan, workout: { ...updatedPlan.workout, ...workoutData } };
      setDailyPlan({ ...updatedPlan });
      setLoadingProgress(66);
    } catch (e) { console.error("Workout error:", e); }
    setIsWorkoutLoading(false);

    // Step 4: Meals (Longest)
    setIsMealsLoading(true);
    try {
      const mealsPrompt = `Generate a meal plan for a woman in ${cycleInfo.phase} phase with ${currentProfile.diet_type} diet. Respond in JSON only. No markdown. No explanation. No preamble. First token must be {
      Format: {"breakfast": {"meal": "string", "why": "string", "cal": number}, "lunch": {"meal": "string", "why": "string", "cal": number}, "dinner": {"meal": "string", "why": "string", "cal": number}, "snacks": ["string"], "hydration": "string"}`;
      
      const mealsResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: mealsPrompt,
        config: { responseMimeType: "application/json" },
      });
      const mealsData = JSON.parse(mealsResponse.text || '{}');
      const finalPlan = { ...updatedPlan, meals: { ...updatedPlan.meals, ...mealsData } };
      setDailyPlan(finalPlan);
      localStorage.setItem(cacheKey, JSON.stringify(finalPlan));
      setLoadingProgress(100);
    } catch (e) { console.error("Meals error:", e); }
    setIsMealsLoading(false);
    setIsLoading(false);
  };

  const handleOnboardingComplete = () => {
    setHasOnboarded(true);
    localStorage.setItem('fither_profile', JSON.stringify(profile));
    fetchDailyPlan(profile, mood);
  };

  if (!hasOnboarded) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl shadow-rose-100/50 overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[700px]">
          <div className="hidden md:flex md:w-1/3 bg-rose-300 p-12 flex-col justify-between text-white relative overflow-hidden">
            <div className="relative z-10">
              <Sparkles className="mb-6 opacity-80" size={40} />
              <h1 className="font-serif text-4xl font-bold leading-tight mb-4">Your Wellness Journey Starts Here</h1>
              <p className="text-rose-50 opacity-90 leading-relaxed">Personalized wellness, synced with your unique rhythm.</p>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-sm font-bold uppercase tracking-widest opacity-80">
              <Heart size={16} />
              <span>FitHer Companion</span>
            </div>
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          </div>
          <div className="flex-1 overflow-y-auto">
            <Onboarding 
              step={onboardingStep} 
              setStep={setOnboardingStep} 
              profile={profile} 
              setProfile={setProfile}
              mood={mood}
              setMood={setMood}
              onComplete={handleOnboardingComplete}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-cream-50 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-white border-r border-stone-100 flex flex-col p-8 z-50 transition-transform duration-300 md:relative md:translate-x-0 md:flex",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-400 flex items-center justify-center text-white shadow-lg shadow-rose-100">
              <Sparkles size={20} />
            </div>
            <h1 className="font-serif text-2xl font-bold text-stone-800">FitHer</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-stone-400 hover:bg-stone-50 rounded-xl">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto scrollbar-hide">
          <SidebarLink icon={<Home size={20} />} label="Dashboard" active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setIsSidebarOpen(false); }} />
          <SidebarLink icon={<Droplets size={20} />} label="Cycle Tracker" active={activeTab === 'cycle'} onClick={() => { setActiveTab('cycle'); setIsSidebarOpen(false); }} />
          <SidebarLink icon={<Dumbbell size={20} />} label="Workouts" active={activeTab === 'workout'} onClick={() => { setActiveTab('workout'); setIsSidebarOpen(false); }} />
          <SidebarLink icon={<Utensils size={20} />} label="Nutrition" active={activeTab === 'meals'} onClick={() => { setActiveTab('meals'); setIsSidebarOpen(false); }} />
          <SidebarLink icon={<BookOpen size={20} />} label="Learn" active={activeTab === 'learn'} onClick={() => { setActiveTab('learn'); setIsSidebarOpen(false); }} />
          <SidebarLink icon={<Brain size={20} />} label="Meditate" active={activeTab === 'meditate'} onClick={() => { setActiveTab('meditate'); setIsSidebarOpen(false); }} />
          <SidebarLink icon={<Moon size={20} />} label="Sleep" active={activeTab === 'sleep'} onClick={() => { setActiveTab('sleep'); setIsSidebarOpen(false); }} />
          <SidebarLink icon={<MessageSquare size={20} />} label="Safe Space AI" active={activeTab === 'ai'} onClick={() => { setActiveTab('ai'); setIsSidebarOpen(false); }} />
          <SidebarLink icon={<BarChart3 size={20} />} label="Progress" active={activeTab === 'progress'} onClick={() => { setActiveTab('progress'); setIsSidebarOpen(false); }} />
        </nav>

        <div className="mt-auto p-4 bg-rose-50 rounded-3xl border border-rose-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-rose-400 shadow-sm">
              <Droplets size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Current Phase</p>
              <p className="text-xs font-bold text-stone-700">{dailyPlan?.workout.phase || '...'}</p>
            </div>
          </div>
          <p className="text-[10px] text-rose-300 font-medium leading-relaxed">Your body is preparing for its next cycle. Stay hydrated!</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        {isLoading && <ProgressBar progress={loadingProgress} />}
        
        {/* Top Navigation Bar */}
        <header className="px-6 md:px-12 py-4 bg-white/80 backdrop-blur-md border-b border-stone-100 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-stone-500 hover:bg-stone-50 rounded-xl md:hidden"
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:block">
              <h2 className="font-serif text-xl font-bold text-stone-800 capitalize">{activeTab === 'ai' ? 'Safe Space AI' : activeTab}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-bold text-stone-800">{profile.name || 'User'}</span>
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                {dailyPlan?.workout.phase || '...'} Phase
              </span>
            </div>
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-rose-100 border-2 border-white shadow-sm flex items-center justify-center text-rose-400 overflow-hidden relative group cursor-pointer">
              <User size={22} />
              <div className="absolute inset-0 bg-rose-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-6 md:px-12 py-8 space-y-8 scrollbar-hide pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto">
            {/* Greeting Header (Integrated into content) */}
            <div className="mb-8">
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-stone-800 truncate">Hello, {profile.name}</h1>
              <p className="text-sm text-stone-500 font-medium mt-1">
                {dailyPlan ? getGreetingSubtitle(dailyPlan.workout.phase) : (profile.cycle_start_date ? getGreetingSubtitle(getCyclePhase(profile.cycle_start_date, profile.cycle_length).phase) : "Welcome back to your wellness journey")}
              </p>
            </div>
            {activeTab === 'home' && (
              <Dashboard 
                plan={dailyPlan} 
                isLoading={isLoading} 
                onRefresh={() => fetchDailyPlan(profile, mood, true)} 
                profile={profile}
                setActiveTab={setActiveTab}
                completedExercises={completedExercises}
                isNudgesLoading={isNudgesLoading}
                isWorkoutLoading={isWorkoutLoading}
                isMealsLoading={isMealsLoading}
              />
            )}
            {activeTab === 'cycle' && (
              <div className="space-y-8">
                <h2 className="font-serif text-3xl font-bold text-stone-800">Your Cycle</h2>
                <CycleTracker 
                  cycleStartDate={profile.cycle_start_date || ''} 
                  cycleLength={profile.cycle_length || 28} 
                />
              </div>
            )}
            {activeTab === 'workout' && (
              <WorkoutTab 
                plan={dailyPlan} 
                history={workoutHistory}
                completed={completedExercises}
                setCompleted={setCompletedExercises}
                selectedMuscles={selectedMuscles}
                setSelectedMuscles={setSelectedMuscles}
                intensity={intensity}
                setIntensity={setIntensity}
                isFocusOverridden={isFocusOverridden}
                setIsFocusOverridden={setIsFocusOverridden}
                showFocusPicker={showFocusPicker}
                setShowFocusPicker={setShowFocusPicker}
                exerciseReactions={exerciseReactions}
                setExerciseReactions={setExerciseReactions}
                onLog={logWorkout}
              />
            )}
            {activeTab === 'meals' && <MealsTab plan={dailyPlan} />}
            {activeTab === 'learn' && <LearnTab profile={profile} />}
            {activeTab === 'meditate' && <MeditateTab profile={profile} />}
            {activeTab === 'sleep' && <SleepTab profile={profile} logs={sleepLogs} setLogs={setSleepLogs} />}
            {activeTab === 'ai' && (
              <SafeSpaceTab 
                profile={profile} 
                speak={speak} 
                isSpeaking={isSpeaking}
                isMuted={isMuted}
                setIsMuted={setIsMuted}
              />
            )}
            {activeTab === 'progress' && <ProgressTab profile={profile} />}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-stone-100 px-6 py-4 flex justify-between items-center z-20 overflow-x-auto scrollbar-hide">
          <NavButton icon={<Home size={22} />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavButton icon={<Droplets size={22} />} label="Cycle" active={activeTab === 'cycle'} onClick={() => setActiveTab('cycle')} />
          <NavButton icon={<Dumbbell size={22} />} label="Workout" active={activeTab === 'workout'} onClick={() => setActiveTab('workout')} />
          <NavButton icon={<Utensils size={22} />} label="Meals" active={activeTab === 'meals'} onClick={() => setActiveTab('meals')} />
          <NavButton icon={<Brain size={22} />} label="Zen" active={activeTab === 'meditate'} onClick={() => setActiveTab('meditate')} />
          <NavButton icon={<BarChart3 size={22} />} label="Stats" active={activeTab === 'progress'} onClick={() => setActiveTab('progress')} />
        </nav>

        {/* Floating Chat Button */}
        <button 
          onClick={() => setIsChatOpen(true)}
          className="absolute bottom-24 md:bottom-8 right-6 w-14 h-14 bg-rose-400 text-white rounded-full shadow-lg shadow-rose-200 flex items-center justify-center active:scale-95 transition-all z-30"
        >
          <MessageSquare size={24} />
        </button>
      </div>

      {/* Chat Overlay */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="absolute inset-y-0 right-0 w-full md:w-96 z-50 bg-cream-50 flex flex-col shadow-2xl border-l border-stone-100"
          >
            <header className="px-6 py-4 bg-white border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-500">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-stone-800">FitHer Assistant</h2>
                  <p className="text-[10px] text-sage-500 font-bold uppercase tracking-widest">Always Listening</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
              {chatMessages.length === 0 && (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-300">
                    <Heart size={32} />
                  </div>
                  <p className="text-stone-500 text-sm italic px-8">
                    "I'm here to listen, motivate, and guide you. How can I support you today?"
                  </p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-rose-400 text-white rounded-tr-none" 
                      : "bg-white text-stone-700 rounded-tl-none border border-stone-100 shadow-sm"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-stone-100 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-rose-200 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-rose-200 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-rose-200 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <footer className="p-6 bg-white border-t border-stone-100">
              <div className="flex items-center gap-3">
                <button 
                  onClick={toggleListening}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                    isListening ? "bg-rose-400 text-white animate-pulse" : "bg-stone-50 text-stone-400"
                  )}
                >
                  <Mic size={20} />
                </button>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage('')}
                    placeholder="Ask me anything..."
                    className="w-full bg-stone-50 border-none rounded-2xl px-5 py-3.5 text-sm text-stone-700 focus:ring-2 focus:ring-rose-100 outline-none"
                  />
                  <button 
                    onClick={() => handleSendChatMessage('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-300 hover:text-rose-400"
                  >
                    <Send size={18} />
                  </button>
                </div>
                <button 
                  onClick={() => speak(chatMessages[chatMessages.length - 1]?.text || "I'm here for you.")}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                    isSpeaking ? "bg-sage-100 text-sage-500" : "bg-stone-50 text-stone-400"
                  )}
                >
                  {isSpeaking ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Components ---

function Onboarding({ step, setStep, profile, setProfile, mood, setMood, onComplete }: any) {
  const totalSteps = 5;

  const updateProfile = (field: string, value: any) => {
    setProfile((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col h-full bg-white p-8 md:p-12 font-sans overflow-y-auto">
      {/* Progress Bar */}
      <div className="flex items-center gap-2 mb-12">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-500",
              i + 1 <= step ? "bg-rose-300" : "bg-stone-200"
            )} 
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 space-y-8"
        >
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-serif text-3xl font-bold text-stone-800 leading-tight">Let's get to know you better</h2>
              <div className="space-y-4">
                <Input label="What's your name?" value={profile.name} onChange={(v) => updateProfile('name', v)} placeholder="E.g. Maya" />
                <div className="grid grid-cols-3 gap-4">
                  <Input label="Age" type="number" value={profile.age} onChange={(v) => updateProfile('age', Number(v))} />
                  <Input label="Weight (kg)" type="number" value={profile.weight} onChange={(v) => updateProfile('weight', Number(v))} />
                  <Input label="Height (cm)" type="number" value={profile.height} onChange={(v) => updateProfile('height', Number(v))} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-serif text-3xl font-bold text-stone-800">Your Cycle & Life Stage</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Last period start date</label>
                  <CalendarPicker 
                    value={profile.cycle_start_date} 
                    onChange={(v: string) => updateProfile('cycle_start_date', v)} 
                  />
                </div>
                <Input label="Typical cycle length (days)" type="number" value={profile.cycle_length} onChange={(v) => updateProfile('cycle_length', Number(v))} />
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Life Stage (if known)</label>
                  <div className="flex flex-wrap gap-2">
                    {['teen', 'reproductive_age', 'pregnancy', 'postpartum', 'perimenopause', 'menopause'].map((s) => (
                      <PillButton 
                        key={s} 
                        label={s.replace('_', ' ')} 
                        active={profile.life_stage === s} 
                        onClick={() => updateProfile('life_stage', s)} 
                      />
                    ))}
                  </div>
                </div>

                {profile.cycle_start_date && (
                  <div className="pt-4 border-t border-stone-50">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">Preview</p>
                    <div className="scale-90 origin-top">
                      <CycleTracker 
                        cycleStartDate={profile.cycle_start_date} 
                        cycleLength={profile.cycle_length || 28} 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="font-serif text-3xl font-bold text-stone-800">Diet & Preferences</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Diet Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['vegetarian', 'non-vegetarian', 'vegan', 'eggetarian'].map((d) => (
                      <SelectionCard 
                        key={d} 
                        label={d} 
                        active={profile.diet_type === d} 
                        onClick={() => updateProfile('diet_type', d)} 
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Cuisine</label>
                  <div className="flex flex-wrap gap-2">
                    {['Indian', 'South Indian', 'North Indian', 'Continental', 'Mixed'].map((c) => (
                      <PillButton 
                        key={c} 
                        label={c} 
                        active={profile.cuisine_preference === c} 
                        onClick={() => updateProfile('cuisine_preference', c)} 
                      />
                    ))}
                  </div>
                </div>
                <Input label="Allergies" value={profile.allergies} onChange={(v) => updateProfile('allergies', v)} placeholder="E.g. Nuts, Dairy or 'none'" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="font-serif text-3xl font-bold text-stone-800">Fitness & Goals</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Fitness Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['beginner', 'intermediate', 'advanced'].map((l) => (
                      <SelectionCard 
                        key={l} 
                        label={l} 
                        active={profile.fitness_level === l} 
                        onClick={() => updateProfile('fitness_level', l)} 
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Fitness Goal</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['weight loss', 'muscle tone', 'energy & mood', 'general wellness'].map((g) => (
                      <SelectionCard 
                        key={g} 
                        label={g} 
                        active={profile.goal === g} 
                        onClick={() => updateProfile('goal', g)} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 text-center">
              <h2 className="font-serif text-3xl font-bold text-stone-800">How are you feeling today?</h2>
              <div className="grid grid-cols-5 gap-2 pt-4">
                {[
                  { m: 'great', e: '😄' },
                  { m: 'okay', e: '😊' },
                  { m: 'tired', e: '😴' },
                  { m: 'stressed', e: '😰' },
                  { m: 'low', e: '😔' }
                ].map(({ m, e }) => (
                  <button 
                    key={m} 
                    onClick={() => setMood(m as Mood)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all",
                      mood === m ? "bg-rose-100 scale-110 shadow-sm" : "bg-white grayscale opacity-50"
                    )}
                  >
                    <span className="text-3xl">{e}</span>
                    <span className="text-[10px] font-bold uppercase text-stone-500">{m}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-12 flex items-center justify-between">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 text-stone-400 font-bold text-sm">
            <ChevronLeft size={18} />
            <span>Back</span>
          </button>
        ) : <div />}
        
        <button 
          onClick={() => step < totalSteps ? setStep(step + 1) : onComplete()}
          className="bg-rose-300 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-rose-100 flex items-center gap-2 active:scale-95 transition-all"
        >
          <span>{step === totalSteps ? "Let's go!" : "Next"}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

function Dashboard({ plan, isLoading, onRefresh, profile, setActiveTab, completedExercises, isNudgesLoading, isWorkoutLoading, isMealsLoading }: any) {
  const cycleInfo = profile.cycle_start_date ? getCyclePhase(profile.cycle_start_date, profile.cycle_length) : null;
  const isWorkoutDone = completedExercises.length > 0;

  return (
    <div className="space-y-8">
      {/* Stat Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatPill icon={<Flame size={16} />} label="Calories" value="1,450" unit="kcal" color="rose" />
        <StatPill icon={<Activity size={16} />} label="Protein" value="65" unit="g" color="sage" />
        <StatPill icon={<Droplets size={16} />} label="Water" value="6" unit="glasses" color="blue" />
        <StatPill 
          icon={isWorkoutDone ? <CheckCircle2 size={16} /> : <Dumbbell size={16} />} 
          label="Workout" 
          value={isWorkoutDone ? "Done ✓" : "Pending"} 
          color={isWorkoutDone ? "sage" : "amber"} 
        />
      </div>

      {/* Cycle Tracker */}
      <CycleTracker 
        cycleStartDate={profile.cycle_start_date || ''} 
        cycleLength={profile.cycle_length || 28} 
      />

      {/* Desktop Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 h-[450px]">
          {isWorkoutLoading || !plan?.workout?.exercises?.length ? <SkeletonCard /> : <WorkoutCard data={plan?.workout} />}
        </div>
        <div className="lg:col-span-1 h-[450px]">
          {isMealsLoading || !plan?.meals?.breakfast?.meal ? <SkeletonCard /> : <MealsCard data={plan?.meals} />}
        </div>
        <div className="lg:col-span-1 h-[450px]">
          {isNudgesLoading || !plan?.nudges?.morning ? <SkeletonCard /> : <NudgesCard data={plan?.nudges} />}
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <QuickAccessCard 
          icon={<Brain size={24} />} 
          label="Meditate" 
          description="Calm your mind for 5 mins" 
          color="rose"
          onClick={() => setActiveTab('meditate')}
        />
        <QuickAccessCard 
          icon={<Moon size={24} />} 
          label="Sleep Tracker" 
          description="Log your rest tonight" 
          color="sage"
          onClick={() => setActiveTab('sleep')}
        />
        <QuickAccessCard 
          icon={<MessageSquare size={24} />} 
          label="Safe Space AI" 
          description="A warm place to talk" 
          color="blue"
          onClick={() => setActiveTab('ai')}
        />
      </div>

      {/* Refresh Button */}
      {!isLoading && (
        <div className="flex justify-center pt-8">
          <button 
            onClick={onRefresh}
            className="flex items-center gap-2 text-stone-400 hover:text-rose-400 transition-colors text-[10px] font-bold uppercase tracking-[0.2em]"
          >
            <Zap size={14} />
            <span>Refresh my plan</span>
          </button>
        </div>
      )}
    </div>
  );
}

function SkeletonCard({ height = "450px" }: { height?: string }) {
  return (
    <div 
      style={{ height }}
      className="w-full bg-stone-100 rounded-[2.5rem] animate-skeleton-pulse"
    />
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] bg-rose-50 z-[100]">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        className="h-full bg-rose-300 transition-all duration-500"
      />
    </div>
  );
}

function StatPill({ icon, label, value, unit, color }: any) {
  const colors: any = {
    rose: "bg-rose-50 text-rose-500 border-rose-100",
    sage: "bg-sage-50 text-sage-600 border-sage-100",
    blue: "bg-blue-50 text-blue-500 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100"
  };

  return (
    <div className={cn("flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-sm", colors[color])}>
      <div className="flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 truncate">{label}</p>
        <p className="text-sm font-bold truncate">
          {value} <span className="text-[10px] font-normal opacity-70">{unit}</span>
        </p>
      </div>
    </div>
  );
}

function QuickAccessCard({ icon, label, description, color, onClick }: any) {
  const colors: any = {
    rose: "bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100",
    sage: "bg-sage-50 text-sage-600 border-sage-100 hover:bg-sage-200",
    blue: "bg-blue-50 text-blue-500 border-blue-100 hover:bg-blue-100"
  };

  return (
    <button 
      onClick={onClick}
      className={cn("p-6 rounded-[2rem] border text-left transition-all group flex flex-col gap-4", colors[color])}
    >
      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-stone-800">{label}</h4>
        <p className="text-xs text-stone-500 mt-1">{description}</p>
      </div>
    </button>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: any = {
    orange: "bg-orange-50 text-orange-400",
    blue: "bg-blue-50 text-blue-400",
    purple: "bg-purple-50 text-purple-400",
    rose: "bg-rose-50 text-rose-400"
  };

  return (
    <div className="p-6 bg-white rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", colors[color])}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{label}</p>
        <p className="font-bold text-stone-700 text-lg">{value}</p>
      </div>
    </div>
  );
}

// Local CycleTracker removed

function WorkoutCard({ data }: any) {
  const currentPhase = data?.phase || 'Follicular';
  
  // Pick some recommended exercises from library if AI didn't provide any
  const getRecommended = () => {
    if (data?.exercises && data.exercises.length > 0) return data.exercises;
    
    // Fallback: pick 3 from Full Body
    const fullBody = exerciseLibrary.fullbody;
    return fullBody.slice(0, 3);
  };

  const exercises = getRecommended();

  return (
    <div className="h-full bg-sage-50 rounded-[2.5rem] p-8 border border-sage-100 shadow-sm flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-sage-300 flex items-center justify-center text-white shadow-lg shadow-sage-100">
          <Dumbbell size={24} />
        </div>
        <div>
          <h3 className="font-serif text-xl font-bold text-sage-900">Today's Workout</h3>
          <p className="text-xs text-sage-600 font-medium">{currentPhase} Phase Focus</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide">
        {exercises.map((ex: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-3 bg-white/50 rounded-2xl border border-sage-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sage-100 flex items-center justify-center text-sage-500">
                <Sparkles size={16} />
              </div>
              <span className="text-sm font-bold text-stone-700">{ex.name}</span>
            </div>
            <div className="flex gap-1">
              {ex.sets && <span className="text-[10px] px-2 py-0.5 bg-sage-200 text-sage-700 rounded-full font-bold">{ex.sets} Sets</span>}
              {ex.reps && <span className="text-[10px] px-2 py-0.5 bg-sage-200 text-sage-700 rounded-full font-bold">{ex.reps} Reps</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-white/80 rounded-2xl border border-sage-100">
        <p className="text-xs italic text-sage-700 leading-relaxed">💡 {data?.tip || "Focus on consistency and listen to your body today."}</p>
      </div>
    </div>
  );
}

function MealsCard({ data }: any) {
  return (
    <div className="h-full bg-rose-50 rounded-[2.5rem] p-8 border border-rose-100 shadow-sm flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-rose-300 flex items-center justify-center text-white shadow-lg shadow-rose-100">
          <Utensils size={24} />
        </div>
        <div>
          <h3 className="font-serif text-xl font-bold text-rose-900">Nourishment</h3>
          <p className="text-xs text-rose-600 font-medium">Cycle-Synced Nutrition</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto scrollbar-hide">
        <MealRow label="Breakfast" meal={data?.breakfast.meal} cal={data?.breakfast.cal} />
        <MealRow label="Lunch" meal={data?.lunch.meal} cal={data?.lunch.cal} />
        <MealRow label="Dinner" meal={data?.dinner.meal} cal={data?.dinner.cal} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {data?.snacks.map((s: string, i: number) => (
          <span key={i} className="text-[10px] px-3 py-1 bg-white text-rose-400 rounded-full font-bold border border-rose-100">🍎 {s}</span>
        ))}
      </div>
    </div>
  );
}

function MealRow({ label, meal, cal }: any) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white/50 rounded-2xl border border-rose-100 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-rose-300 uppercase tracking-widest">{label}</span>
          <span className="text-sm font-bold text-stone-700">{meal}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-500 rounded-full font-bold">{cal} kcal</span>
      </button>
    </div>
  );
}

function NudgesCard({ data }: any) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className="h-full bg-cream-100 rounded-[2.5rem] p-8 border border-cream-200 shadow-sm flex flex-col relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-200/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cream-300/20 rounded-full blur-3xl" />

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cream-200 flex items-center justify-center text-rose-400 shadow-lg shadow-cream-100">
            <Heart size={24} />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-800">Mindset</h3>
            <p className="text-xs text-stone-500 font-medium">Daily Reflection</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-rose-300 uppercase tracking-[0.2em] mb-1">Focus</p>
          <p className="font-serif text-xl font-bold text-stone-800">{data?.focusWord}</p>
        </div>
      </div>

      <div className="flex-1 space-y-6 relative z-10">
        {/* Daily Nudge - Interactive Reveal */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-1">Today's Nudge</p>
          <div 
            onClick={() => setIsRevealed(true)}
            className={cn(
              "p-6 rounded-3xl border transition-all duration-500 cursor-pointer group relative overflow-hidden",
              isRevealed 
                ? "bg-white border-cream-200 shadow-sm" 
                : "bg-rose-400 border-rose-500 shadow-lg shadow-rose-100 hover:scale-[1.02]"
            )}
          >
            {!isRevealed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-2">
                <Sparkles size={24} className="animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest">Tap to Reveal</span>
              </div>
            )}
            <p className={cn(
              "text-sm leading-relaxed font-medium transition-all duration-500",
              isRevealed ? "text-stone-700 opacity-100" : "text-white opacity-0 blur-sm"
            )}>
              {data?.daily}
            </p>
          </div>
        </div>

        {/* Mindset Exercise */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-1">Mindfulness Moment</p>
          <div className="p-6 bg-white/60 backdrop-blur-sm rounded-3xl border border-cream-200 shadow-sm flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-cream-100 flex-shrink-0 flex items-center justify-center text-rose-300">
              <Sparkles size={20} />
            </div>
            <p className="text-xs text-stone-600 leading-relaxed italic">
              "{data?.mindset}"
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-cream-200/50 flex items-center justify-between relative z-10">
        <div className="flex -space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-8 h-8 rounded-full border-2 border-cream-100 bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-400">
              {String.fromCharCode(64 + i)}
            </div>
          ))}
        </div>
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">1.2k others reflecting</p>
      </div>
    </div>
  );
}

function NudgeItem({ label, text }: any) {
  return (
    <div className="p-4 bg-white/80 rounded-2xl border border-cream-200 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-rose-200" />
      <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">{label}</p>
      <p className="text-xs text-stone-700 leading-relaxed font-medium">{text}</p>
    </div>
  );
}

function WorkoutTab({ 
  plan, 
  history, 
  completed, 
  setCompleted, 
  selectedMuscles, 
  setSelectedMuscles, 
  intensity, 
  setIntensity,
  isFocusOverridden,
  setIsFocusOverridden,
  showFocusPicker,
  setShowFocusPicker,
  exerciseReactions,
  setExerciseReactions,
  onLog
}: any) {
  const [activeVideo, setActiveVideo] = useState<{ url: string, muscle: string } | null>(null);
  const muscleGroups = [
    { label: 'Arms', icon: '💪' },
    { label: 'Legs', icon: '🦵' },
    { label: 'Back', icon: '🔙' },
    { label: 'Chest', icon: '🫀' },
    { label: 'Core', icon: '🧘' },
    { label: 'Full Body', icon: '🌀' },
    { label: 'Glutes', icon: '🦋' }
  ];

  const toggleMuscle = (muscle: string) => {
    setSelectedMuscles((prev: string[]) => 
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    );
  };

  const currentPhase = plan?.workout.phase || 'Follicular';

  const getAutoFocus = () => {
    const allMuscles = ['Arms', 'Legs', 'Back', 'Chest', 'Core', 'Glutes'];
    const recentlyTrained = new Set(history.slice(0, 3).flatMap((h: any) => h.muscles));
    const missing = allMuscles.filter(m => !recentlyTrained.has(m));
    
    // Pick 2 muscles that haven't been trained recently
    const selected = missing.length >= 2 ? missing.slice(0, 2) : [...missing, ...allMuscles.filter(m => !missing.includes(m))].slice(0, 2);
    
    let suggestedIntensity = 2;
    let reason = "Based on your training history";

    if (currentPhase === 'Menstrual') {
      suggestedIntensity = 1;
      reason = "Based on your Menstrual phase + no recent training history";
    } else if (currentPhase === 'Luteal') {
      suggestedIntensity = 1;
      reason = "Based on your Luteal phase (lower energy)";
    } else if (currentPhase === 'Ovulation') {
      suggestedIntensity = 3;
      reason = "Based on your Ovulation peak energy";
    }

    return { muscles: selected, intensity: suggestedIntensity, reason };
  };

  const autoFocus = getAutoFocus();
  const activeMuscles = isFocusOverridden ? selectedMuscles : autoFocus.muscles;
  const activeIntensity = isFocusOverridden ? intensity : autoFocus.intensity;

  const getSortedExercises = () => {
    let exercises: any[] = [];
    
    activeMuscles.forEach(m => {
      const key = m.toLowerCase().replace(' ', '') as keyof typeof exerciseLibrary;
      if (exerciseLibrary[key]) {
        exercises = [...exercises, ...exerciseLibrary[key].map(ex => ({ ...ex, category: key }))];
      }
    });

    // Filter by type based on phase
    const filtered = exercises.filter(ex => {
      const type = ex.type.toLowerCase();
      if (currentPhase === 'Menstrual') {
        return type === 'flexibility' || type === 'mobility';
      } else if (currentPhase === 'Follicular') {
        return type === 'strength';
      } else if (currentPhase === 'Ovulation') {
        return type === 'strength' || type === 'cardio';
      } else if (currentPhase === 'Luteal') {
        return type === 'mobility' || (type === 'strength' && ex.difficulty === 1);
      }
      return true;
    });

    return filtered;
  };

  const filteredExercises = getSortedExercises();

  const totalKcal = filteredExercises.reduce((acc, ex) => {
    return completed.includes(ex.name) ? acc + ex.kcal : acc;
  }, 0);

  const isAllDone = filteredExercises.length > 0 && filteredExercises.every((ex: any) => completed.includes(ex.name));

  const lastTrained = history.length > 0 ? history[0] : null;
  const daysSinceLast = lastTrained ? differenceInDays(new Date(), new Date(lastTrained.date)) : null;

  const getRecommendation = () => {
    const allMuscles = ['Arms', 'Legs', 'Back', 'Chest', 'Core', 'Glutes'];
    const recentlyTrained = new Set(history.flatMap((h: any) => h.muscles));
    const missing = allMuscles.find(m => !recentlyTrained.has(m));
    if (missing) {
      const lastTime = history.find((h: any) => h.muscles.includes(missing));
      const days = lastTime ? differenceInDays(new Date(), new Date(lastTime.date)) : 'many';
      return { muscle: missing, days };
    }
    return null;
  };

  const recommendation = getRecommendation();

  return (
    <div className="space-y-8 pb-12">
      {/* Auto-Selection Banner */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 opacity-50" />
        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-serif text-2xl font-bold text-stone-800">
              Today's focus: <span className="text-rose-400">{activeMuscles.join(' & ')}</span>
            </h3>
            <p className="text-sm text-stone-500 font-medium">
              {isFocusOverridden ? "Custom selection" : autoFocus.reason}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                activeIntensity === 0 ? "bg-stone-100 text-stone-500" :
                activeIntensity === 1 ? "bg-sage-100 text-sage-600" :
                activeIntensity === 2 ? "bg-blue-100 text-blue-600" :
                activeIntensity === 3 ? "bg-orange-100 text-orange-600" :
                "bg-rose-100 text-rose-600"
              )}>
                Intensity: {['Rest', 'Light', 'Moderate', 'Strong', 'Beast Mode'][activeIntensity]} — {activeIntensity <= 1 ? "perfect for today" : "let's push it"}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setShowFocusPicker(true)}
            className="text-xs font-bold text-rose-400 hover:text-rose-500 transition-colors flex items-center gap-1"
          >
            Change today's focus <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Focus Picker Bottom Sheet */}
      <AnimatePresence>
        {showFocusPicker && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFocusPicker(false)}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] z-[51] p-8 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-stone-100 rounded-full mx-auto mb-8" />
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-serif text-2xl font-bold text-stone-800">Customize Focus</h3>
                <button 
                  onClick={() => {
                    setIsFocusOverridden(false);
                    setShowFocusPicker(false);
                  }}
                  className="text-xs font-bold text-rose-400"
                >
                  Reset to Auto
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Muscle Groups</label>
                  <div className="grid grid-cols-2 gap-3">
                    {muscleGroups.map((m) => (
                      <button
                        key={m.label}
                        onClick={() => {
                          setIsFocusOverridden(true);
                          toggleMuscle(m.label);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm transition-all border",
                          selectedMuscles.includes(m.label)
                            ? "bg-rose-400 text-white border-rose-400 shadow-lg shadow-rose-100"
                            : "bg-stone-50 text-stone-500 border-transparent hover:border-rose-200"
                        )}
                      >
                        <span className="text-xl">{m.icon}</span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Intensity</label>
                    <span className="text-xs font-bold text-rose-400">
                      {['Rest', 'Light', 'Moderate', 'Strong', 'Beast Mode'][intensity]}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="4" 
                    step="1" 
                    value={intensity}
                    onChange={(e) => {
                      setIsFocusOverridden(true);
                      setIntensity(Number(e.target.value));
                    }}
                    className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-rose-400"
                  />
                </div>

                <button 
                  onClick={() => setShowFocusPicker(false)}
                  className="w-full py-5 bg-stone-900 text-white rounded-2xl font-bold shadow-xl active:scale-[0.98] transition-all"
                >
                  Confirm Selection
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Exercises */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <h3 className="font-serif text-2xl font-bold text-stone-800">Today's Exercises</h3>
            <div className="px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-[10px] font-bold uppercase tracking-widest">
              🔥 {totalKcal} kcal
            </div>
          </div>
          <span className="text-xs font-bold text-stone-400">{filteredExercises.length} Exercises</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredExercises.map((ex: any, i: number) => (
            <ExerciseCard 
              key={i} 
              exercise={ex} 
              isDone={completed.includes(ex.name)}
              reaction={exerciseReactions[ex.name]}
              onReact={(val: string) => setExerciseReactions(prev => ({ ...prev, [ex.name]: val }))}
              onToggle={() => {
                setCompleted((prev: string[]) => 
                  prev.includes(ex.name) ? prev.filter(n => n !== ex.name) : [...prev, ex.name]
                );
              }}
              onPlayVideo={() => setActiveVideo({ 
                url: ex.videoUrl || '', 
                muscle: ex.muscleGroup 
              })}
            />
          ))}
        </div>

        {filteredExercises.length === 0 && (
          <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-stone-200">
            <p className="text-stone-400 font-medium">No exercises found for these muscles. Try selecting others!</p>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setActiveVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] overflow-hidden max-w-2xl w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                <h4 className="font-bold text-stone-800">Exercise Demonstration</h4>
                <button 
                  onClick={() => setActiveVideo(null)}
                  className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 hover:text-stone-600"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="aspect-video bg-black relative">
                {activeVideo.url ? (
                  activeVideo.url.includes('youtube.com') || activeVideo.url.includes('youtu.be') ? (
                    <iframe
                      src={getYouTubeEmbedUrl(activeVideo.url) || ''}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video 
                      src={activeVideo.url} 
                      controls 
                      autoPlay 
                      className="w-full h-full"
                      poster="https://picsum.photos/seed/fitness/800/450"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50 text-stone-400 space-y-4">
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-32 h-32"
                    >
                      <MuscleDiagram muscle={activeVideo.muscle} />
                    </motion.div>
                    <p className="text-xs font-bold uppercase tracking-widest">Visualizing Form...</p>
                  </div>
                )}
              </div>
              <div className="p-6">
                <p className="text-sm text-stone-500 leading-relaxed">
                  Focus on your form and breathing. Move with control and listen to your body's signals.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Card */}
      <AnimatePresence>
        {isAllDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-sage-600 p-8 md:p-12 rounded-[3rem] text-white shadow-2xl shadow-sage-200 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center">
                  <Trophy size={32} />
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">Workout Complete</p>
                  <h4 className="text-3xl font-serif font-bold">Amazing Work!</h4>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase opacity-60">Time</p>
                  <p className="text-xl font-bold">45m</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase opacity-60">Calories</p>
                  <p className="text-xl font-bold">~{totalKcal}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase opacity-60">Streak</p>
                  <p className="text-xl font-bold">🔥 {history.length + 1} Days</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-4">
                <button 
                  onClick={() => onLog(selectedMuscles.length > 0 ? selectedMuscles : ['Full Body'], 45, totalKcal)}
                  className="flex-1 bg-white text-sage-700 py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
                >
                  Log this Workout
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("Just crushed my FitHer workout! 🔥 Feeling amazing.");
                    alert("Summary copied to clipboard!");
                  }}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-sage-500 text-white rounded-2xl font-bold border border-sage-400 active:scale-95 transition-all"
                >
                  <Share2 size={20} />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExerciseCard({ exercise, isDone, onToggle, onPlayVideo, reaction, onReact }: any) {
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=how+to+${exercise.name.replace(/ /g, '+')}+for+women`;

  return (
    <div className={cn(
      "bg-white p-6 rounded-[2rem] border transition-all duration-300 flex flex-col justify-between h-full",
      isDone ? "border-sage-200 shadow-inner bg-stone-50/50" : "border-stone-100 shadow-sm hover:shadow-md"
    )}>
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "text-xl font-bold text-stone-800 transition-all",
              isDone && "line-through text-stone-400"
            )}>
              {exercise.name}
            </h4>
            <div className="flex gap-0.5">
              {[1, 2, 3].map(d => (
                <div key={d} className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  d <= exercise.difficulty ? "bg-rose-300" : "bg-stone-100"
                )} />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={cn(
              "text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider",
              exercise.type === 'Strength' ? "bg-rose-50 text-rose-500" :
              exercise.type === 'Cardio' ? "bg-orange-50 text-orange-500" :
              exercise.type === 'Mobility' ? "bg-blue-50 text-blue-500" :
              "bg-sage-50 text-sage-500"
            )}>
              {exercise.type}
            </span>
            {exercise.sets && <span className="text-[10px] px-2.5 py-1 bg-stone-50 text-stone-500 rounded-full font-bold uppercase tracking-wider">{exercise.sets} Sets</span>}
            {exercise.reps && <span className="text-[10px] px-2.5 py-1 bg-stone-50 text-stone-500 rounded-full font-bold uppercase tracking-wider">{exercise.reps} Reps</span>}
            {exercise.rest && <span className="text-[10px] px-2.5 py-1 bg-stone-50 text-stone-500 rounded-full font-bold uppercase tracking-wider">{exercise.rest} Rest</span>}
            <span className="text-[10px] px-2.5 py-1 bg-stone-50 text-stone-500 rounded-full font-bold uppercase tracking-wider">{exercise.kcal} kcal</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="w-16 h-16">
            <MuscleDiagram muscle={exercise.category} />
          </div>
          <div className="flex gap-2">
            <a 
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-colors"
              title="Watch on YouTube"
            >
              <Play size={14} fill="currentColor" />
            </a>
            <button 
              onClick={onPlayVideo}
              className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors"
              title="Watch demonstration"
            >
              <Sparkles size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Target Muscles</p>
          <p className="text-xs text-stone-600 font-medium">{exercise.muscles}</p>
        </div>
        
        <div className="p-4 bg-sage-50/30 rounded-2xl border border-sage-100/50">
          <p className="text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1">Pro Tip</p>
          <p className="text-xs text-sage-700 italic leading-relaxed">{exercise.tip}</p>
        </div>

        <div className="space-y-3">
          <button 
            onClick={onToggle}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]",
              isDone 
                ? "bg-sage-100 text-sage-600 border border-sage-200" 
                : "bg-stone-900 text-white shadow-lg shadow-stone-200"
            )}
          >
            {isDone ? <CheckCircle2 size={18} /> : null}
            <span>{isDone ? "Completed ✓" : "Mark as Done"}</span>
          </button>

          {isDone && (
            <div className="flex flex-col items-center gap-2 pt-2 border-t border-stone-100">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Feeling this?</p>
              <div className="flex gap-4">
                {[
                  { emoji: '💪', label: 'Great', value: 'good' },
                  { emoji: '😮‍💨', label: 'Hard', value: 'hard' },
                  { emoji: '😌', label: 'Easy', value: 'easy' }
                ].map((r) => (
                  <button
                    key={r.value}
                    onClick={() => onReact(r.value)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all active:scale-90",
                      reaction === r.value ? "bg-rose-100 scale-110 shadow-sm" : "bg-stone-50 hover:bg-stone-100"
                    )}
                    title={r.label}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MuscleDiagram({ muscle }: { muscle: string }) {
  const m = muscle.toLowerCase();
  // Simple SVG human outline with highlighted areas
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Body Outline */}
      <path 
        d="M50,10 C55,10 60,15 60,20 C60,25 55,30 50,30 C45,30 40,25 40,20 C40,15 45,10 50,10 M40,30 L60,30 L65,50 L60,50 L58,80 L50,80 L42,80 L40,50 L35,50 L40,30" 
        fill="none" 
        stroke="#E2E8F0" 
        strokeWidth="2" 
      />
      
      {/* Highlights */}
      {m === 'arms' && <path d="M35,35 L40,50 M60,50 L65,35" stroke="#FDA4AF" strokeWidth="4" strokeLinecap="round" />}
      {m === 'legs' && <path d="M42,60 L42,85 M58,60 L58,85" stroke="#FDA4AF" strokeWidth="4" strokeLinecap="round" />}
      {m === 'core' && <rect x="45" y="35" width="10" height="15" fill="#FDA4AF" rx="2" />}
      {m === 'chest' && <path d="M42,32 L58,32" stroke="#FDA4AF" strokeWidth="4" strokeLinecap="round" />}
      {m === 'back' && <path d="M45,35 L45,55 M55,35 L55,55" stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" />}
      {m === 'glutes' && <circle cx="50" cy="58" r="5" fill="#FDA4AF" />}
      {(m === 'fullbody' || m === 'mobility') && <path d="M50,10 C55,10 60,15 60,20 C60,25 55,30 50,30 C45,30 40,25 40,20 C40,15 45,10 50,10 M40,30 L60,30 L65,50 L60,50 L58,80 L50,80 L42,80 L40,50 L35,50 L40,30" fill="#FDA4AF" opacity="0.3" />}
    </svg>
  );
}

function MealsTab({ plan }: any) {
  return (
    <div className="space-y-6">
      <h2 className="font-serif text-3xl font-bold text-stone-800">Nutrition</h2>
      <div className="space-y-4">
        <MealCard label="Breakfast" meal={plan?.meals.breakfast} />
        <MealCard label="Lunch" meal={plan?.meals.lunch} />
        <MealCard label="Dinner" meal={plan?.meals.dinner} />
        
        <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100">
          <h3 className="font-bold text-rose-700 mb-4 flex items-center gap-2">
            <Droplets size={18} />
            <span>Hydration Goal</span>
          </h3>
          <p className="text-sm text-stone-600 leading-relaxed mb-4">{plan?.meals.hydration}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className={cn("w-8 h-8 rounded-lg flex items-center justify-center", i <= 5 ? "bg-blue-400 text-white" : "bg-blue-50 text-blue-200")}>
                <Droplets size={14} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MealCard({ label, meal }: any) {
  return (
    <div className="p-6 bg-white rounded-3xl border border-stone-100 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-rose-300 uppercase tracking-widest">{label}</span>
        <span className="text-xs font-bold text-stone-400">{meal?.cal} kcal</span>
      </div>
      <h3 className="font-bold text-stone-800 text-lg">{meal?.meal}</h3>
      <p className="text-xs text-stone-500 leading-relaxed italic">{meal?.why}</p>
    </div>
  );
}


function LearnTab({ profile }: { profile: UserProfile }) {
  const [activeProteinPhase, setActiveProteinPhase] = useState(0);
  
  // Find index of user's phase in protein guide
  useEffect(() => {
    const userPhaseIndex = fitherKnowledgeBase.proteinByLifePhase.phases.findIndex(
      p => p.life_stage_key === profile.life_stage
    );
    if (userPhaseIndex !== -1) {
      setActiveProteinPhase(userPhaseIndex);
    }
  }, [profile.life_stage]);

  const proteinPhase = fitherKnowledgeBase.proteinByLifePhase.phases[activeProteinPhase];

  return (
    <div className="space-y-12 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold text-stone-800">Learn</h2>
        <div className="px-4 py-1.5 bg-rose-100 text-rose-500 rounded-full text-[10px] font-bold uppercase tracking-widest">
          Your phase highlighted
        </div>
      </div>

      {/* Section 1: Age & Muscle Timeline */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest">Muscle Loss Timeline</h3>
          <div className="h-px flex-1 bg-rose-100" />
        </div>
        <div className="space-y-4">
          {fitherKnowledgeBase.muscleAndAge.timeline.map((item, idx) => {
            const isUserPhase = item.life_stage_key === profile.life_stage;
            const borderColor = {
              green: "border-sage-400",
              amber: "border-amber-400",
              coral: "border-rose-400",
              red: "border-red-400"
            }[item.color as keyof typeof borderColor] || "border-stone-200";

            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={cn(
                  "bg-white rounded-[2rem] p-6 border-l-8 shadow-sm relative overflow-hidden",
                  borderColor,
                  isUserPhase && "ring-2 ring-rose-200 ring-offset-2"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-stone-800">{item.age}</h4>
                    <span className={cn(
                      "inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mt-1",
                      item.color === 'green' ? "bg-sage-50 text-sage-600" :
                      item.color === 'amber' ? "bg-amber-50 text-amber-600" :
                      item.color === 'coral' ? "bg-rose-50 text-rose-600" : "bg-red-50 text-red-600"
                    )}>
                      {item.phase}
                    </span>
                  </div>
                  <span className="text-3xl">{item.icon}</span>
                </div>
                
                <p className="text-2xl font-bold text-stone-800 mb-2 leading-tight">
                  {item.muscle.split(' — ')[0]}
                </p>
                <p className="text-stone-500 text-sm leading-relaxed mb-6">
                  {item.what_happens}
                </p>

                <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100/50">
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Action</p>
                  <p className="text-stone-700 text-sm leading-relaxed italic">
                    {item.action}
                  </p>
                </div>

                {isUserPhase && (
                  <div className="absolute top-4 right-12 px-3 py-1 bg-rose-400 text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                    Your phase
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Protein Guide */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest">Protein by Life Phase</h3>
          <div className="h-px flex-1 bg-rose-100" />
        </div>

        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-6 px-6">
          {fitherKnowledgeBase.proteinByLifePhase.phases.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setActiveProteinPhase(idx)}
              className={cn(
                "px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border",
                activeProteinPhase === idx 
                  ? "bg-rose-300 text-white border-rose-300 shadow-md shadow-rose-100" 
                  : "bg-white text-stone-400 border-stone-100 hover:border-rose-200"
              )}
            >
              {p.phase.split(' — ')[0]}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeProteinPhase}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-50"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center text-3xl">
                {proteinPhase.icon}
              </div>
              <div>
                <h4 className="text-2xl font-bold text-stone-800">{proteinPhase.daily_grams}</h4>
                <p className="text-stone-400 text-xs font-medium">per day • {proteinPhase.per_kg}</p>
              </div>
              {proteinPhase.life_stage_key === profile.life_stage && (
                <div className="ml-auto px-3 py-1 bg-rose-400 text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                  Your phase
                </div>
              )}
            </div>

            <p className="text-stone-600 leading-relaxed mb-8">
              {proteinPhase.why}
            </p>

            <div className="space-y-4 mb-8">
              <h5 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Indian food sources</h5>
              <div className="flex flex-wrap gap-2">
                {proteinPhase.indian_sources.map((source, i) => (
                  <span key={i} className="px-4 py-2 bg-stone-50 text-stone-600 rounded-full text-xs font-medium border border-stone-100">
                    {source.split(' (')[0]}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-red-50 rounded-2xl p-5 border-l-4 border-red-400">
              <p className="text-red-700 text-sm leading-relaxed font-medium">
                {proteinPhase.warning}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Section 3: Quick Facts */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest">Quick Facts</h3>
          <div className="h-px flex-1 bg-rose-100" />
        </div>
        
        <div className="flex overflow-x-auto gap-4 pb-6 -mx-6 px-6 scrollbar-hide">
          {fitherKnowledgeBase.quickFacts.map((fact, idx) => (
            <motion.div 
              key={idx}
              className="min-w-[280px] max-w-[280px] bg-white rounded-[2rem] p-6 shadow-sm border border-stone-50 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-400 mb-4">
                  {idx % 2 === 0 ? <Zap size={20} /> : <Sparkles size={20} />}
                </div>
                <h4 className="text-lg font-bold text-stone-800 mb-3 leading-tight">{fact.fact}</h4>
                <p className="text-stone-500 text-sm leading-relaxed">{fact.detail}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-50">
                <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">Source: {fact.source}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

const getGreetingSubtitle = (phase: string) => {
  switch (phase) {
    case 'Menstrual': return "Let's take it easy today";
    case 'Follicular': return "Energy is building — use it!";
    case 'Ovulation': return "Peak power day — let's go!";
    case 'Luteal': return "Steady and strong today";
    default: return "Your daily wellness sanctuary";
  }
};

function MeditateTab({ profile }: { profile: UserProfile }) {
  const phase = profile.cycle_start_date ? getCyclePhase(profile.cycle_start_date, profile.cycle_length || 28).phase : 'Follicular';
  
  const meditations = [
    { 
      title: "Body Scan for Relief", 
      phase: "Menstrual", 
      duration: "10 min", 
      description: "Release tension and connect with your body's rhythm.",
      icon: "🧘‍♀️"
    },
    { 
      title: "Energising Breath", 
      phase: "Follicular", 
      duration: "8 min", 
      description: "Channel your rising energy into focused clarity.",
      icon: "⚡️"
    },
    { 
      title: "Anxiety Release", 
      phase: "Luteal", 
      duration: "12 min", 
      description: "Calm the mind and soothe the nervous system.",
      icon: "🌊"
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-3xl font-bold text-stone-800">Zen Space</h2>
        <div className="px-4 py-1.5 bg-rose-100 text-rose-500 rounded-full text-[10px] font-bold uppercase tracking-widest">
          Synced with {phase} Phase
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {meditations.map((med, idx) => (
          <motion.div 
            key={idx}
            whileHover={{ y: -5 }}
            className={cn(
              "bg-white rounded-[2.5rem] p-8 border shadow-sm flex flex-col justify-between h-full relative overflow-hidden",
              med.phase === phase ? "border-rose-200 ring-2 ring-rose-50" : "border-stone-100 opacity-80"
            )}
          >
            {med.phase === phase && (
              <div className="absolute top-4 right-4 px-3 py-1 bg-rose-400 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
                Recommended
              </div>
            )}
            <div>
              <div className="text-4xl mb-6">{med.icon}</div>
              <h3 className="text-xl font-bold text-stone-800 mb-2">{med.title}</h3>
              <p className="text-xs font-bold text-rose-300 uppercase tracking-widest mb-4">{med.phase} Phase</p>
              <p className="text-stone-500 text-sm leading-relaxed mb-8">{med.description}</p>
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-stone-50">
              <span className="text-xs font-bold text-stone-400 flex items-center gap-1">
                <Clock size={14} /> {med.duration}
              </span>
              <button className="w-12 h-12 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all">
                <Play size={20} fill="currentColor" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SleepTab({ profile, logs, setLogs }: { profile: UserProfile, logs: any[], setLogs: any }) {
  const [bedtime, setBedtime] = useState("22:30");
  const [wakeTime, setWakeTime] = useState("06:30");
  const phase = profile.cycle_start_date ? getCyclePhase(profile.cycle_start_date, profile.cycle_length || 28).phase : 'Follicular';

  const handleLogSleep = () => {
    const start = new Date(`2000-01-01T${bedtime}`);
    let end = new Date(`2000-01-01T${wakeTime}`);
    if (end < start) end = new Date(`2000-01-02T${wakeTime}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    const newLog = { date: format(new Date(), 'dd/MM/yyyy'), bedtime, wakeTime, hours };
    setLogs([newLog, ...logs].slice(0, 7));
  };

  const getSleepTip = (p: string) => {
    switch (p) {
      case 'Menstrual': return "Your body needs more rest now. Aim for 8-9 hours and consider an earlier bedtime.";
      case 'Ovulation': return "Estrogen peaks can make sleep lighter. Keep your room cool and avoid screens 1h before bed.";
      case 'Luteal': return "Progesterone can increase body temp. A warm bath before bed can help trigger sleep.";
      default: return "Consistency is key. Try to wake up at the same time every day to regulate your rhythm.";
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <h2 className="font-serif text-3xl font-bold text-stone-800">Sleep Sanctuary</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-sm space-y-6">
            <h3 className="font-bold text-stone-800">Log Last Night</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Bedtime</label>
                <input 
                  type="time" 
                  value={bedtime} 
                  onChange={(e) => setBedtime(e.target.value)}
                  className="w-full bg-stone-50 border-none rounded-2xl px-5 py-4 text-stone-700 outline-none focus:ring-2 focus:ring-rose-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Wake Time</label>
                <input 
                  type="time" 
                  value={wakeTime} 
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full bg-stone-50 border-none rounded-2xl px-5 py-4 text-stone-700 outline-none focus:ring-2 focus:ring-rose-100"
                />
              </div>
              <button 
                onClick={handleLogSleep}
                className="w-full py-4 bg-rose-300 text-white rounded-2xl font-bold shadow-lg shadow-rose-100 active:scale-95 transition-all"
              >
                Save Sleep Log
              </button>
            </div>
          </div>

          <div className="bg-sage-50 rounded-[2.5rem] p-8 border border-sage-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-sage-500 shadow-sm">
                <Sparkles size={20} />
              </div>
              <h4 className="font-bold text-sage-900">Phase Tip</h4>
            </div>
            <p className="text-sm text-sage-700 leading-relaxed italic">
              "{getSleepTip(phase)}"
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-stone-800 mb-8">Weekly Sleep Trend</h3>
          <div className="flex-1 flex items-end justify-between gap-2 min-h-[200px] px-4">
            {[8, 7.5, 6, 8.5, 7, 9, 8].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <div className="relative w-full">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${(h / 10) * 100}%` }}
                    className={cn(
                      "w-full rounded-t-xl transition-all",
                      h >= 8 ? "bg-rose-300" : "bg-stone-100"
                    )}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {h}h
                  </div>
                </div>
                <span className="text-[10px] font-bold text-stone-300 uppercase">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SafeSpaceTab({ profile, speak, isSpeaking, isMuted, setIsMuted }: { 
  profile: UserProfile, 
  speak: (text: string) => void,
  isSpeaking: boolean,
  isMuted: boolean,
  setIsMuted: (muted: boolean) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const phase = profile.cycle_start_date ? getCyclePhase(profile.cycle_start_date, profile.cycle_length || 28).phase : 'Follicular';

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || loading) return;
    
    const userMsg: ChatMessage = { role: 'user', text: messageText, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: { 
          systemInstruction: `You are FitHer's Safe Space Agent. You are a warm, empathetic, and motivating companion for women. 
          
          STRICT RESPONSE RULES:
          1. Respond in VERY SHORT sentences.
          2. ONLY respond if the user has a query (question) or is expressing self-doubt, low energy, or needs motivation.
          3. If the user is just sharing a positive update or a simple statement that doesn't need motivation or an answer, acknowledge it with a tiny, warm phrase (e.g., "That's lovely.", "I hear you.") or stay very brief.
          4. Always respond in the context of their cycle phase (${phase}) and profile.
          5. Use warm, natural language. NEVER use raw markdown symbols.` 
        },
        history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
      });

      const result = await chat.sendMessage({ message: messageText });
      const modelMsg: ChatMessage = { role: 'model', text: result.text || "I'm here for you. Tell me more.", timestamp: Date.now() };
      setMessages(prev => [...prev, modelMsg]);
      
      if (!isMuted) {
        speak(modelMsg.text);
      }
    } catch (error) {
      console.error("Safe Space error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    setMicError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setMicError("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setMicError("Microphone access denied. Please check your browser settings.");
        } else {
          setMicError(`Microphone error: ${event.error}`);
        }
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSend(transcript);
      };

      recognition.start();
    } catch (e) {
      console.error("Speech recognition start error:", e);
      setMicError("Could not start microphone. Please try again.");
      setIsListening(false);
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col bg-white rounded-[3rem] border border-stone-100 shadow-xl overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-rose-100/20 blur-[100px] -z-10 rounded-full" />
      
      <header className="px-8 py-6 border-b border-stone-50 flex items-center justify-between bg-white/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-500 shadow-sm">
            <Heart size={24} />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-stone-800">Your Safe Space</h2>
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Always here to listen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              isMuted ? "bg-stone-100 text-stone-400" : "bg-rose-50 text-rose-500"
            )}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-8">
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-32 h-32 bg-rose-100 rounded-full flex items-center justify-center text-rose-400"
              >
                <Sparkles size={48} />
              </motion.div>
              {isListening && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-rose-200 rounded-full -z-10"
                />
              )}
            </div>
            <div className="space-y-3">
              <h3 className="font-serif text-2xl font-bold text-stone-800">How are you truly feeling?</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                This is your private sanctuary. Share your wins, your worries, or just let it all out. I'm here to support you.
              </p>
            </div>
            <button 
              onClick={toggleListening}
              className={cn(
                "px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-lg",
                isListening ? "bg-rose-500 text-white scale-105" : "bg-rose-100 text-rose-600 hover:bg-rose-200"
              )}
            >
              {isListening ? <Mic size={20} className="animate-pulse" /> : <Mic size={20} />}
              <span>{isListening ? "I'm listening..." : "Tap to talk"}</span>
            </button>

            {micError && (
              <p className="text-xs text-rose-400 font-bold animate-pulse">{micError}</p>
            )}
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] p-6 rounded-[2rem] text-sm leading-relaxed shadow-sm",
              msg.role === 'user' 
                ? "bg-stone-900 text-white rounded-tr-none" 
                : "bg-rose-50 text-stone-800 rounded-tl-none border border-rose-100"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-rose-50 p-5 rounded-3xl rounded-tl-none border border-rose-100 flex gap-1">
              <div className="w-1.5 h-1.5 bg-rose-300 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-rose-300 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-rose-300 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <footer className="p-8 bg-white/50 backdrop-blur-md border-t border-stone-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleListening}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm",
              isListening ? "bg-rose-500 text-white" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
            )}
          >
            <Mic size={24} className={isListening ? "animate-pulse" : ""} />
          </button>
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your heart out..."
              className="w-full bg-stone-50 border-none rounded-2xl px-6 py-5 text-sm text-stone-700 focus:ring-2 focus:ring-rose-100 outline-none pr-16"
            />
            <button 
              onClick={() => handleSend()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-rose-400 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-100 active:scale-95 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProgressTab({ profile }: { profile: UserProfile }) {
  return (
    <div className="space-y-12 pb-12">
      <h2 className="font-serif text-3xl font-bold text-stone-800">Your Cycle & Progress</h2>

      <CycleTracker 
        cycleStartDate={profile.cycle_start_date || ''} 
        cycleLength={profile.cycle_length || 28} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Workouts Ring */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-sm flex flex-col items-center text-center">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-8">Workouts Completed</h3>
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="96" cy="96" r="80" fill="none" stroke="currentColor" strokeWidth="12" className="text-stone-50" />
              <circle cx="96" cy="96" r="80" fill="none" stroke="currentColor" strokeWidth="12" strokeDasharray={502} strokeDashoffset={502 - (502 * 85) / 100} className="text-rose-300 stroke-round" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-serif font-bold text-stone-800">6/7</span>
              <span className="text-[10px] font-bold text-stone-400 uppercase">Days</span>
            </div>
          </div>
          <p className="mt-8 text-sm text-stone-500 font-medium">You're 15% more active than last week!</p>
        </div>

        {/* Protein Bar Chart */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-8">Avg. Protein Intake</h3>
          <div className="flex-1 flex items-end justify-between gap-3 min-h-[160px]">
            {[55, 62, 48, 70, 65, 58, 60].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${(v / 80) * 100}%` }}
                  className={cn("w-full rounded-t-lg transition-all", v >= 60 ? "bg-sage-300" : "bg-stone-100")}
                />
                <span className="text-[10px] font-bold text-stone-300 uppercase">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-stone-50 flex justify-between items-center">
            <span className="text-xs font-bold text-stone-700">Average: 60g</span>
            <span className="text-[10px] font-bold text-sage-500 uppercase">Target: 65g</span>
          </div>
        </div>

        {/* Water Consistency */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-sm">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-8">Water Consistency</h3>
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 28 }).map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-full aspect-square rounded-full flex items-center justify-center",
                  i < 20 ? "bg-blue-100 text-blue-500" : "bg-stone-50 text-stone-200"
                )}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-current" />
              </div>
            ))}
          </div>
          <p className="mt-8 text-xs text-stone-500 text-center font-medium">20/28 days goal reached</p>
        </div>

        {/* Mood & Energy Correlation */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-sm">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-8">Energy vs Cycle Phase</h3>
          <div className="space-y-6">
            {[
              { phase: 'Menstrual', energy: 30, color: 'bg-stone-200' },
              { phase: 'Follicular', energy: 75, color: 'bg-sage-200' },
              { phase: 'Ovulation', energy: 95, color: 'bg-rose-300' },
              { phase: 'Luteal', energy: 55, color: 'bg-amber-200' }
            ].map((p) => (
              <div key={p.phase} className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-stone-500">{p.phase}</span>
                  <span className="text-stone-800">{p.energy}% Energy</span>
                </div>
                <div className="h-2 w-full bg-stone-50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${p.energy}%` }}
                    className={cn("h-full rounded-full", p.color)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarPicker({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const selectedDate = value ? parse(value, 'dd/MM/yyyy', new Date()) : null;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-stone-100 rounded-2xl px-5 py-4 text-left flex items-center justify-between shadow-sm"
      >
        <div className="flex items-center gap-3">
          <CalendarIcon size={18} className="text-rose-300" />
          <span className={cn("text-sm font-medium", value ? "text-stone-700" : "text-stone-400")}>
            {value || "Select Date"}
          </span>
        </div>
        <ChevronRight size={18} className={cn("text-stone-300 transition-transform", isOpen && "rotate-90")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-stone-100 rounded-[2rem] p-6 shadow-xl shadow-rose-100/20"
          >
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-2 hover:bg-stone-50 rounded-full text-stone-400">
                <ChevronLeft size={20} />
              </button>
              <h4 className="font-bold text-stone-700 text-sm">{format(currentMonth, 'MMMM yyyy')}</h4>
              <button onClick={nextMonth} className="p-2 hover:bg-stone-50 rounded-full text-stone-400">
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-[10px] font-bold text-stone-300 text-center uppercase">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map(day => (
                <button
                  key={day.toString()}
                  onClick={() => {
                    onChange(format(day, 'dd/MM/yyyy'));
                    setIsOpen(false);
                  }}
                  className={cn(
                    "h-9 w-9 rounded-xl text-xs font-bold flex items-center justify-center transition-all",
                    selectedDate && isSameDay(day, selectedDate) 
                      ? "bg-rose-300 text-white shadow-sm" 
                      : isToday(day)
                      ? "text-rose-400 bg-rose-50"
                      : "text-stone-600 hover:bg-stone-50"
                  )}
                >
                  {format(day, 'd')}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
        className="w-full bg-white border border-stone-100 rounded-2xl px-5 py-4 text-stone-700 focus:outline-none focus:border-rose-200 transition-all shadow-sm"
      />
    </div>
  );
}

function PillButton({ label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-xs font-bold transition-all border",
        active ? "bg-rose-300 text-white border-rose-300 shadow-md shadow-rose-100" : "bg-white text-stone-400 border-stone-100"
      )}
    >
      {label}
    </button>
  );
}

function SelectionCard({ label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-4 rounded-2xl text-left transition-all border flex items-center justify-between",
        active ? "bg-rose-50 border-rose-200 shadow-sm" : "bg-white border-stone-100"
      )}
    >
      <span className={cn("text-xs font-bold uppercase tracking-wide", active ? "text-rose-500" : "text-stone-400")}>{label}</span>
      {active && <CheckCircle2 size={16} className="text-rose-400" />}
    </button>
  );
}

function NavButton({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <div className={cn("transition-colors", active ? "text-rose-400" : "text-stone-300")}>
        {icon}
      </div>
      <span className={cn("text-[10px] font-bold uppercase tracking-widest", active ? "text-rose-400" : "text-stone-300")}>{label}</span>
    </button>
  );
}

function SidebarLink({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm",
        active 
          ? "bg-rose-50 text-rose-500 shadow-sm" 
          : "text-stone-400 hover:bg-stone-50 hover:text-stone-600"
      )}
    >
      {icon}
      <span>{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-400" />}
    </button>
  );
}
