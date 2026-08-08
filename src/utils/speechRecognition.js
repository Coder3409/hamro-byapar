export function getSpeechRecognitionConstructor(target = globalThis) {
  return target?.SpeechRecognition || target?.webkitSpeechRecognition || null;
}

export function recognitionLanguage(lang) {
  return lang === 'ne' ? 'ne-NP' : 'en-US';
}

export function configureRecognition(recognition, locale) {
  recognition.lang = locale;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;
  return recognition;
}

export function shouldFallbackRecognitionLanguage(error, lang, fallbackAttempted) {
  return error === 'language-not-supported' && lang === 'ne' && !fallbackAttempted;
}

export function microphoneErrorKey(error) {
  const name = error?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'voicePermissionDenied';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'voiceMicrophoneMissing';
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'voiceMicrophoneBusy';
  return 'voiceRecognitionFailed';
}

export function recognitionErrorKey(code) {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'voicePermissionDenied';
  if (code === 'no-speech') return 'voiceNoSpeech';
  if (code === 'audio-capture') return 'voiceMicrophoneMissing';
  if (code === 'network') return 'voiceNetworkError';
  if (code === 'aborted') return 'voiceCancelled';
  if (code === 'language-not-supported') return 'voiceLanguageUnsupported';
  return 'voiceRecognitionFailed';
}

export async function requestMicrophonePermission(mediaDevices = globalThis.navigator?.mediaDevices) {
  if (!mediaDevices?.getUserMedia) return;
  const stream = await mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
}
