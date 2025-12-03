// Test utilities module exports
export * from './generators';

// Property test configuration
export const PROPERTY_TEST_RUNS = 100;

// Helper to create a property test with standard configuration
export const propertyTestConfig = {
  numRuns: PROPERTY_TEST_RUNS,
  verbose: true,
};
