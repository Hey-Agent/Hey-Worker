import { HumanMessage } from "@langchain/core/messages";

export const isToolMessage = (message) => !!message?.additional_kwargs?.tool_calls;

// Helper function to run a node for a given agent
export async function runAgentNode({ state, agent, name }) {
    let result = await agent.invoke(state);
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