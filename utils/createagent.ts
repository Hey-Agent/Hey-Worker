import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";


async function createAgent(
    llm: BaseChatModel,
    tools: any[],
    systemPrompt: string,
): Promise<Runnable> {

    if (tools.length == 0) {
        return ChatPromptTemplate.fromTemplate(systemPrompt).pipe(llm);
    }

    // Each worker node will be given a name and some tools.
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        new MessagesPlaceholder("messages"),
        new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const agent = createToolCallingAgent({ llm, tools, prompt });

    return new AgentExecutor({ agent, tools });
};

export default createAgent;