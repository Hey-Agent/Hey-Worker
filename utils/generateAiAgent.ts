import { ChatAnthropic } from "@langchain/anthropic";
import { ChatFireworks } from "@langchain/community/chat_models/fireworks";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatOpenAI } from "@langchain/openai";
import { LLMOptions } from "config/types/llmOptions";

export default function generateLLM(aiModel: string, llmOptions: LLMOptions): any {
    let llm;
    switch (aiModel) {
        case "ChatOpenAI":
            llmOptions.model = "gpt-4";
            llm = new ChatOpenAI(llmOptions);
            break;
        case "AzureChatOpenAI":
            llm = new ChatOpenAI(llmOptions);
            break;
        case "ChatAnthropic":
            llmOptions.model = "claude-3-sonnet-20240229";
            llm = new ChatAnthropic(llmOptions);
            break;
        case "ChatMistralAI":
            llmOptions.model = "mistral-large-latest";
            llm = new ChatMistralAI(llmOptions);
            break;
        case "ChatFireworks":
            llmOptions.model = "accounts/fireworks/models/firefunction-v1";
            llm = new ChatFireworks(llmOptions);
            break;
        default:
            throw new Error(`Invalid default AI: ${aiModel}`);
    }
    return llm;
}