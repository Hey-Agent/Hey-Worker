import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const newsSchema = z.object({

    // language: z.string().describe("Language code")
});


const newsTool = new DynamicStructuredTool({
    name: "news",
    description: "Can fetch latest news.",
    schema: newsSchema,
    func: async () => {
        const NewsAPI = require('newsapi');
        const newsapi = new NewsAPI('b6d5fba985c245838484b5d7e2665c9e');
        const topHeadlines = await newsapi.v2.topHeadlines({
            language: 'en',
            country: 'us',
            category: 'business',
            pageSize: 5,
        });
        return topHeadlines.articles.map(article => article.title).join('\n');
    },
});

export default newsTool;