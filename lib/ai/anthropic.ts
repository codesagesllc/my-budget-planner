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

Please analyze the following spreadsheet content and extract all bills/recurring payments. Look for patterns that indicate recurring expenses like:
- Subscription services (Netflix, Spotify, etc.)
- Utilities (electricity, water, gas, internet, phone)
- Insurance (car, health, home)
- Rent or mortgage
- Gym memberships
- Any other recurring payments

For each bill, identify:
- Name: The name or description of the bill
- Amount: The payment amount (as a number, no currency symbols)
- Due Date: When the bill is due (if available, use day of month like "1" or "15")
- Billing Cycle: The frequency (monthly, quarterly, annual, weekly, biweekly)
- Category: The type of expense (utilities, subscription, insurance, etc.)

If the content appears to be base64 encoded or unreadable, try to identify any text patterns that might indicate bill information.

Spreadsheet Content:
${fileContent.substring(0, 10000)} ${fileContent.length > 10000 ? '... (truncated)' : ''}

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

IMPORTANT: 
- Return ONLY valid JSON, no additional text or explanation
- If you cannot find any bills, return an empty bills array with a summary explaining why
- Default to "monthly" for billing cycle if not specified
- Extract amounts as numbers only (e.g., 15.99 not "$15.99")`

  try {
    console.log('Sending to Anthropic API...')
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
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

    console.log('AI Response received, parsing JSON...')
    
    // Clean the response text to ensure it's valid JSON
    let jsonText = content.text.trim()
    
    // Remove any markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7)
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.substring(3)
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.substring(0, jsonText.length - 3)
    }
    
    // Parse the JSON response
    const parsedData = JSON.parse(jsonText)
    
    // Validate against schema
    const validatedData = ParsedBillsResponseSchema.parse(parsedData)
    
    console.log('Successfully parsed bills:', validatedData.bills.length)
    return validatedData
  } catch (error) {
    console.error('Error parsing spreadsheet with AI:', error)
    
    // Return a default response if parsing fails
    return {
      bills: [],
      summary: 'Failed to parse spreadsheet content. Please ensure your file contains bill information in a readable format.',
    }
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
      model: 'claude-3-haiku-20240307',
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
