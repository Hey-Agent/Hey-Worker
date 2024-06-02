import { ChatAnthropic } from "@langchain/anthropic";
import { ChatFireworks } from "@langchain/community/chat_models/fireworks";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGroq } from "@langchain/groq";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatOpenAI } from "@langchain/openai";
import { LLMOptions } from "config/types/llmOptions";


export default function generateLLM(
    aiModel: string,
    llmOptions: LLMOptions,
): BaseChatModel {
    let llm: BaseChatModel;
    switch (aiModel) {
        case 'ChatOpenAI':
            llmOptions.model = 'gpt-4';
            llm = new ChatOpenAI(llmOptions);
            break;
        case 'AzureChatOpenAI':
            llm = new ChatOpenAI(llmOptions);
            break;
        case 'ChatAnthropic':
            llmOptions.model = 'claude-3-sonnet-20240229';
            llm = new ChatAnthropic(llmOptions);
            break;
        case 'ChatMistralAI':
            llmOptions.model = 'mistral-large-latest';
            llm = new ChatMistralAI(llmOptions);
            break;
        case 'ChatFireworks':
            llmOptions.model = 'accounts/fireworks/models/firefunction-v1';
            llm = new ChatFireworks(llmOptions);
            break;
        case 'ChatGroq':
            llmOptions.model = 'llama3-70b-8192';
            llm = new ChatGroq(llmOptions);
            break;
        default:
            throw new Error(`Invalid default AI: ${aiModel}`);
    }
    return llm;
}
