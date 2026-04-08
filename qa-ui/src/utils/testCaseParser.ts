import { TestCaseResponse } from "../services/apiService";

export type StepStatus = "Parsed" | "Needs Review" | "Missing Data";
export type ActionType = "click" | "input" | "select" | "verify" | "wait" | "navigate";

export interface ParsedStep {
  stepId: string;
  stepIndex: number;
  stepNumber: number;
  description: string;
  action: string;
  wait: string;
  status: StepStatus;
  confidence: number;
  assertion?: string;
}

export interface ParsedTestCase extends Omit<TestCaseResponse, "steps"> {
  parsedSteps: ParsedStep[];
  uiStatus: StepStatus;
}

const ACTION_KEYWORDS: Record<ActionType, RegExp> = {
  click: /\b(click|tap|press|select|choose|open|navigate|go to|visit)\b/i,
  input: /\b(enter|type|fill|set|input|provide|write)\b/i,
  select: /\b(select|choose|pick|dropdown|option)\b/i,
  verify: /\b(verify|assert|confirm|check|expect|validate|ensure)\b/i,
  wait: /\b(wait|pause|sleep|delay|load|appear|visible|ready)\b/i,
  navigate: /\b(log into|login|navigate|go to|visit)\b/i
};

function normalizeLine(raw: string): string {
  if (!raw) return "";

  let text = raw
    .replace(/\u2022/g, ";")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00A0/g, " ")
    .replace(/\\[a-zA-Z]+\s*/g, "")
    .replace(/PAGEREF[^\n\r]*/gi, "")
    .replace(/HYPERLINK[^\n\r]*/gi, "")
    .replace(/Table of Contents/gi, "")
    .replace(/TOC\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\p{C}]/gu, " ")
    .trim();

  text = text.replace(/^\s*[\d*•-]+\s*/g, "").trim();
  text = text.replace(/^[-–—•]+\s*/g, "").trim();
  text = text.replace(/[\s\t]+/g, " ").trim();

  return text;
}

function isGarbageLine(line: string): boolean {
  if (!line) return true;
  const normalized = line.trim().toLowerCase();
  if (normalized.length < 3) return true;

  const garbagePatterns = [
    /^toc\b/,
    /^table of contents\b/,
    /^page\s*\d+/,
    /^chapter\s*\d+/,
    /\bpageref\b/,
    /\bhyperlink\b/,
    /^contents\b/,
    /^(?:\d+\.?\s*)?\u2022?\s*$/
  ];

  return garbagePatterns.some((pattern) => pattern.test(normalized));
}

export interface StepDescription {
  stepNumber: number;
  description: string;
  waitText: string;
}

/**
 * Extract wait/condition text from descriptions
 * e.g., "wait for 5-10 sec", "Please wait for 5-10sec"
 */
function extractWaitText(description: string): { description: string; wait: string } {
  const waitPatterns = [
    /\.\s*(?:Note:|please\s+)?(?:wait|please wait|pause)(?:\s+for)?\s+([^.]+?)(?:\.|\s+for\s+|$)/gi,
    /(?:Please\s+)?[Ww]ait\s+([^.!?]+?)(?=[.!?]|$)/g,
    /\(.*?(wait|pause|delay).*?(\d+\s*(?:sec|seconds|ms))\s*\)/gi
  ];

  let wait = "";
  let cleanedDescription = description;

  for (const pattern of waitPatterns) {
    const match = pattern.exec(description);
    if (match) {
      wait = match[1] || match[0];
      cleanedDescription = description.replace(pattern, "").trim();
      break;
    }
  }

  return { description: cleanedDescription, wait: wait.trim() };
}

function splitStepDescriptions(rawSteps: string): StepDescription[] {
  if (!rawSteps) return [];

  console.log("🔍splitStepDescriptions - Raw steps length:", rawSteps.length);
  console.log("🔍 Raw (first 150 chars):", rawSteps.substring(0, 150));

  // Clean up the input first
  let cleaned = rawSteps
    .replace(/[\r\n]+/g, " ") // Replace line breaks with spaces
    .replace(/\s{2,}/g, " ") // Replace multiple spaces with single space
    .trim();

  console.log("🔍 Cleaned length:", cleaned.length);
  console.log("🔍 Cleaned (first 150 chars):", cleaned.substring(0, 150));

  // Remove unwanted prefixes/patterns
  cleaned = cleaned
    .replace(/^(?:Test\s+)?[Ss]teps?[\s:]*-?\s*/i, "")
    .replace(/^(steps?|test steps?)\s*[:-]?\s*/i, "")
    .trim();

  // Try to match numbered steps: "1. ... 2. ... 3. ..." or "1) ... 2) ..."
  const numberedRegex = /(\d+)[\.\)]\s*(.+?)(?=(?:\d+[\.\)]\s*)|$)/gs;
  const numberedMatches: StepDescription[] = [];
  let match;

  console.log("🔍 Testing numbered regex on:", cleaned.substring(0, 100));

  while ((match = numberedRegex.exec(cleaned)) !== null) {
    console.log(`✅ Matched step ${match[1]}: ${match[2].trim().substring(0, 80)}`);
    let stepText = match[2].trim();

    // Remove "Current Version: ..." from the step
    stepText = stepText.replace(/\s*Current\s+Version\s*[:\-]?\s*[^\s]*/gi, "").trim();

    // Remove "Note: ..." from the step
    stepText = stepText.replace(/\s*Note\s*:\s*.+?(?=\.|$)/gi, "").trim();

    // Clean up extra quotes and symbols
    stepText = stepText
      .replace(/['""`""]|<|>/g, "'")
      .replace(/[']{2,}/g, "'")
      .replace(/\s+['"]\s*(?:with|and)/gi, " with")
      .trim();

    // Extract wait/condition text
    const { description: cleanedDescription, wait: waitText } = extractWaitText(stepText);

    if (cleanedDescription && cleanedDescription.length > 2) {
      numberedMatches.push({
        stepNumber: parseInt(match[1], 10),
        description: cleanedDescription.trim(),
        waitText: waitText
      });
    }
  }

  console.log(`📊 Found ${numberedMatches.length} numbered steps`);

  // If we found numbered steps, return them
  if (numberedMatches.length > 0) {
    console.log("✅ Returning numbered steps");
    return numberedMatches;
  }

  // Fallback 1: split by semicolons, bullets, line breaks
  const segments = cleaned
    .split(/[;\u2022•\r\n]+/)
    .map(normalizeLine)
    .filter((item) => Boolean(item) && !isGarbageLine(item));

  if (segments.length > 1) {
    console.log(`⚠️ Fallback 1: Using ${segments.length} segments`);
    return segments.map((desc, index) => {
      const { description, wait } = extractWaitText(desc);
      return { stepNumber: index + 1, description, waitText: wait };
    });
  }

  // Fallback 2: split by sentence-ending punctuation (with or without spaces)
  const sentenceSegments = cleaned
    .split(/(?<=[.!?])\s*/)
    .map(normalizeLine)
    .filter((item) => Boolean(item) && !isGarbageLine(item));

  if (sentenceSegments.length > 1) {
    console.log(`⚠️ Fallback 2: Using ${sentenceSegments.length} sentences`);
    return sentenceSegments.map((desc, index) => {
      const { description, wait } = extractWaitText(desc);
      return { stepNumber: index + 1, description, waitText: wait };
    });
  }

  // Fallback 3: treat entire text as single step
  console.log("❌ No split strategy worked - returning as single step");
  const { description, wait } = extractWaitText(cleaned);
  return [{ stepNumber: 1, description, waitText: wait }];
}

export function getStepDescriptions(testCase: TestCaseResponse): StepDescription[] {
  if (testCase.stepList && testCase.stepList.length > 0) {
    return testCase.stepList.map((desc, index) => {
      const { description, wait } = extractWaitText(desc);
      return { stepNumber: index + 1, description, waitText: wait };
    });
  }
  return splitStepDescriptions(testCase.steps ?? "");
}

function detectActionType(step: string): string {
  const normalized = step.trim();

  // Priority checks as per requirements
  if (/\blog into\b/i.test(normalized) || /https?:\/\/[^\s]+/i.test(normalized)) {
    return "Navigate";
  }
  if (/\bclick\b/i.test(normalized)) {
    return "Click";
  }
  if (/\b(enter|fill)\b/i.test(normalized)) {
    return "Input";
  }
  if (/\bverify\b/i.test(normalized)) {
    return "Assert";
  }

  // Fallback to existing keyword matching
  const found = (Object.entries(ACTION_KEYWORDS) as [ActionType, RegExp][])?.find(([, matcher]) => matcher.test(normalized));
  const actionType = found?.[0] ?? "click";

  // Map to user-friendly strings
  switch (actionType) {
    case "click": return "Click";
    case "input": return "Input";
    case "select": return "Select";
    case "verify": return "Assert";
    case "wait": return "Wait";
    case "navigate": return "Navigate";
    default: return "Click";
  }
}

function detectStatus(step: string): StepStatus {
  const normalized = step.trim().toLowerCase();
  if (!normalized) return "Missing Data";
  if (normalized.includes("?") || normalized.includes("optional") || normalized.includes("may") || normalized.includes("if present")) {
    return "Needs Review";
  }
  return "Parsed";
}

function buildConfidence(status: StepStatus): number {
  switch (status) {
    case "Parsed":
      return 92;
    case "Needs Review":
      return 68;
    default:
      return 42;
  }
}

export function cleanDocxText(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((line) => !isGarbageLine(line))
    .join("; ");
}

export function createParsedCases(testCases: TestCaseResponse[]): ParsedTestCase[] {
  console.log("🔍 createParsedCases received:", {
    count: testCases.length,
    items: testCases.map(tc => ({ id: tc.id, title: tc.title, stepsLength: tc.steps?.length ?? 0, stepListLength: tc.stepList?.length ?? 0 }))
  });

  return testCases.map((testCase) => {
    const stepDescriptions = getStepDescriptions(testCase);

    console.log(`  Case ${testCase.id} (${testCase.title}): ${stepDescriptions.length} steps parsed`);

    const parsedSteps = stepDescriptions.map((step) => {
      const status = detectStatus(step.description);
      return {
        stepId: `${testCase.id}-${step.stepNumber}`,
        stepIndex: step.stepNumber - 1,
        stepNumber: step.stepNumber,
        description: step.description,
        action: detectActionType(step.description),
        wait: step.waitText || "",
        status,
        confidence: buildConfidence(status),
        assertion: ""
      };
    });

    const uiStatus = parsedSteps.some((step) => step.status === "Missing Data")
      ? "Missing Data"
      : parsedSteps.some((step) => step.status === "Needs Review")
      ? "Needs Review"
      : "Parsed";

    return {
      ...testCase,
      parsedSteps,
      uiStatus
    };
  });
}
