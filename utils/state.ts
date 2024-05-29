import { BaseMessage } from "@langchain/core/messages";

const upsertKeys = (
    left?: Record<string, string>,
    right?: Record<string, string>
) => {
    if (!left) {
        left = {};
    }
    if (!right) {
        return left;
    }
    return { ...left, ...right };
};

export interface AgentStateChannels {
    messages: {
        value: (x: BaseMessage[], y: BaseMessage[]) => BaseMessage[];
        default: () => BaseMessage[];
    };
    // The agent node that last performed work
    sender: string;
}

// This defines the object that is passed between each node
// in the graph. We will create different nodes for each agent and tool
export const agentStateChannels: AgentStateChannels = {
    messages: {
        value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
        default: () => [],
    },
    sender: 'user',
};
