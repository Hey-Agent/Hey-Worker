import { BaseMessage } from "@langchain/core/messages";
import { StateGraphArgs } from "@langchain/langgraph";
export interface PlanExecuteState {
    messages: BaseMessage[];
    input: string;
    plan: string[];
    pastSteps: [string, string][];
    response?: string;
    next: string;
    instructions: string;
}

export const planExecuteState: StateGraphArgs<PlanExecuteState>["channels"] = {
    messages: {
        value: (x?: BaseMessage[], y?: BaseMessage[]) => (x ?? []).concat(y ?? []),
        default: () => [],
    },
    input: {
        value: (left?: string, right?: string) => right ?? left ?? "",
    },
    plan: {
        value: (x?: string[], y?: string[]) => y ?? x ?? [],
        default: () => [],
    },
    pastSteps: {
        value: (x: [string, string][], y: [string, string][]) => x.concat(y),
        default: () => [],
    },
    response: {
        value: (x?: string, y?: string) => y ?? x,
        default: () => undefined,
    },
    next: {
        value: (x?: string, y?: string) => y ?? x ?? 'replanner',
        default: () => 'replanner',
    },
    instructions: {
        value: (x: string, y?: string) => y ?? x,
        default: () => "Solve the human's question.",
    },
};