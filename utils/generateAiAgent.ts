import { ChatAnthropic } from "@langchain/anthropic";
import { ChatFireworks } from "@langchain/community/chat_models/fireworks";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatOpenAI } from "@langchain/openai";
import { LLMOptions } from "config/types/llmOptions";

/**
 * Generates a large language model (LLM) instance based on the specified AI model and options.
 *
 * @param aiModel - The name of the AI model to use, such as "ChatOpenAI", "AzureChatOpenAI", "ChatAnthropic", "ChatMistralAI", or "ChatFireworks".
 * @param llmOptions - The options to configure the LLM instance, such as the model name, temperature, and other parameters.
 * @returns The LLM instance.
 */
export default function generateLLM(
    aiModel: string,
    llmOptions: LLMOptions,
): BaseChatModel {
    /**
     * Represents a large language model (LLM) instance.
     */
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
        default:
            throw new Error(`Invalid default AI: ${aiModel}`);
    }
    return llm;
}
