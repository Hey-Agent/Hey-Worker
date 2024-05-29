export type LLMOptions = {
    temperature: number;
    apiKey?: string;
    azureOpenAIApiKey?: string;
    azureOpenAIApiVersion?: string;
    azureOpenAIApiInstanceName?: string;
    azureOpenAIApiDeploymentName?: string;
    model?: string;
};