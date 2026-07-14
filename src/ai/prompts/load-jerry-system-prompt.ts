import "server-only";
import * as fs from "fs";
import * as path from "path";

let cachedPrompt: string | null = null;

export function loadJerrySystemPrompt(): string {
  if (cachedPrompt !== null) {
    return cachedPrompt;
  }

  const promptPath = path.join(process.cwd(), "src", "ai", "prompts", "jerry-system.v0.1.md");

  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt file not found at path: ${promptPath}`);
  }

  const content = fs.readFileSync(promptPath, "utf-8");

  if (!content || content.trim().length === 0) {
    throw new Error(`Prompt file is empty at path: ${promptPath}`);
  }

  cachedPrompt = content;
  return cachedPrompt;
}
