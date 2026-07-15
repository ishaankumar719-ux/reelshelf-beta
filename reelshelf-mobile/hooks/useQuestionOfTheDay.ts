import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import {
  fetchQuestionsForRotation,
  fetchTodaysAnswers,
  fetchTriviaProgress,
  getOrCreateRotation,
  getUtcDateString,
  submitTriviaAnswer,
  type RotationRow,
  type TriviaCategory,
  type TriviaProgress,
  type TriviaQuestion,
} from '@/lib/supabase/trivia';

export interface CatAnswerState {
  revealed: boolean;
  selectedIndex: number | null;
  isCorrect: boolean | null; // null while revealed = "already answered" conflict case
  correctIndex: number | null; // always populated once revealed — read from the
  // local question object (RLS-confirmed world-readable), same as the website
  // setting it from `q.correct_index` even in the 409/"already answered" case.
  xpEarned: number;
  explanation: string | null;
  submitting: boolean;
}

const emptyCatState: CatAnswerState = {
  revealed: false,
  selectedIndex: null,
  isCorrect: null,
  correctIndex: null,
  xpEarned: 0,
  explanation: null,
  submitting: false,
};

type Status = 'idle' | 'loading' | 'success' | 'error';

export function useQuestionOfTheDay() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState<string>(getUtcDateString());
  const [rotation, setRotation] = useState<RotationRow | null>(null);
  const [questions, setQuestions] = useState<Record<TriviaCategory, TriviaQuestion | null>>({
    film: null, tv: null, book: null,
  });
  const [catStates, setCatStates] = useState<Record<TriviaCategory, CatAnswerState>>({
    film: { ...emptyCatState }, tv: { ...emptyCatState }, book: { ...emptyCatState },
  });
  const [progress, setProgress] = useState<TriviaProgress | null>(null);
  const [activeCategory, setActiveCategory] = useState<TriviaCategory | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!user) { setStatus('idle'); return; }
    setStatus('loading');
    setError(null);
    try {
      const utcToday = getUtcDateString();
      const rot = await getOrCreateRotation(utcToday);
      const [qs, answers, prog] = await Promise.all([
        fetchQuestionsForRotation(rot),
        fetchTodaysAnswers(user.id, utcToday),
        fetchTriviaProgress(user.id),
      ]);
      if (!isMounted.current) return;

      setToday(utcToday);
      setRotation(rot);
      setQuestions(qs);
      setProgress(prog);
      setCatStates({
        film: catStateFromAnswer(answers.film, qs.film),
        tv: catStateFromAnswer(answers.tv, qs.tv),
        book: catStateFromAnswer(answers.book, qs.book),
      });
      setStatus('success');
    } catch (e) {
      if (!isMounted.current) return;
      setStatus('error');
      setError(e instanceof Error ? e.message : "Could not load today's question.");
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const selectCategory = useCallback((cat: TriviaCategory) => {
    setActiveCategory(cat);
  }, []);

  const submitAnswer = useCallback(async (cat: TriviaCategory, selectedIndex: number) => {
    const q = questions[cat];
    if (!user || !rotation || !q || catStates[cat].revealed || catStates[cat].submitting) return;

    setCatStates((prev) => ({ ...prev, [cat]: { ...prev[cat], submitting: true, selectedIndex } }));

    try {
      const result = await submitTriviaAnswer({
        userId: user.id, category: cat, question: q, rotationDate: today, selectedIndex,
      });

      if (!isMounted.current) return;

      if (result.alreadyAnswered) {
        setCatStates((prev) => ({
          ...prev,
          [cat]: {
            revealed: true, selectedIndex, isCorrect: null, correctIndex: q.correctIndex,
            xpEarned: 0, explanation: q.explanation, submitting: false,
          },
        }));
        return;
      }

      setCatStates((prev) => ({
        ...prev,
        [cat]: {
          revealed: true, selectedIndex, isCorrect: result.isCorrect, correctIndex: result.correctIndex,
          xpEarned: result.xpEarned, explanation: result.explanation, submitting: false,
        },
      }));
      setProgress(result.progress);
    } catch (e) {
      if (!isMounted.current) return;
      setCatStates((prev) => ({ ...prev, [cat]: { ...prev[cat], submitting: false } }));
      setError(e instanceof Error ? e.message : 'Could not submit your answer.');
    }
  }, [user, rotation, today, questions, catStates]);

  return {
    status, error, today, rotation, questions, catStates, progress,
    activeCategory, selectCategory, submitAnswer, refetch: load, isLoggedIn: !!user,
  };
}

function catStateFromAnswer(
  answer: { selectedIndex: number; isCorrect: boolean | null; xpEarned: number } | null,
  question: TriviaQuestion | null,
): CatAnswerState {
  if (!answer) return { ...emptyCatState };
  return {
    revealed: true,
    selectedIndex: answer.selectedIndex,
    isCorrect: answer.isCorrect,
    correctIndex: question?.correctIndex ?? null,
    xpEarned: answer.xpEarned,
    explanation: question?.explanation ?? null,
    submitting: false,
  };
}
