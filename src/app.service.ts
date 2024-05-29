
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { END, START, StateGraph } from "@langchain/langgraph";
import { CompiledStateGraph } from '@langchain/langgraph/dist/graph/state';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMOptions } from 'config/types/llmOptions';
import { ConversationSummaryBufferMemory } from "langchain/memory";
import { JsonOutputToolsParser } from "langchain/output_parsers";
import generateLLM from 'utils/generateAiAgent';
import { isToolMessage } from 'utils/runAgentNode';
import { AgentStateChannels, agentStateChannels } from 'utils/state';
import toolNode from 'utils/toolNode';
import GeneralAgent from './agents/general';
import NewsAgent from './agents/news';

type AgentState = {
  lastNode?: string;
  messages: BaseMessage[];
};


@Injectable()
export class AppService {
  llm;
  memory: ConversationSummaryBufferMemory;
  agents = [];
  graph: CompiledStateGraph<unknown, Partial<unknown>, "__start__">;
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
    const options = ["FINISH", ...members];

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
      .pipe(this.llm.bind({
        tools: [toolDef],
        tool_choice: { "type": "function", "function": { "name": "route" } },
      }))
      .pipe(new JsonOutputToolsParser())
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
    const workflow = new StateGraph<AgentState, Partial<AgentState>, string>({ channels: agentStateChannels });

    workflow.addNode('Supervisor', this.supervisorChain);

    const members = this.getMembers();
    let t;

    // 2. Add the nodes; these will do the works
    for (const member of members) {
      switch (member) {
        case 'General':
          t = await GeneralAgent(this.llm);
          this.agents = [...this.agents, t];
          workflow.addNode(member, t);
          // @ts-ignore
          workflow.addEdge('General', 'Supervisor');
          break;
        case 'News':
          t = await NewsAgent(this.llm);
          this.agents = [...this.agents, t];
          workflow.addNode(member, t);
          // @ts-ignore
          workflow.addEdge('News', 'Supervisor');
          break;
      }
    }

    workflow.addNode('call_tool', toolNode);

    // @ts-ignore
    workflow.addConditionalEdges('General', this.router, {
      continue: 'News',
      call_tool: 'call_tool',
      end: END,
    });

    // @ts-ignore
    workflow.addConditionalEdges('News', this.router, {
      continue: 'General',
      call_tool: 'call_tool',
      end: END,
    });

    workflow.addConditionalEdges(
      // @ts-ignore
      'call_tool',
      // @ts-ignore
      (x) => x.sender,
      {
        General: 'General',
        News: 'News',
      },
    );

    const conditionalMap: { [key: string]: string } = members.reduce(
      (acc, member) => {
        acc[member] = member;
        return acc;
      },
      {},
    );

    // Or end work if done
    conditionalMap["FINISH"] = END;
    // console.log(conditionalMap)
    workflow.addConditionalEdges(
      // @ts-ignore
      "Supervisor",
      // @ts-ignore
      (x: AgentStateChannels) => x.next,
      conditionalMap,
    );
    // @ts-ignore
    workflow.addEdge(START, 'Supervisor');

    // @ts-ignore
    // workflow.addEdge('Supervisor', END);
    // workflow.setEntryPoint("Supervisor");
    this.graph = workflow.compile();
    console.log(this.graph.getGraph());
    const streamResults = await this.graph.stream(
      {
        messages: [
          new HumanMessage({
            content: 'What is the latest news',
          }),
        ],
      },
    );
    console.log("invoked")
    for await (const output of await streamResults) {
      console.log('--start--');
      if (!output?.__end__) {
        console.log('----');
        console.log(output);
        console.log('----');
      }
    }
  }
}
