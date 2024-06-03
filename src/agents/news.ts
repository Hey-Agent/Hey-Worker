import { HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { END } from "@langchain/langgraph";
import newsTool from "src/tools/general/news";
import createAgent from "utils/createagent";
import { PlanExecuteState } from "utils/planExecuteState";

export default async function NewsAgent(llm: any) {
    const newsAgent = await createAgent(
        llm,
        [newsTool],
        'Provide news summary to the user. Do not use markdown or LaTeX Syntax.',
    );

    async function newsNode(state: PlanExecuteState, config?: RunnableConfig) {
        const task = state.plan[0]['instructions'];

        const input = {
            messages: [new HumanMessage(task)],
        };
        const result = await newsAgent.invoke(input, config);

        const newPlan = state.plan.slice(1);
        let nextAgent = 'Summarizer';

        if (newPlan.length > 0) {
            nextAgent = newPlan[0]['agent'];
        }

        if (state.pastSteps.length == 0 && nextAgent == 'Summarizer') {
            return {
                response: result.output,
                next: END
            };
        }
        return {
            pastSteps: [[task, result.output]],
            plan: newPlan,
            next: nextAgent
        };
    }
    return newsNode;
}
