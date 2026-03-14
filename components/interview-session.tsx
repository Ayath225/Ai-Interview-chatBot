"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Mic, MicOff, Send, Volume2, VolumeX, Clock } from "lucide-react";
import { voiceManager } from "../lib/voice";
import { storage } from "@/lib/storage";
import type { Message, InterviewSession } from "@/lib/types";
import { cn } from "@/lib/utils";

const FALLBACK_NAME = "Candidate";
const FALLBACK_QUESTIONS = [
  "Can you briefly introduce yourself and your core strengths?",
  "Which project on your CV are you most proud of, and why?",
  "Tell me about a technical challenge you solved recently.",
  "How do you approach learning a new technology quickly?",
  "Why are you a strong fit for this role?",
];

const MAX_SPEECH_WAIT_MS = 30_000;

interface GeneratedQuestionPayload {
  candidateName?: string;
  questions?: string[];
  source?: "openrouter" | "fallback";
  warning?: string;
}

interface EvaluateAnswerPayload {
  Question: string | null;
  IsWantToShowAgain: boolean;
  assessment?: "good" | "medium" | "low" | "repeat" | "wrong";
  feedback?: string;
  source?: "openrouter" | "fallback";
  warning?: string;
}

interface InterviewSessionProps {
  cvContent?: string;
  cvFileName?: string;
  onSessionEnd?: (session: InterviewSession) => void;
}

const createMessage = (role: Message["role"], content: string): Message => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  timestamp: Date.now(),
});

const buildQuestionMessage = (questionText: string, questionNumber: number) => {
  return `Question ${questionNumber}: ${questionText}`;
};

export function InterviewSessionComponent({
  cvContent,
  cvFileName,
  onSessionEnd,
}: InterviewSessionProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPreparingQuestions, setIsPreparingQuestions] = useState(false);
  const [isEvaluatingAnswer, setIsEvaluatingAnswer] = useState(false);
  const [stopListening, setStopListening] = useState<(() => void) | null>(null);
  const [duration, setDuration] = useState(0);
  const [sessionActive, setSessionActive] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const [candidateName, setCandidateName] = useState(FALLBACK_NAME);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [hasCompletedQuestionFlow, setHasCompletedQuestionFlow] =
    useState(false);

  const hasGeneratedQuestions = useRef(false);
  const inputRef = useRef("");
  const questionsRef = useRef<string[]>([]);
  const candidateNameRef = useRef(FALLBACK_NAME);
  const autoSubmitTimerRef = useRef<number | null>(null);
  const lastSpokenAssistantMessageIdRef = useRef<string | null>(null);
  const speechRequestIdRef = useRef(0);

  const appendAssistantMessage = (content: string) => {
    setMessages((prev) => [...prev, createMessage("assistant", content)]);
  };

  const appendUserMessage = (content: string) => {
    setMessages((prev) => [...prev, createMessage("user", content)]);
  };

  const startQuestionFlow = (name: string, generatedQuestions: string[]) => {
    if (!generatedQuestions.length) return;

    setCandidateName(name);
    candidateNameRef.current = name;

    const sanitizedQuestions = generatedQuestions
      .map((q) => q.trim())
      .filter(Boolean);
    setQuestions(sanitizedQuestions);
    questionsRef.current = sanitizedQuestions;

    setCurrentQuestionIndex(0);
    setHasCompletedQuestionFlow(false);

    appendAssistantMessage(
      `Hi ${name}, welcome to your interview practice session. Let's begin. \n${buildQuestionMessage(
        sanitizedQuestions[0],
        1,
      )}`,
    );
  };

  const sendCVToOpenRouter = async () => {
    setIsPreparingQuestions(true);

    const cvFromStorage = storage.getCV();
    const resolvedCvContent = cvContent || cvFromStorage?.content || "";

    try {
      if (!resolvedCvContent.trim()) {
        startQuestionFlow(FALLBACK_NAME, FALLBACK_QUESTIONS);
        return;
      }

      const response = await fetch("/api/interview/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cvContent: resolvedCvContent }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate interview questions");
      }

      const payload = (await response.json()) as GeneratedQuestionPayload;
      const sanitizedName = (payload.candidateName || FALLBACK_NAME).trim();
      const sanitizedQuestions = (payload.questions || [])
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);

      if (payload.source === "openrouter") {
        console.log(
          "[Interview] OpenRouter generated questions:",
          sanitizedQuestions,
        );
      } else {
        console.log(
          "[Interview] Using fallback questions:",
          sanitizedQuestions,
        );
      }

      if (payload.warning) {
        console.warn(
          "[Interview] Question generation warning:",
          payload.warning,
        );
      }

      if (!sanitizedQuestions.length) {
        throw new Error("No valid questions returned from question generator");
      }

      startQuestionFlow(sanitizedName, sanitizedQuestions);
    } catch (error) {
      console.error("Question generation error:", error);
      startQuestionFlow(FALLBACK_NAME, FALLBACK_QUESTIONS);
    } finally {
      setIsPreparingQuestions(false);
    }
  };

  useEffect(() => {
    if (hasGeneratedQuestions.current) return;
    hasGeneratedQuestions.current = true;
    sendCVToOpenRouter();
  }, [cvContent]);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    return () => {
      if (autoSubmitTimerRef.current !== null) {
        window.clearTimeout(autoSubmitTimerRef.current);
      }
    };
  }, []);

  // Track session duration
  useEffect(() => {
    if (!sessionActive) return;
    const interval = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionActive]);

  // Auto-speak only newly added assistant messages.
  useEffect(() => {
    if (!sessionActive) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return;

    if (lastSpokenAssistantMessageIdRef.current === lastMessage.id) {
      return;
    }

    lastSpokenAssistantMessageIdRef.current = lastMessage.id;
    void handleSpeak(lastMessage.content);
  }, [messages, sessionActive]);

  const handleSpeak = async (text: string) => {
    const currentSpeechRequestId = ++speechRequestIdRef.current;
    setIsSpeaking(true);

    let timeoutId: number | null = null;
    try {
      const speechTask = voiceManager.speak(text);
      const timeoutTask = new Promise<void>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error("Speech timed out"));
        }, MAX_SPEECH_WAIT_MS);
      });

      await Promise.race([speechTask, timeoutTask]);
    } catch (error) {
      console.error("Speech error:", error);
      voiceManager.stopSpeaking();
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (speechRequestIdRef.current === currentSpeechRequestId) {
        setIsSpeaking(false);
      }
    }
  };

  const handleStartListening = () => {
    if (isSpeaking) {
      voiceManager.stopSpeaking();
      speechRequestIdRef.current += 1;
      setIsSpeaking(false);
    }

    setIsListening(true);
    const stop = voiceManager.startListening(
      (transcript: string) => {
        setInput(transcript);
      },
      (error: string) => {
        console.error("Listening error:", error);
        setIsListening(false);
      },
    );
    setStopListening(() => stop);
  };

  const evaluateAnswer = async (
    question: string,
    answer: string,
  ): Promise<EvaluateAnswerPayload> => {
    const cvFromStorage = storage.getCV();
    const resolvedCvContent = cvContent || cvFromStorage?.content || "";

    const response = await fetch("/api/interview/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        answer,
        cvContent: resolvedCvContent,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to evaluate answer");
    }

    return (await response.json()) as EvaluateAnswerPayload;
  };

  const submitAnswer = async (answer: string) => {
    const userInput = answer.trim();
    if (!userInput || isEvaluatingAnswer) return;

    appendUserMessage(userInput);
    setInput("");

    if (hasCompletedQuestionFlow) {
      return;
    }

    const activeIndex = currentQuestionIndex;
    const activeQuestion = questionsRef.current[activeIndex];
    if (activeIndex < 0 || !activeQuestion) {
      return;
    }

    setIsEvaluatingAnswer(true);
    try {
      const evaluation = await evaluateAnswer(activeQuestion, userInput);

      console.log("[Interview] Answer evaluation:", evaluation);
      if (evaluation.warning) {
        console.warn("[Interview] Evaluation warning:", evaluation.warning);
      }

      if (evaluation.IsWantToShowAgain) {
        const replacementQuestion =
          typeof evaluation.Question === "string" && evaluation.Question.trim()
            ? evaluation.Question.trim()
            : activeQuestion;

        setQuestions((prev) => {
          const next = [...prev];
          next[activeIndex] = replacementQuestion;
          questionsRef.current = next;
          return next;
        });

        // const preface =
        //   evaluation.assessment === "repeat"
        //     ? "Sure, I will repeat the question in a clearer way."
        //     : "Let us retry this question with clearer wording.";

        appendAssistantMessage(
          `${buildQuestionMessage(replacementQuestion, activeIndex + 1)}`,
        );
        return;
      }

      const nextQuestionIndex = activeIndex + 1;
      if (nextQuestionIndex < questionsRef.current.length) {
        setCurrentQuestionIndex(nextQuestionIndex);
        appendAssistantMessage(
          buildQuestionMessage(
            questionsRef.current[nextQuestionIndex],
            nextQuestionIndex + 1,
          ),
        );
        return;
      }

      setHasCompletedQuestionFlow(true);
      appendAssistantMessage(
        `Great work, ${candidateNameRef.current}. You answered all questions. We can now review your performance.`,
      );
    } catch (error) {
      console.error("Answer evaluation error:", error);

      const nextQuestionIndex = activeIndex + 1;
      if (nextQuestionIndex < questionsRef.current.length) {
        setCurrentQuestionIndex(nextQuestionIndex);
        appendAssistantMessage(
          buildQuestionMessage(
            questionsRef.current[nextQuestionIndex],
            nextQuestionIndex + 1,
          ),
        );
      } else {
        setHasCompletedQuestionFlow(true);
        appendAssistantMessage(
          `Great work, ${candidateNameRef.current}. You answered all questions. We can now review your performance.`,
        );
      }
    } finally {
      setIsEvaluatingAnswer(false);
    }
  };

  const handleStopListening = () => {
    stopListening?.();
    setIsListening(false);

    if (autoSubmitTimerRef.current !== null) {
      window.clearTimeout(autoSubmitTimerRef.current);
    }

    // Wait briefly so SpeechRecognition can push final transcript.
    autoSubmitTimerRef.current = window.setTimeout(() => {
      const finalAnswer = inputRef.current.trim();
      if (finalAnswer && !isEvaluatingAnswer) {
        console.log(
          "[Interview] Auto-submitting answer after listening stopped:",
          finalAnswer,
        );
        void submitAnswer(finalAnswer);
      }
      autoSubmitTimerRef.current = null;
    }, 350);
  };

  const handleStopSpeaking = () => {
    voiceManager.stopSpeaking();
    speechRequestIdRef.current += 1;
    setIsSpeaking(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    void submitAnswer(input);
  };

  const handleEndSession = () => {
    voiceManager.stopSpeaking();
    speechRequestIdRef.current += 1;
    setSessionActive(false);

    const session: InterviewSession = {
      id: Date.now().toString(),
      startTime: Date.now() - duration * 1000,
      endTime: Date.now(),
      duration,
      cvFileName,
      cvContent,
      messages,
    };

    storage.saveInterview(session);
    onSessionEnd?.(session);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Interview Practice
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {cvFileName ? `Using CV: ${cvFileName}` : "No CV provided"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="w-5 h-5" />
              <span className="font-mono font-semibold">
                {formatDuration(duration)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEndSession}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 bg-transparent"
            >
              End Session
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <div className="text-slate-500 space-y-2">
                <p className="text-lg font-semibold">
                  Preparing your interview...
                </p>
                <p className="text-sm">
                  Personalized questions are being generated from your CV.
                </p>
              </div>
            </Card>
          ) : (
            messages.map((message, idx) => (
              <div
                key={idx}
                className={cn("flex gap-3 animate-in fade-in", {
                  "flex-row-reverse": message.role === "user",
                })}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0",
                    {
                      "bg-blue-500": message.role === "user",
                      "bg-emerald-500": message.role === "assistant",
                    },
                  )}
                >
                  {message.role === "user" ? "You" : "AI"}
                </div>
                <Card
                  className={cn("px-4 py-3 max-w-md", {
                    "bg-blue-50 border-blue-200": message.role === "user",
                    "bg-emerald-50 border-emerald-200":
                      message.role === "assistant",
                  })}
                >
                  <p className="text-sm text-slate-700">{message.content}</p>
                </Card>
              </div>
            ))
          )}

          {isSpeaking && (
            <div className="flex gap-2 items-center text-sm text-slate-600">
              <div className="animate-pulse">
                <Volume2 className="w-4 h-4 text-emerald-500" />
              </div>
              <span>AI is speaking...</span>
            </div>
          )}

          {isEvaluatingAnswer && (
            <div className="text-xs text-slate-500">
              Evaluating your answer...
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white p-6 shadow-lg">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Audio Controls */}
          <div className="flex gap-2">
            {isListening ? (
              <Button
                onClick={handleStopListening}
                variant="destructive"
                size="sm"
                className="flex-1 gap-2"
              >
                <MicOff className="w-4 h-4" />
                Stop Listening
              </Button>
            ) : (
              <Button
                onClick={handleStartListening}
                disabled={isPreparingQuestions || isEvaluatingAnswer}
                variant="default"
                size="sm"
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Mic className="w-4 h-4" />
                Start Listening
              </Button>
            )}

            <Button
              onClick={handleStopSpeaking}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!isSpeaking}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-4 h-4" />
                  Stop Speaking
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  Mute
                </>
              )}
            </Button>
          </div>

          {/* Text Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isPreparingQuestions
                  ? "Preparing your personalized questions..."
                  : "Type your answer..."
              }
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isPreparingQuestions || isEvaluatingAnswer}
            />
            <Button
              type="submit"
              disabled={
                !input.trim() || isPreparingQuestions || isEvaluatingAnswer
              }
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
              Send
            </Button>
          </form>

          <p className="text-xs text-slate-500 text-center">
            Answer each question. If your answer needs retry, AI will re-ask a
            clearer version.
          </p>
        </div>
      </div>
    </div>
  );
}
