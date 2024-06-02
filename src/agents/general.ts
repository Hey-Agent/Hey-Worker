import { HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import calculatorTool from "src/tools/general/calculator";
import createAgent from "utils/createagent";
import { PlanExecuteState } from 'utils/planExecuteState';

export default async function GeneralAgent(llm: any) {
    const generalAgent = await createAgent(
        llm,
        [calculatorTool],
        "You are helpful agent. Solve the question with the tools available to you.",
    );

    // Config is needed for RunnableConfig
    async function generalNode(state: PlanExecuteState, config?: RunnableConfig) {
        const task = state.instructions;

        const humanMessage = new HumanMessage(task);

        const input = {
            messages: humanMessage,
        };

        const result = await generalAgent.invoke(input, config);
        return {
            pastSteps: [[task, result.output]],
            plan: state.plan.slice(1),
        };
    }
    return generalNode;
}