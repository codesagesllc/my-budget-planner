import { Anthropic } from '@anthropic-ai/sdk'
import { z } from 'zod'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Schema for parsed bill data
export const ParsedBillSchema = z.object({
  name: z.string(),
  amount: z.number(),
  dueDate: z.string().optional(),
  billingCycle: z.enum(['monthly', 'quarterly', 'annual', 'weekly', 'biweekly']).optional(),
  category: z.string().optional(),
})

export const ParsedBillsResponseSchema = z.object({
  bills: z.array(ParsedBillSchema),
  summary: z.string(),
})

export type ParsedBill = z.infer<typeof ParsedBillSchema>
export type ParsedBillsResponse = z.infer<typeof ParsedBillsResponseSchema>

export async function parseSpreadsheetWithAI(fileContent: string): Promise<ParsedBillsResponse> {
  const prompt = `You are a financial data extraction specialist. I will provide you with content from a spreadsheet that contains bill information. Your task is to extract structured data from this unstructured content.

Please analyze the following spreadsheet content and extract all bills/recurring payments. For each bill, identify:
- Name: The name or description of the bill
- Amount: The payment amount (as a number)
- Due Date: When the bill is due (if available)
- Billing Cycle: The frequency (monthly, quarterly, annual, weekly, biweekly)
- Category: The type of expense (utilities, subscription, insurance, etc.)

Spreadsheet Content:
${fileContent}

Return the data in this exact JSON format:
{
  "bills": [
    {
      "name": "string",
      "amount": number,
      "dueDate": "string (optional)",
      "billingCycle": "monthly|quarterly|annual|weekly|biweekly (optional)",
      "category": "string (optional)"
    }
  ],
  "summary": "A brief summary of what was extracted"
}

IMPORTANT: Return ONLY valid JSON, no additional text or explanation.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from AI')
    }

    // Parse the JSON response
    const parsedData = JSON.parse(content.text)
    
    // Validate against schema
    const validatedData = ParsedBillsResponseSchema.parse(parsedData)
    
    return validatedData
  } catch (error) {
    console.error('Error parsing spreadsheet with AI:', error)
    throw new Error('Failed to parse spreadsheet content')
  }
}

export async function generateFinancialInsights(
  transactions: any[],
  bills: any[],
  goal?: { amount: number; deadline: string; description: string }
): Promise<string> {
  const prompt = `As a financial advisor AI, analyze the following financial data and provide personalized insights and recommendations.

Transactions (last 30 days):
${JSON.stringify(transactions.slice(0, 50), null, 2)}

Recurring Bills:
${JSON.stringify(bills, null, 2)}

${goal ? `Savings Goal: Save $${goal.amount} by ${goal.deadline} for ${goal.description}` : ''}

Please provide:
1. Spending pattern analysis
2. Budget optimization suggestions
3. ${goal ? 'Savings strategy to reach the goal' : 'General savings recommendations'}
4. Potential areas to reduce expenses
5. Financial health assessment

Keep the response concise, actionable, and encouraging.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from AI')
    }

    return content.text
  } catch (error) {
    console.error('Error generating financial insights:', error)
    throw new Error('Failed to generate financial insights')
  }
}