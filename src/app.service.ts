import { BaseMessageChunk, HumanMessage } from '@langchain/core/messages';

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableLike } from '@langchain/core/runnables';
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { CompiledStateGraph } from '@langchain/langgraph/dist/graph/state';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMOptions } from 'config/types/llmOptions';
import { JsonOutputToolsParser } from "langchain/output_parsers";
import generateLLM from 'utils/generateAiAgent';
import { PlanExecuteState, planExecuteState } from 'utils/planExecuteState';
import { planTool } from 'utils/planFunction';
import GeneralAgent from './agents/general';
import NewsAgent from './agents/news';
import calculatorTool from './tools/general/calculator';
import newsTool from './tools/general/news';

import { BaseLanguageModelCallOptions } from '@langchain/core/language_models/base';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { CallbackHandler } from "langfuse-langchain";
import SummarizerAgent from './agents/summarizer';

@Injectable()
export class AppService {
  llm: BaseChatModel<BaseLanguageModelCallOptions, BaseMessageChunk>;
  memory: MemorySaver;
  graph: CompiledStateGraph<PlanExecuteState, unknown, string>;
  tools = [calculatorTool, newsTool];
  langfuseHandler: CallbackHandler;

  constructor(private configService: ConfigService) {
    this.langfuseHandler = new CallbackHandler();
    const temperature = this.configService.get<number>('temperature');
    const defaultAi = this.configService.get<string>('defaultAi');

    const llmOptions: LLMOptions = {
      temperature,
      apiKey: process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY,
      azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
      azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
      azureOpenAIApiDeploymentName: process.env.AZURE_OPENAIA_API_DEPLOYMENT_NAME,
    };

    this.llm = generateLLM(defaultAi, llmOptions);
    this.genSuperVisorChain();
  }

  getMembers(): string[] {
    return ["CalculatorAgent", "NewsAgent"];
  }

  async genSuperVisorChain() {
    let members = this.getMembers();

    const plannerPrompt = ChatPromptTemplate.fromTemplate(
      `You are Planner. For the given objective, come up with a simple step by step plan. 
    This plan should involve individual tasks, that if executed correctly will yield the correct answer. Do not add any superfluous steps. Make sure that each step has all the information needed - do not skip steps.
    
    Your objective was this:
    {input}
    
    Your original plan was this (it can be empty if running for the first time):
    {plan}
    
    You have currently done the follow steps:
    {pastSteps}
    

    Here are the agents that can be assigned : Planner, ${members.join(", ")}.

    You can set the next agent to Planner if you think you might need to step in and re-adjust the plan. You cannot ask for more information from user.
    Some past steps might have failed, do not re-execute them and Update your plan accordingly. 
    Do not repeat steps. Only add steps to the plan that still NEED to be done. Do not return previously done steps as part of the plan.
    Do not use filler words. Call the Summarizer agent when all tasks are complete.`);

    const parser = new JsonOutputToolsParser();

    const planner = plannerPrompt
      .pipe(
        this.llm.bindTools([
          planTool,
        ]),
      )
      .pipe(parser);

    async function planStep(
      state: PlanExecuteState,
    ): Promise<Partial<PlanExecuteState>> {
      const output = await planner.invoke({
        input: state.input,
        plan: state.plan.join("\n"),
        pastSteps: state.pastSteps.map(([step, result]) => JSON.stringify({ step: step, response: result })).join(",\n")
      });
      const toolCall = output[0];

      return { messages: [new HumanMessage({ content: output[0].args.plan[0].instructions })], plan: toolCall.args?.plan, next: output[0].args.plan[0].agent, instructions: output[0].args.plan[0].instructions };
    }

    const workflow = new StateGraph<PlanExecuteState, unknown, string>({
      channels: planExecuteState,
    });

    workflow.addNode('Planner', planStep);

    let t: RunnableLike<PlanExecuteState, unknown>;
    for (const member of members) {
      switch (member) {
        case 'CalculatorAgent':
          t = await GeneralAgent(this.llm);
          workflow.addNode(member, t);
          break;
        case 'NewsAgent':
          t = await NewsAgent(this.llm);
          workflow.addNode(member, t);
          break;
      }
    }

    t = await SummarizerAgent(this.llm);
    workflow.addNode('Summarizer', t);

    workflow.addConditionalEdges(
      "Planner",
      (x: PlanExecuteState) => x.next,
    );

    members.forEach((member) => {
      workflow.addConditionalEdges(
        member,
        (x: PlanExecuteState) => x.next,
      );
    });

    workflow.addEdge(START, 'Planner');
    workflow.addEdge('Summarizer', END);

    this.memory = new MemorySaver();

    this.graph = workflow.compile({ checkpointer: this.memory });

    // const config = { recursionLimit: 50, callbacks: [this.langfuseHandler] };
    // const inputs = {
    //   input: "what is the latest news in hindi",
    // };

    // const result = await this.graph.invoke(inputs, config);
    // console.log(result.response);

    // const inputs2 = {
    //   input: "What is 2+2 and explain life",
    // };
    // const result2 = await this.graph.invoke(inputs2, config);
    // console.log(result2.response);
    // for await (const event of await this.graph.stream(inputs, config)) {
    //   console.log(event);
    // }
  }

  async queryText(input: string) {
    const inputs = {
      input
    };
    const config = {
      configurable: {
        thread_id: "default"
      },
      recursionLimit: 50,
      callbacks: [this.langfuseHandler]
    };
    const result = await this.graph.invoke(inputs, config);
    return { response: result.response };

  }
}
