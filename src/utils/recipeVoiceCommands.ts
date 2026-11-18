/**
 * Parser inteligente de comandos de voz en español para el modo cocina y navegación de pasos.
 * 
 * Soporta expresiones naturales:
 * - "pasa al siguiente paso", "siguiente paso", "avanza", "continúa"
 * - "pasa al paso 4", "ve al paso 2", "ir al paso tres", "salta al paso 5", "paso 1"
 * - "paso anterior", "anterior", "vuelve al paso anterior", "atrás"
 * - "repite el paso", "repite", "repetir", "otra vez"
 * - "inicia el temporizador", "pausar"
 */

export type RecipeVoiceCommandType =
  | 'NEXT_STEP'
  | 'PREV_STEP'
  | 'GO_TO_STEP'
  | 'REPEAT_STEP'
  | 'START_TIMER'
  | 'PAUSE_TIMER'
  | 'UNKNOWN';

export interface RecipeVoiceCommand {
  type: RecipeVoiceCommandType;
  stepNumber?: number; // 1-based step number
  feedbackMessage: string;
  raw: string;
}

const SPANISH_NUMBER_WORDS: Record<string, number> = {
  uno: 1,
  primer: 1,
  primero: 1,
  primera: 1,
  dos: 2,
  segundo: 2,
  segunda: 2,
  tres: 3,
  tercer: 3,
  tercero: 3,
  tercera: 3,
  cuatro: 4,
  cuarto: 4,
  cuarta: 4,
  cinco: 5,
  quinto: 5,
  quinta: 5,
  seis: 6,
  sexto: 6,
  sexta: 6,
  siete: 7,
  séptimo: 7,
  septimo: 7,
  séptima: 7,
  ocho: 8,
  octavo: 8,
  octava: 8,
  nueve: 9,
  noveno: 9,
  novena: 9,
  diez: 10,
  décimo: 10,
  decimo: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
};

export function parseRecipeVoiceCommand(
  rawTranscript: string,
  totalSteps: number = 10
): RecipeVoiceCommand {
  const text = (rawTranscript || '').trim().toLowerCase();

  if (!text) {
    return {
      type: 'UNKNOWN',
      feedbackMessage: 'No se detectó ninguna instrucción de voz.',
      raw: text,
    };
  }

  // 1. Comando directo a un paso específico ("pasa al paso 4", "ve al paso dos", "salta al paso 3", etc.)
  // Patrón A: "pasa al paso X", "ir al paso X", "ve al paso X", "salta al paso X", "pon el paso X", "paso número X", "paso X"
  const stepTargetRegex =
    /(?:pasa\s+(?:al|a\s+el)?\s*paso|ve\s+(?:al|a\s+el)?\s*paso|ir\s+(?:al|a\s+el)?\s*paso|salta\s+(?:al|a\s+el)?\s*paso|saltar\s+(?:al|a\s+el)?\s*paso|pon\s+(?:el)?\s*paso|cambia\s+(?:al|a\s+el)?\s*paso|paso\s*(?:n[uú]mero)?)\s*(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince)/i;
  const match = text.match(stepTargetRegex);

  if (match && match[1]) {
    const rawVal = match[1].toLowerCase();
    let targetNum: number | undefined;

    if (/^\d+$/.test(rawVal)) {
      targetNum = parseInt(rawVal, 10);
    } else if (SPANISH_NUMBER_WORDS[rawVal] !== undefined) {
      targetNum = SPANISH_NUMBER_WORDS[rawVal];
    }

    if (targetNum !== undefined) {
      if (targetNum < 1) targetNum = 1;
      if (totalSteps && targetNum > totalSteps) targetNum = totalSteps;

      return {
        type: 'GO_TO_STEP',
        stepNumber: targetNum,
        feedbackMessage: `Saltando al paso ${targetNum}`,
        raw: text,
      };
    }
  }

  // Patrón B: Ordinales directos ("al primer paso", "cuarto paso", "tercer paso")
  const ordinalMatch = text.match(
    /(?:al|el)?\s*(primer|primero|segundo|tercer|tercero|cuarto|quinto|sexto|s[eé]ptimo|octavo|noveno|d[eé]cimo)\s+paso/i
  );
  if (ordinalMatch && ordinalMatch[1]) {
    const ordWord = ordinalMatch[1].toLowerCase();
    const targetNum = SPANISH_NUMBER_WORDS[ordWord];
    if (targetNum !== undefined) {
      const validNum = totalSteps && targetNum > totalSteps ? totalSteps : targetNum;
      return {
        type: 'GO_TO_STEP',
        stepNumber: validNum,
        feedbackMessage: `Cambiando al paso ${validNum}`,
        raw: text,
      };
    }
  }

  // 2. Avanzar al siguiente paso
  if (
    text.includes('siguiente') ||
    text.includes('avanza') ||
    text.includes('avanzar') ||
    text.includes('adelante') ||
    text.includes('continua') ||
    text.includes('continúa') ||
    text.includes('próximo') ||
    text.includes('proximo')
  ) {
    return {
      type: 'NEXT_STEP',
      feedbackMessage: 'Avanzando al siguiente paso',
      raw: text,
    };
  }

  // 3. Retroceder al paso anterior
  if (
    text.includes('anterior') ||
    text.includes('atras') ||
    text.includes('atrás') ||
    text.includes('retrocede') ||
    text.includes('retroceder') ||
    text.includes('regresa') ||
    text.includes('regresar')
  ) {
    return {
      type: 'PREV_STEP',
      feedbackMessage: 'Volviendo al paso anterior',
      raw: text,
    };
  }

  // 4. Repetir paso actual
  if (
    text.includes('repite') ||
    text.includes('repetir') ||
    text.includes('otra vez') ||
    text.includes('de nuevo') ||
    text.includes('léelo') ||
    text.includes('leelo')
  ) {
    return {
      type: 'REPEAT_STEP',
      feedbackMessage: 'Repitiendo paso actual',
      raw: text,
    };
  }

  // 5. Controles de temporizador
  if (
    text.includes('iniciar') ||
    text.includes('arranca') ||
    text.includes('comenzar') ||
    text.includes('empieza') ||
    text.includes('start')
  ) {
    return {
      type: 'START_TIMER',
      feedbackMessage: 'Temporizador iniciado',
      raw: text,
    };
  }

  if (
    text.includes('pausar') ||
    text.includes('detener') ||
    text.includes('para') ||
    text.includes('alto') ||
    text.includes('stop')
  ) {
    return {
      type: 'PAUSE_TIMER',
      feedbackMessage: 'Temporizador pausado',
      raw: text,
    };
  }

  return {
    type: 'UNKNOWN',
    feedbackMessage: `No se reconoció la orden. Prueba diciendo «pasa al siguiente paso» o «ve al paso 4».`,
    raw: text,
  };
}
