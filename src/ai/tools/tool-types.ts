import { JerryRuntimeContext } from "../orchestrator/jerry-runtime-context";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: any; // zod toJsonSchema output or raw JSON schema
    strict?: boolean;
  };
}

export interface JerryTool<TInput = any, TOutput = any> {
  name: string;
  definition: ToolDefinition;
  execute: (input: TInput, context: JerryRuntimeContext) => Promise<TOutput>;
}
