import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { END } from "@langchain/langgraph";
import calculatorTool from "src/tools/general/calculator";
import createAgent from "utils/createagent";
import { PlanExecuteState } from 'utils/planExecuteState';

export default async function SummarizerAgent(llm: any) {
    const summarizerAgent = await createAgent(
        llm,
        [calculatorTool],
        `Below is a conversation between a human and multiple AI agents. Summarize the AI response so it is a single unified response to the user. Do not add filler words or mention that this is a summary. Do not re-mention the questions. Do not use markdown or LaTeX Syntax.`,
    );

    async function summarizerNode(state: PlanExecuteState, config?: RunnableConfig) {
        let AiMessages = "";
        state.pastSteps.forEach(step => {
            AiMessages += step[1] + "\n";
        });
        const input = {
            // messages: [new HumanMessage(state.plan[0]['instructions']), new AIMessage(AiMessages)]
            messages: [new HumanMessage(state.input), new AIMessage(AiMessages)]
        };

        const result = await summarizerAgent.invoke(input, config);

        return {
            response: result.output,
            next: END,
        };
    }
    return summarizerNode;
}