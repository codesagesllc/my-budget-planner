# AI Transaction Analyzer for Bills Management

## Overview
The AI Transaction Analyzer is a powerful feature that automatically detects recurring bills and one-time payments from your Plaid transaction history. It uses pattern recognition and machine learning algorithms to identify bills, categorize them, and create them in your budget planner with a single click.

## Features

### 1. Intelligent Pattern Detection
- **Recurring Bill Detection**: Identifies monthly, weekly, bi-weekly, quarterly, and annual payment patterns
- **One-Time Payment Recognition**: Detects significant one-time expenses that should be tracked
- **Merchant Name Cleaning**: Automatically cleans and standardizes merchant names for better recognition
- **Confidence Scoring**: Assigns confidence scores (0-100%) to each detected bill based on pattern consistency

### 2. Smart Categorization
The AI automatically categorizes bills based on merchant names:
- **Utilities**: Electric, gas, water, internet, phone
- **Streaming & Entertainment**: Netflix, Spotify, Disney+, etc.
- **Technology & Software**: Adobe, Microsoft, GitHub, cloud services
- **AI Services**: OpenAI, Anthropic, Midjourney
- **Insurance**: Auto, home, health insurance providers
- **Health & Fitness**: Gym memberships, pharmacies
- **Transportation**: Uber, Lyft, parking, tolls
- **Housing**: Rent, mortgage payments
- **Food & Dining**: Groceries, restaurants
- **Financial**: Banking fees, credit card payments, loans
- **Education**: Tuition, online courses

### 3. Frequency Detection Algorithm
The system analyzes transaction intervals to determine billing cycles:
- **Weekly**: 6-8 day intervals (90% confidence with <2 day variance)
- **Bi-weekly**: 13-15 day intervals (90% confidence with <2 day variance)
- **Monthly**: 28-32 day intervals (95% confidence with <3 day variance)
- **Quarterly**: 84-96 day intervals (85% confidence with <5 day variance)
- **Annual**: 350-380 day intervals (80% confidence with <10 day variance)

### 4. User Interface Features
- **Filter Controls**: Filter by confidence level and recurring/one-time
- **Bulk Selection**: Select all/deselect all functionality
- **Transaction History**: View supporting transactions for each detected bill
- **Visual Indicators**: Color-coded confidence levels (green >90%, yellow 70-90%, red <70%)
- **One-Click Creation**: Create multiple bills simultaneously

## Technical Implementation

### API Endpoints

#### 1. Analyze Transactions
**Endpoint**: `/api/ai/analyze-transactions`
**Method**: POST
**Payload**:
```json
{
  "userId": "string",
  "transactions": [
    {
      "id": "string",
      "name": "string",
      "amount": "number",
      "date": "string",
      "merchant_name": "string"
    }
  ]
}
```
**Response**:
```json
{
  "detectedBills": [
    {
      "name": "string",
      "amount": "number",
      "frequency": "monthly|weekly|biweekly|quarterly|annual",
      "confidence": "number",
      "categories": ["string"],
      "lastDate": "string",
      "occurrences": "number",
      "transactions": [],
      "suggestedDueDate": "number",
      "isRecurring": "boolean"
    }
  ],
  "summary": {
    "totalAnalyzed": "number",
    "recurringFound": "number",
    "oneTimeFound": "number"
  }
}
```

#### 2. Create Bills from AI Detection
**Endpoint**: `/api/bills/create-from-ai`
**Method**: POST
**Payload**:
```json
{
  "userId": "string",
  "bills": ["detected bill objects"]
}
```

### Pattern Recognition Algorithm

1. **Transaction Grouping**: Groups transactions by cleaned merchant names
2. **Interval Analysis**: Calculates time intervals between transactions
3. **Variance Calculation**: Measures consistency of amounts and intervals
4. **Confidence Scoring**:
   - Base confidence from frequency detection
   - +20% for consistent amounts (<10% variance)
   - +10% for 3+ occurrences
   - +10% for 6+ occurrences

### Merchant Name Cleaning
- Removes trailing numbers (transaction IDs)
- Removes state codes
- Removes payment processor prefixes (TST, SQ, PP, PAYPAL)
- Normalizes whitespace
- Removes special characters

## User Guide

### How to Use AI Bill Detection

1. **Access the Feature**:
   - Navigate to the Bills tab in your dashboard
   - Click the "AI Detect Bills" button (purple with sparkles icon)

2. **Analyze Transactions**:
   - Click "Analyze Transactions" to start the AI analysis
   - The system will process up to 500 recent transactions
   - Analysis typically takes 2-5 seconds

3. **Review Detected Bills**:
   - View all detected bills with confidence scores
   - Check the suggested categories and frequencies
   - Expand transaction history to verify detection accuracy

4. **Filter Results**:
   - Toggle "Recurring only" to hide one-time payments
   - Adjust minimum confidence threshold (50%, 70%, 80%, 90%)
   - Use Select All/Deselect All for bulk operations

5. **Create Bills**:
   - Select the bills you want to create (high-confidence bills are auto-selected)
   - Review the selection count in the summary bar
   - Click "Create X Bills" to add them to your budget

6. **One-Time Payments**:
   - Non-recurring bills are created as one-time bill entries
   - These are also added to your transaction history for tracking

## Benefits

### For Users
1. **Time Savings**: Eliminate manual bill entry - detect and create dozens of bills in seconds
2. **Accuracy**: AI ensures no recurring bills are missed
3. **Pattern Discovery**: Identify subscriptions you may have forgotten about
4. **Smart Categorization**: Automatic expense categorization for better budgeting
5. **Confidence-Based**: Focus on high-confidence detections first

### For Financial Planning
1. **Complete Picture**: Capture all recurring expenses automatically
2. **Subscription Audit**: Identify all active subscriptions
3. **Expense Tracking**: Track one-time significant expenses
4. **Budget Accuracy**: More accurate monthly budget calculations
5. **Trend Analysis**: Historical pattern recognition for better forecasting

## Best Practices

### Before Running Analysis
1. **Connect Bank Accounts**: Ensure Plaid accounts are connected and synced
2. **Transaction History**: Have at least 3 months of transaction history for best results
3. **Recent Sync**: Sync transactions before running analysis

### During Review
1. **Start with High Confidence**: Review and create bills with >80% confidence first
2. **Verify Amounts**: Check that detected amounts match your expectations
3. **Check Categories**: Adjust categories if needed after creation
4. **Review One-Time**: Carefully review one-time payments for relevance

### After Creation
1. **Edit as Needed**: Use the edit feature to adjust created bills
2. **Set Due Dates**: Update due dates if the suggested dates are incorrect
3. **Deactivate Old Bills**: Remove any duplicate or outdated bills
4. **Regular Updates**: Run analysis monthly to catch new subscriptions

## Security & Privacy

### Data Handling
- Transactions are processed locally in the browser when possible
- Only transaction patterns are sent to the server, not raw data
- No transaction data is stored permanently on servers
- All processing follows GDPR and data protection standards

### Permissions
- Requires authenticated user session
- Only analyzes transactions from connected accounts
- User maintains full control over bill creation
- Can review and modify all AI suggestions before creation

## Troubleshooting

### Common Issues

1. **No Bills Detected**:
   - Ensure you have sufficient transaction history (3+ months recommended)
   - Check that transactions are properly synced from Plaid
   - Try lowering the confidence threshold

2. **Incorrect Frequency Detection**:
   - Verify transaction dates are accurate
   - Check for missing transactions in the sequence
   - Manually edit the bill after creation

3. **Wrong Categories**:
   - Categories are based on merchant name patterns
   - Edit bills after creation to correct categories
   - Custom categories can be added manually

4. **Duplicate Bills**:
   - Review existing bills before creating new ones
   - Use the filter to show only recurring bills
   - Delete or deactivate duplicate entries

## Future Enhancements

### Planned Features
1. **Machine Learning Models**: Train on user feedback for improved accuracy
2. **Custom Rules**: User-defined rules for bill detection
3. **Bulk Editing**: Edit multiple detected bills before creation
4. **Historical Comparison**: Compare detected bills with existing bills
5. **Smart Notifications**: Alert when new recurring bills are detected
6. **Category Learning**: Learn user's preferred categorization patterns
7. **Amount Prediction**: Predict variable bill amounts based on history
8. **Cancellation Detection**: Identify cancelled subscriptions automatically

### API Improvements
1. **Batch Processing**: Handle larger transaction volumes
2. **Real-time Detection**: Detect bills as transactions arrive
3. **WebSocket Support**: Live updates during analysis
4. **Export Functionality**: Export detected bills to CSV/Excel

## Technical Details

### Performance Optimization
- Client-side pattern matching for initial filtering
- Server-side processing for complex pattern recognition
- Caching of merchant categorizations
- Efficient sorting and filtering algorithms

### Scalability
- Handles up to 500 transactions per analysis
- Paginated results for large detection sets
- Optimized database queries for bill creation
- Concurrent processing for multiple pattern detections

---

*Last Updated: December 2024*
*Version: 1.0.0*
