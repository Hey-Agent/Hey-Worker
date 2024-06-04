import { HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { END } from '@langchain/langgraph';
import calculatorTool from 'src/tools/general/calculator';
import createAgent from 'utils/createagent';
import { PlanExecuteState } from 'utils/planExecuteState';

export default async function GeneralAgent(llm: any) {
  const generalAgent = await createAgent(
    llm,
    [calculatorTool],
    'You are helpful agent. Following message is from a human. Solve the question with the tools available to you. Your response will be played over voice. Keep the response short and simple. Do not use markdown or LaTeX Syntax.',
  );

  // Config is needed for RunnableConfig
  async function generalNode(state: PlanExecuteState, config?: RunnableConfig) {
    const task = state.plan[0]['instructions'];
    const input = {
      messages: [new HumanMessage(task)],
    };
    const result = await generalAgent.invoke(input, config);

    const newPlan = state.plan.slice(1);
    let nextAgent = 'Summarizer';

    if (newPlan.length > 0) {
      nextAgent = newPlan[0]['agent'];
    }

    if (state.pastSteps.length == 0 && nextAgent == 'Summarizer') {
      return {
        pastSteps: [],
        response: result.output,
        next: END,
      };
    }
    return {
      pastSteps: [[task, result.output]],
      plan: newPlan,
      next: nextAgent,
    };
  }
  return generalNode;
}
