"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// ponytail: browser-native speech (Web Speech API), no API key or cost. Dictation works in
// Chrome, Edge and Safari, not Firefox; swap in a hosted speech-to-text model if that matters.

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
};
type RecognitionCtor = new () => Recognition;

const noopSubscribe = () => () => {};
/** True in the browser when the feature exists; false during server render. */
function useBrowserSupport(check: () => boolean) {
  return useSyncExternalStore(noopSubscribe, check, () => false);
}

function getRecognition(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Speech to text: calls onText with the running transcript while listening. */
export function useDictation(onText: (text: string) => void) {
  const supported = useBrowserSupport(() => Boolean(getRecognition()));
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<Recognition | null>(null);

  const start = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => onText(Array.from(e.results, (res) => res[0].transcript).join(""));
    r.onerror = (e) => setError(e.error === "not-allowed" ? "Microphone access was blocked." : "Dictation stopped.");
    r.onend = () => setListening(false);
    ref.current = r;
    setError(null);
    setListening(true);
    r.start();
  }, [onText]);

  const stop = useCallback(() => ref.current?.stop(), []);

  useEffect(() => () => ref.current?.stop(), []);

  return { supported, listening, error, start, stop };
}

/** Strips markdown so the voice reads words, not symbols. */
export function toSpeakable(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " (code block) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[(\d+)\]/g, "")
    .replace(/^\s*[#>|-]+\s*/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Text to speech: one reply at a time; speaking another stops the first. */
export function useSpeaker() {
  const supported = useBrowserSupport(() => "speechSynthesis" in window);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const toggle = useCallback(
    (id: string, text: string) => {
      const synth = window.speechSynthesis;
      synth.cancel();
      if (speakingId === id) return setSpeakingId(null);
      const u = new SpeechSynthesisUtterance(toSpeakable(text));
      u.lang = navigator.language || "en-US";
      u.onend = u.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
      setSpeakingId(id);
      synth.speak(u);
    },
    [speakingId],
  );

  return { supported, speakingId, toggle };
}
