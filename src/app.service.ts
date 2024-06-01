
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessageChunk, HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
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
import { isToolMessage } from 'utils/runAgentNode';
import { AgentStateChannels, agentStateChannels } from 'utils/state';
import GeneralAgent from './agents/general';
import NewsAgent from './agents/news';


@Injectable()
export class AppService {
  llm: BaseChatModel<ChatOpenAICallOptions, AIMessageChunk>;
  memory: ConversationSummaryBufferMemory;
  agents = [];
  graph: CompiledStateGraph<AgentStateChannels, unknown, string>;
  supervisorChain: any;

  constructor(private configService: ConfigService) {
    const temperature = this.configService.get<number>('temperature');
    const defaultAi = this.configService.get<string>('defaultAi');

    const llmOptions: LLMOptions = {
      temperature,
      apiKey: process.env.OPENAI_API_KEY,
      azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
      azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
      azureOpenAIApiDeploymentName: process.env.AZURE_OPENAIA_API_DEPLOYMENT_NAME,
    };

    this.llm = generateLLM(defaultAi, llmOptions);
    this.genSuperVisorChain();
  }

  getMembers(): string[] {
    return ["General", "News"];
  }

  async genSuperVisorChain() {
    const members = this.getMembers();
    const systemPrompt = "You are a supervisor tasked with managing a conversation between the" +
      " following workers: {members}. Given the following user request," +
      " respond with the worker to act next. Each worker will perform a" +
      " task and respond with their results and status. When finished," +
      " respond with FINISH.";
    const options = [END, ...members];

    const functionDef = {
      name: "route",
      description: "Select the next role.",
      parameters: {
        title: "routeSchema",
        type: "object",
        properties: {
          next: {
            title: "Next",
            anyOf: [
              { enum: options },
            ],
          },
        },
        required: ["next"],
      },
    };

    const toolDef = {
      type: "function",
      function: functionDef,
    } as const;


    // this.memory = new ConversationSummaryBufferMemory({
    //   llm: this.llm,
    //   maxTokenLimit: 100,
    // });


    const prompt = ChatPromptTemplate.fromMessages(
      [
        ["system", systemPrompt],
        new MessagesPlaceholder("messages"),
        [
          "system",
          "Given the conversation above, who should act next?" +
          " Or should we FINISH? Select one of: {options}",
        ],
      ]);

    const formattedPrompt = await prompt.partial({
      options: options.join(", "),
      members: members.join(", "),
    });

    this.supervisorChain = formattedPrompt
      .pipe(this.llm.bindTools(
        [toolDef],
        {
          tool_choice: { "type": "function", "function": { "name": "route" } },
        },
      ))
      .pipe(new JsonOutputToolsParser())
      // select the first one
      .pipe((x) => (x[0].args));

    this.initGraph();
  }

  router(state) {
    console.log(state);
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    if (isToolMessage(lastMessage)) {
      // The previous agent is invoking a tool
      return "call_tool";
    }
    if (
      typeof lastMessage.content === "string" &&
      lastMessage.content.includes("FINAL ANSWER")
    ) {
      // Any agent decided the work is done
      return "end";
    }
    return "continue";
  }


  async initGraph() {
    // temp variables
    let t: RunnableLike<AgentStateChannels, unknown>;


    const workflow = new StateGraph<AgentStateChannels, unknown, string>({
      channels: agentStateChannels,
    });

    workflow.addNode('Supervisor', this.supervisorChain);


    const members = this.getMembers();

    // 2. Add the nodes; these will do the works
    for (const member of members) {
      switch (member) {
        case 'General':
          t = await GeneralAgent(this.llm);
          this.agents = [...this.agents, t];
          workflow.addNode(member, t);
          workflow.addEdge(member, 'Supervisor');
          break;
        case 'News':
          t = await NewsAgent(this.llm);
          this.agents = [...this.agents, t];
          workflow.addNode(member, t);
          workflow.addEdge('News', 'Supervisor');
          break;
      }
    }

    workflow.addConditionalEdges(
      "Supervisor",
      (x: AgentStateChannels) => x.next,
    );

    workflow.addEdge(START, 'Supervisor');

    this.graph = workflow.compile();

    const streamResults = await this.graph.stream(
      {
        messages: [
          new HumanMessage({
            content: 'Calculate 123/11*412 and give me the latest news',
          }),
        ],
      },
      { recursionLimit: 100 },
    );

    for await (const output of await streamResults) {
      if (!output?.__end__) {
        console.log('----');
        console.log(output);
        console.log('----');
      }
    }
  }
}
