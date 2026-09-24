/**
 * Thin wrapper over the browser's Web Speech API. Works in Chrome, Edge and
 * Safari (iOS 14.5+) without any key. Firefox has no implementation, so the
 * capture form always keeps a typed path.
 */

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function ctor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const speechSupported = (): boolean => !!ctor();

export interface Listener {
  stop: () => void;
}

export interface ListenOptions {
  lang?: string;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}

/** Starts listening. Final segments accumulate into one transcript passed to onFinal on each update. */
export function listen(opts: ListenOptions): Listener | undefined {
  const C = ctor();
  if (!C) {
    opts.onError('Speech recognition is not available in this browser. Type instead.');
    return undefined;
  }
  const rec = new C();
  rec.lang = opts.lang ?? 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]!;
      if (r.isFinal) finalText += (finalText ? ' ' : '') + r[0].transcript.trim();
      else interim += r[0].transcript;
    }
    opts.onInterim(interim);
    if (finalText) opts.onFinal(finalText);
  };
  rec.onerror = (e) => {
    const msg =
      e.error === 'not-allowed'
        ? 'Microphone access was blocked. Allow it in the browser and try again.'
        : e.error === 'no-speech'
          ? 'No speech heard. Try again closer to the phone.'
          : e.error === 'network'
            ? 'Speech recognition needs a network connection.'
            : `Speech error: ${e.error}`;
    opts.onError(msg);
  };
  rec.onend = () => opts.onEnd();
  try {
    rec.start();
  } catch (err) {
    opts.onError(err instanceof Error ? err.message : 'Could not start listening.');
    return undefined;
  }
  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}
