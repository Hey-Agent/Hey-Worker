import { RunnableConfig } from "@langchain/core/runnables";
import calculatorTool from "src/tools/general/calculator";
import createAgent from "utils/createagent";
import { runAgentNode } from "utils/runAgentNode";

export default async function GeneralAgent(llm: any) {
    // Research agent and node
    const generalAgent = await createAgent(
        llm,
        [calculatorTool],
        "Provide general answers to the user",
    );

    // Config is needed for RunnableConfig
    async function generalNode(state, config: RunnableConfig) {
        return runAgentNode({
            state: state,
            agent: generalAgent,
            name: "General",
        });
    }
    return generalNode;
}