import { getStepDescriptions } from "./testCaseParser";
import { TestCaseResponse } from "../services/apiService";

describe("test step parsing", () => {
  it("should split mixed numbered and bullet test steps cleanly", () => {
    const input: TestCaseResponse = {
      id: 1,
      externalId: "TC-001",
      title: "Mixed format steps",
      steps: `1. Open the application\n2) Login using valid credentials\n- Navigate to the dashboard\n• Verify the user profile is visible\n3. Logout successfully`,
      expectedResult: "User can complete the journey",
      status: "Parsed",
      testPlanId: 1
    };

    const results = getStepDescriptions(input);

    expect(results).toHaveLength(5);
    expect(results[0].description).toBe("Open the application");
    expect(results[1].description).toBe("Login using valid credentials");
    expect(results[2].description).toBe("Navigate to the dashboard");
    expect(results[3].description).toBe("Verify the user profile is visible");
    expect(results[4].description).toBe("Logout successfully");
  });

  it("should preserve steps when text contains periods inside sentences", () => {
    const input: TestCaseResponse = {
      id: 2,
      externalId: "TC-002",
      title: "Text with periods",
      steps: `1. Open the app and wait for the login page to load.\n2. Enter username and password.\n3. Submit the form`,
      expectedResult: "Login succeeds",
      status: "Parsed",
      testPlanId: 1
    };

    const results = getStepDescriptions(input);

    expect(results).toHaveLength(3);
    expect(results[0].description).toBe("Open the app and wait for the login page to load");
    expect(results[1].description).toBe("Enter username and password");
    expect(results[2].description).toBe("Submit the form");
  });
});
