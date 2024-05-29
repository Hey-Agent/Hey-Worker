import newsTool from "src/tools/general/news";
import createAgent from "utils/createagent";
import { runAgentNode } from "utils/runAgentNode";

export default async function NewsAgent(llm: any) {
    const newsAgent = await createAgent(
        llm,
        [newsTool],
        'Provide news summary to the user',
    );

    async function newsNode(state) {
        return runAgentNode({
            state: state,
            agent: newsAgent,
            name: 'General',
        });
    }
    return newsNode;
}
