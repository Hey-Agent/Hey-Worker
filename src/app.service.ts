import { HumanMessage } from '@langchain/core/messages';

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessageChunk } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableLike } from '@langchain/core/runnables';
import { END, START, StateGraph } from "@langchain/langgraph";
import { CompiledStateGraph } from '@langchain/langgraph/dist/graph/state';
import { ChatOpenAICallOptions } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMOptions } from 'config/types/llmOptions';
import { ConversationSummaryBufferMemory } from "langchain/memory";
import { JsonOutputToolsParser } from "langchain/output_parsers";
import generateLLM from 'utils/generateAiAgent';
import { PlanExecuteState, planExecuteState } from 'utils/planExecuteState';
import { planTool } from 'utils/planFunction';
import { responseTool } from 'utils/responseToll';
import GeneralAgent from './agents/general';
import NewsAgent from './agents/news';
import calculatorTool from './tools/general/calculator';
import newsTool from './tools/general/news';


@Injectable()
export class AppService {
  llm: BaseChatModel<ChatOpenAICallOptions, AIMessageChunk>;
  memory: ConversationSummaryBufferMemory;
  agents = [];
  graph: CompiledStateGraph<PlanExecuteState, unknown, string>;
  tools = [calculatorTool, newsTool];

  constructor(private configService: ConfigService) {
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
    this.genSuperVisorChain(defaultAi, llmOptions);
  }

  getMembers(): string[] {
    return ["General", "News"];
  }

  async genSuperVisorChain(defaultAi, llmOptions) {
    let members = this.getMembers();

    const plannerPrompt = ChatPromptTemplate.fromTemplate(
      `For the given objective, come up with a simple step by step plan. 
    This plan should involve individual tasks, that if executed correctly will yield the correct answer. Do not add any superfluous steps.
    The result of the final step should be the final answer. Make sure that each step has all the information needed - do not skip steps.
    
    Your objective was this:
    {input}
    
    Your original plan was this:
    {plan}
    
    You have currently done the follow steps:
    {pastSteps}
    
    Here are the agents that can be assigned : ${members.join(", ")}.

    You can only call 1 function at a time, 'plan' or 'respondToUser'

    Update your plan accordingly. 
    Only add steps to the plan that still NEED to be done. Do not return previously done steps as part of the plan.
    
    If no more steps are needed and you can return to the user, then summarize the answer and use the 'respondToUser' function. Keep the summary short. Do not use filler words.`);

    const parser = new JsonOutputToolsParser();

    const planner = plannerPrompt
      .pipe(
        this.llm.bindTools([
          planTool,
          responseTool,
        ]),
      )
      .pipe(parser);

    async function planStep(
      state: PlanExecuteState,
    ): Promise<Partial<PlanExecuteState>> {
      const output = await planner.invoke({
        input: state.input,
        plan: state.plan.join("\n"),
        pastSteps: state.pastSteps
          .map(([step, result]) => `${step}: ${result}`)
          .join("\n"),
      });
      const toolCall = output[0];

      if (toolCall.type == "respondToUser" || output[0].args.plan.length === 0) {
        return { response: toolCall.args?.response, next: END };
      }
      return { messages: [new HumanMessage({ content: output[0].args.plan[0].instructions })], plan: toolCall.args?.plan, next: output[0].args.plan[0].agent, instructions: output[0].args.plan[0].instructions };
    }

    const workflow = new StateGraph<PlanExecuteState, unknown, string>({
      channels: planExecuteState,
    });

    workflow.addNode('planner', planStep);

    let t: RunnableLike<PlanExecuteState, unknown>;
    for (const member of members) {
      switch (member) {
        case 'General':
          t = await GeneralAgent(this.llm);
          this.agents = [...this.agents, t];
          workflow.addNode(member, t);
          break;
        case 'News':
          t = await NewsAgent(this.llm);
          this.agents = [...this.agents, t];
          workflow.addNode(member, t);
          break;
      }
    }

    workflow.addConditionalEdges(
      "planner",
      (x: PlanExecuteState) => x.next,
    );

    members.forEach((member) => {
      workflow.addEdge(member, "planner");
    });

    workflow.addEdge(START, 'planner');

    this.graph = workflow.compile();


    const config = { recursionLimit: 50 };
    const inputs = {
      input: "What is 2+2 and give me the latest news",
    };

    // const result = await this.graph.invoke(inputs, config);
    // console.log(result.response);
    for await (const event of await this.graph.stream(inputs, config)) {
      console.log(event);
    }

  }
}
