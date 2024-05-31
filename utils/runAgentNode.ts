import { HumanMessage } from "@langchain/core/messages";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { AgentStateChannels } from "./state";

export const isToolMessage = (message) => !!message?.additional_kwargs?.tool_calls;

/**
 * Runs an agent and returns the result as a message.
 *
 * @param state - The current state to pass to the agent.
 * @param agent - The agent to invoke.
 * @param name - The name of the agent.
 * @returns An object containing the agent's messages and the sender.
 */
export async function runAgentNode(props: {
    state: AgentStateChannels;
    agent: Runnable;
    name: string;
    config?: RunnableConfig;
}) {
    const { state, agent, name, config } = props;
    let result = await agent.invoke(state, config);
    // We convert the agent output into a format that is suitable
    // to append to the global state
    if (!isToolMessage(result)) {
        // If the agent is NOT calling a tool, we want it to
        // look like a human message.
        result = new HumanMessage({ ...result, name: name });
    }
    return {
        messages: [result],
        // Since we have a strict workflow, we can
        // track the sender so we know who to pass to next.
        sender: name,
    };
}
