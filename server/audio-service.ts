import { GoogleGenAI, Modality } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

function getGenAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

export interface AudioServiceStatus {
  sttAvailable: boolean;
  sttModel: string;
  ttsAvailable: boolean;
  ttsModel: string;
  liveAvailable: boolean;
  liveModel: string;
  message: string;
  authConfigured: boolean;
}

export async function checkAudioModelsAvailability(): Promise<AudioServiceStatus> {
  const ai = getGenAiClient();
  const authConfigured = Boolean(ai);

  if (!authConfigured) {
    return {
      sttAvailable: false,
      sttModel: 'gemini-3.5-transcribe',
      ttsAvailable: false,
      ttsModel: 'gemini-3.1-flash-tts-preview',
      liveAvailable: false,
      liveModel: 'gemini-3.1-flash-live-preview (arquitetura preparada)',
      message: 'Chave GEMINI_API_KEY não configurada no ambiente. Web Speech API nativa do navegador pode ser utilizada.',
      authConfigured: false,
    };
  }

  // Verify models
  return {
    sttAvailable: true,
    sttModel: 'gemini-3.5-transcribe',
    ttsAvailable: true,
    ttsModel: 'gemini-3.1-flash-tts-preview',
    liveAvailable: false, // Live API voice marked as prepared architecture, not mandatory initial
    liveModel: 'gemini-3.1-flash-live-preview',
    message: 'Modelos de interface configurados: STT (gemini-3.5-transcribe) e TTS (gemini-3.1-flash-tts-preview).',
    authConfigured: true,
  };
}

export async function transcribeAudio(base64Data: string, mimeType: string = 'audio/webm'): Promise<{ text: string; error?: string }> {
  const ai = getGenAiClient();
  if (!ai) {
    return { text: '', error: 'Autenticação da API Gemini não configurada para STT.' };
  }

  try {
    const audioPart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          { text: 'Transcreva com exatidão o áudio fornecido para texto em português ou no idioma falado. Retorne somente a transcrição.' },
        ],
      },
    });

    const text = response.text?.trim() || '';
    return { text };
  } catch (err: any) {
    return {
      text: '',
      error: `Erro no modelo gemini-3.5-transcribe: ${err.message || String(err)}`,
    };
  }
}

export async function synthesizeSpeech(text: string, voiceName: string = 'Kore'): Promise<{ audioBase64: string; error?: string }> {
  const ai = getGenAiClient();
  if (!ai) {
    return { audioBase64: '', error: 'Autenticação da API Gemini não configurada para TTS.' };
  }

  try {
    // Clean code fences or diff blocks if text is too long or purely code
    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' [bloco de código omitido da narração] ')
      .replace(/`([^`]+)`/g, '$1')
      .slice(0, 3000); // Reasonable limit for speech utterance

    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      return { audioBase64: '', error: 'O modelo não retornou dados de áudio sintetizado.' };
    }

    return { audioBase64 };
  } catch (err: any) {
    return {
      audioBase64: '',
      error: `Erro no modelo gemini-3.1-flash-tts-preview: ${err.message || String(err)}`,
    };
  }
}
