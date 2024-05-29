import { Logger } from '@nestjs/common';

const logger = new Logger('config/configuration.ts');

const envVarRequirements = {
    AzureChatOpenAI: ['AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_API_VERSION', 'AZURE_OPENAI_API_INSTANCE_NAME', 'AZURE_OPENAI_API_DEPLOYMENT_NAME'],
    ChatAnthropic: ['ANTHROPIC_API_KEY'],
    ChatFireworks: ['FIREWORKS_API_KEY'],
    ChatMistralAI: ['MISTRAL_API_KEY'],
    ChatOpenAI: ['OPENAI_API_KEY']
};

const areEnvVarsMissing = (vars) => vars.some(envVar => !process.env[envVar]);

const getDefaultAi = () => {
    let envDefaultAi = process.env.DEFAULT_AI || 'ChatOpenAI';

    if (!(envDefaultAi in envVarRequirements) || areEnvVarsMissing(envVarRequirements[envDefaultAi])) {
        logger.warn(`Environment variables not found for "${envDefaultAi}". Defaulting to ChatOpenAI.`);
        envDefaultAi = 'ChatOpenAI';
    }

    if (envDefaultAi === 'ChatOpenAI' && areEnvVarsMissing(envVarRequirements['ChatOpenAI'])) {
        logger.error(`OpenAI API Key not found`);
        throw new Error('Missing OpenAI Keys');
    }

    return envDefaultAi;
};



const getDefaultTemperature = () => {
    let temp = parseFloat(process.env.TEMPERATURE) || 0;
    return (temp >= 0 && temp <= 1) ? temp : 0;
};

export default () => ({
    port: parseInt(process.env.PORT, 10) || 3000,
    temperature: getDefaultTemperature(),
    defaultAi: getDefaultAi()
});
