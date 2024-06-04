import { RunnableConfig } from '@langchain/core/runnables';
import { END } from '@langchain/langgraph';
import createAgent from 'utils/createagent';
import { PlanExecuteState } from 'utils/planExecuteState';

export default async function SummarizerAgent(llm: any) {
  const summarizerAgent = await createAgent(
    llm,
    [],
    `Below is a conversation between a human and multiple AI agents. Summarize the AI response so it is a single unified response to the user. Do not add filler words or mention that this is a summary. Do not re-mention the questions. Do not use markdown or LaTeX Syntax.
    
    User Input
    {user}

    Our Responses
    {airesponse}
    `,
  );

  async function summarizerNode(
    state: PlanExecuteState,
    config?: RunnableConfig,
  ) {
    let AiMessages = '';
    state.pastSteps.forEach((step) => {
      AiMessages += step[1] + '\n';
    });

    const result = await summarizerAgent.invoke({
      user: state.input,
      airesponse: AiMessages
    });
    console.log(result);
    return {
      response: result.content,
      next: END,
    };
  }
  return summarizerNode;
}
