import { HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import newsTool from "src/tools/general/news";
import createAgent from "utils/createagent";
import { PlanExecuteState } from "utils/planExecuteState";

export default async function NewsAgent(llm: any) {
    const newsAgent = await createAgent(
        llm,
        [newsTool],
        'Provide news summary to the user. Use instructions and update response.',
    );

    async function newsNode(state: PlanExecuteState, config?: RunnableConfig) {
        const task = state.instructions;

        const humanMessage = new HumanMessage(task);

        const input = {
            messages: humanMessage,
        };
        const result = await newsAgent.invoke(input, config);
        return {
            pastSteps: [[task, result.output]],
            plan: state.plan.slice(1),
        };
    }
    return newsNode;
}
