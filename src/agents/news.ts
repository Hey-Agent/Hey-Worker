import { HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import newsTool from "src/tools/general/news";
import createAgent from "utils/createagent";
import { AgentStateChannels } from "utils/state";

export default async function NewsAgent(llm: any) {
    const newsAgent = await createAgent(
        llm,
        [newsTool],
        'Provide news summary to the user',
    );

    async function newsNode(state: AgentStateChannels, config?: RunnableConfig) {
        const result = await newsAgent.invoke(state, config);
        console.log(result.output);
        return {
            messages: [
                new HumanMessage({ content: result.output, name: "News" }),
            ],
        };
    }
    return newsNode;
}
