import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Define the Zod schema for an object containing an array of objects with "agent" and "instructions"
const planSchema = z.object({
    plan: z.array(
        z.object({
            agent: z.string().describe("The agent responsible for this step"),
            instructions: z.string().describe("Instructions for the agent")
        })
    ).describe("different steps to follow, should be in sorted order"),
});

// Convert the Zod schema to JSON schema
const planJsonSchema = zodToJsonSchema(planSchema);

// Create a function metadata object with the updated schema
const planFunction = {
    name: "plan",
    description: "This tool is used to plan the steps to follow",
    parameters: planJsonSchema,
};

// Define the tool object that includes the function metadata
const planTool = {
    type: "function",
    function: planFunction,
};

// Export the defined schemas and objects
export { planSchema as plan, planFunction, planTool };
