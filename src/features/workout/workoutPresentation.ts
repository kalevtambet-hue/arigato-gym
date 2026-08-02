import type { RepMode, SetResultRecord } from '../../db/types';
import { isDurationMode, isRangeMode } from '../../domain/targetMode';

const estonianNumberFormatter = new Intl.NumberFormat('et-EE', {
  maximumFractionDigits: 2,
});

export function clampRepValue(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function getRepStepperPresentation(repMode: RepMode, minimum: number, maximum: number) {
  const isRange = isRangeMode(repMode);

  return {
    minimum,
    maximum: isRange ? maximum : minimum,
    targetValue: isRange ? maximum : minimum,
    step: 1,
  };
}

export function getProgressionRecommendationCopy({
  repMode,
  successesRequired,
  weightStep,
}: Pick<
  {
    repMode: RepMode;
    successesRequired: number;
    weightStep: number;
  },
  'repMode' | 'successesRequired' | 'weightStep'
>) {
  const successTarget = isRangeMode(repMode)
    ? isDurationMode(repMode)
      ? 'kestusvahemiku ülemise piirini'
      : 'vahemiku ülemise piirini'
    : 'sihini';
  const consecutiveSuccesses = estonianNumberFormatter.format(Math.max(successesRequired, 1));
  const formattedStep = estonianNumberFormatter.format(weightStep);
  const progression = isDurationMode(repMode)
    ? `pikeneb järgmine kestussiht ${formattedStep} min võrra`
    : `suureneb järgmisel sihil raskus ${formattedStep} kg võrra`;

  return `Kui kõik seeriad jõuavad ${successTarget} ${consecutiveSuccesses} järjestikusel sama sihiga treeningul, ${progression}.`;
}

export function getSessionCompletionKind(
  plannedSetCount: number,
  results: ReadonlyArray<Pick<SetResultRecord, 'setNumber'>>,
): 'completed' | 'partial' {
  const completedSetNumbers = new Set(results.map((result) => result.setNumber));

  for (let setNumber = 1; setNumber <= plannedSetCount; setNumber += 1) {
    if (!completedSetNumbers.has(setNumber)) {
      return 'partial';
    }
  }

  return 'completed';
}
