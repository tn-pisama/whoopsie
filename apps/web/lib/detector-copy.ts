// Plain-English titles for each detector. Shown to vibe coders in the
// dashboard; the technical detector name and `summary` field are still
// available as secondary details.

interface DetectorCopy {
  title: string;
  /** One-line description for tooltips / list views. */
  blurb: string;
}

const COPY: Record<string, DetectorCopy> = {
  loop: {
    title: "Stuck in a loop",
    blurb: "Your agent kept calling the same tool over and over.",
  },
  repetition: {
    title: "Repeating itself",
    blurb: "The reply text repeats the same phrase or line.",
  },
  cost: {
    title: "Burning tokens",
    blurb: "A single call used a lot of tokens or money.",
  },
  completion: {
    title: "Stopped early or ran away",
    blurb: "The reply ended too short on a real question, or kept going past 4k tokens.",
  },
  hallucination: {
    title: "Made something up",
    blurb: "The reply named things that aren't in the sources you gave it.",
  },
  context: {
    title: "Ignored the user's context",
    blurb: "The reply doesn't reflect any of the keywords from the context block.",
  },
  derailment: {
    title: "Did the wrong thing",
    blurb: "The tools called don't match the task in the prompt.",
  },
};

const FALLBACK: DetectorCopy = {
  title: "Something off",
  blurb: "A detector flagged this trace.",
};

export function detectorCopy(name: string): DetectorCopy {
  return COPY[name] ?? FALLBACK;
}
