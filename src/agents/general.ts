import { HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import calculatorTool from "src/tools/general/calculator";
import createAgent from "utils/createagent";
import { AgentStateChannels } from "utils/state";

export default async function GeneralAgent(llm: any) {
    const generalAgent = await createAgent(
        llm,
        [calculatorTool],
        "Provide general answers to the user",
    );

    // Config is needed for RunnableConfig
    async function generalNode(state: AgentStateChannels, config?: RunnableConfig) {
        const result = await generalAgent.invoke(state, config);
        console.log(result.output);
        return {
            messages: [
                new HumanMessage({ content: result.output, name: "General" }),
            ],
        };
    }
    return generalNode;
}