import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

const response = zodToJsonSchema(
    z.object({
        response: z.string().describe("Response to user."),
    }),
);

const responseTool = {
    type: "function",
    function: {
        name: "respondToUser",
        description: "Response to user.",
        parameters: response,
    },
};
export { response, responseTool };
