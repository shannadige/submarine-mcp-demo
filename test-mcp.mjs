#!/usr/bin/env node

import http from 'http';

const baseUrl = process.argv[2] || 'http://localhost:3000';
const mcpUrl = `${baseUrl}/mcp`;

console.log(`🧪 Testing Finance Tracker MCP Server at: ${mcpUrl}\n`);

// Test MCP capabilities endpoint
async function testCapabilities() {
  console.log('📋 Testing MCP capabilities...');

  try {
    const response = await fetch(`${mcpUrl}/capabilities`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Capabilities response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log('❌ Capabilities failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Capabilities error:', error.message);
    return false;
  }
}

// Test tool invocation
async function testTool(toolName, args) {
  console.log(`\n🔧 Testing tool: ${toolName}`);
  console.log('📤 Arguments:', JSON.stringify(args, null, 2));

  try {
    const response = await fetch(`${mcpUrl}/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Tool response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log('❌ Tool failed:', response.status, await response.text());
      return false;
    }
  } catch (error) {
    console.log('❌ Tool error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Capabilities
  totalTests++;
  if (await testCapabilities()) {
    passedTests++;
  }

  // Test 2: Set Budget
  totalTests++;
  if (await testTool('set_budget', {
    category: 'food',
    limit: 500,
    period: 'monthly'
  })) {
    passedTests++;
  }

  // Test 3: Add Transaction
  totalTests++;
  if (await testTool('add_transaction', {
    type: 'expense',
    amount: 50.00,
    category: 'food',
    description: 'Test lunch expense'
  })) {
    passedTests++;
  }

  // Test 4: Budget Status
  totalTests++;
  if (await testTool('budget_status', {})) {
    passedTests++;
  }

  // Test 5: Add Bill
  totalTests++;
  if (await testTool('add_bill', {
    name: 'Test Electric Bill',
    amount: 120.00,
    dueDate: '2024-09-20',
    recurring: true
  })) {
    passedTests++;
  }

  // Test 6: Financial Summary
  totalTests++;
  if (await testTool('get_financial_summary', {
    period: 'month'
  })) {
    passedTests++;
  }

  // Test 7: Investment Tracking
  totalTests++;
  if (await testTool('track_investment', {
    symbol: 'AAPL',
    shares: 10,
    purchasePrice: 150.00
  })) {
    passedTests++;
  }

  // Test 8: Check Due Bills
  totalTests++;
  if (await testTool('check_due_bills', {
    daysAhead: 30
  })) {
    passedTests++;
  }

  // Summary
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  console.log(passedTests === totalTests ? '🎉 All tests passed!' : '⚠️  Some tests failed');

  return passedTests === totalTests;
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(baseUrl);
    return response.ok || response.status === 404; // 404 is fine for Next.js root
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if server is running...');

  if (!(await checkServer())) {
    console.log('❌ Server not running at', baseUrl);
    console.log('💡 Start the server with: npm run dev');
    process.exit(1);
  }

  console.log('✅ Server is running\n');

  const success = await runTests();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);