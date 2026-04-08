const API_BASE_URL = process.env.REACT_APP_API_URL || "/api";

export interface TestPlanResponse {
  id: number;
  title: string;
  status: "Processing" | "Completed" | "Failed";
  createdAt: string;
  testCases: TestCaseResponse[];
}

export interface TestCaseResponse {
  id: number;
  externalId: string;
  title: string;
  steps: string;
  stepList?: string[];
  expectedResult: string;
  status: string;
  testPlanId: number;
}

export interface LocatorMappingResponse {
  id: number;
  testCaseId: number;
  stepIndex: number;
  name: string;
  selector: string;
  selectorType: "XPath" | "CSS" | "ID";
  isDefault: boolean;
}

export interface LocatorSuggestionResponse {
  name: string;
  selector: string;
  selectorType: "XPath" | "CSS" | "ID";
  isDefault: boolean;
}

export interface StepAction {
  actionType: string;
  target: string;
  value: string;
  needsReview: boolean;
}

export interface ProjectSummary {
  id: number;
  name: string;
  status: "Running" | "Completed" | "Failed";
  lastUpdated: string;
  totalTestCases: number;
  passRate: number;
  failedCount: number;
}

export interface WorkflowSummary {
  id: number;
  title: string;
  status: "Processing" | "Completed" | "Failed";
  createdAt: string;
  testCasesCount: number;
}

export interface ProjectMetrics {
  totalPlans: number;
  parsedCases: number;
  passRate: number;
  failedTests: number;
  trend: {
    passRate: number[];
    tests: number[];
  };
}

export interface WorkflowStep {
  name: string;
  status: "Completed" | "Running" | "Failed" | "Pending";
}

export interface WorkflowOutput {
  name: string;
  description: string;
  url: string;
}

export interface WorkflowDetailResponse {
  id: number;
  name: string;
  status: "Processing" | "Completed" | "Failed";
  uploadedAt: string;
  testCases: TestCaseResponse[];
  steps: WorkflowStep[];
  logs: string[];
  outputs: WorkflowOutput[];
}

export interface GeneratedProjectResponse {
  id: number;
  testPlanId: number;
  packageName: string;
  packagePath: string;
  createdAt: string;
  status: string;
}

export interface ExecutionResultResponse {
  id: number;
  passed: boolean;
  log: string;
  screenshotPath: string;
  executedAt: string;
}

export interface CodeFile {
  name: string;
  language: string;
  content: string;
}

export interface CodeResponse {
  planId: number;
  planTitle: string;
  codeFiles: CodeFile[];
}

export interface ExecutionResponse {
  executionId: number;
  status: string;
  message: string;
}

export interface WorkflowDetail {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  testCasesCount: number;
  latestExecution?: {
    id: number;
    status: string;
    startedAt: string;
    completedAt?: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
  };
}

class ApiService {
  async uploadTestPlan(file: File): Promise<TestPlanResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const responseText = await response.text();
      let errorText = responseText;
      if (response.headers.get("content-type")?.includes("application/json")) {
        try {
          const parsed = JSON.parse(responseText) as { error?: string; message?: string };
          errorText = parsed.error ?? parsed.message ?? responseText;
        } catch {
          errorText = responseText;
        }
      }
      throw new Error(`Upload failed: ${response.statusText}. ${errorText}`);
    }

    return response.json();
  }

  async getTestPlans(): Promise<TestPlanResponse[]> {
    const response = await fetch(`${API_BASE_URL}/testplans`);
    if (!response.ok) {
      throw new Error(`Failed to fetch test plans: ${response.statusText}`);
    }
    return response.json();
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getParsedTestCases(planId: number): Promise<TestCaseResponse[]> {
    console.log(`📡 Fetching test cases for planId=${planId}`);
    const response = await fetch(`${API_BASE_URL}/testplans/${planId}/testcases`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to fetch test cases: ${response.statusText}`, errorText);
      throw new Error(`Failed to fetch parsed test cases: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`✅ API returned ${Array.isArray(data) ? data.length : 'non-array'} test cases`, data);
    return data;
  }

  async getLocators(planId: number): Promise<LocatorMappingResponse[]> {
    const response = await fetch(`${API_BASE_URL}/locators?planId=${planId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch locators: ${response.statusText}`);
    }
    return response.json();
  }

  async saveLocatorMapping(planId: number, mapping: Partial<LocatorMappingResponse>): Promise<LocatorMappingResponse> {
    const response = await fetch(`${API_BASE_URL}/locators/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, ...mapping })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save locator: ${response.statusText} ${errorText}`);
    }

    return response.json();
  }

  async getProjects(): Promise<ProjectSummary[]> {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    return response.json();
  }

  async getProjectMetrics(projectId: number): Promise<ProjectMetrics> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/metrics`);
    if (!response.ok) {
      throw new Error(`Failed to fetch project metrics: ${response.statusText}`);
    }
    return response.json();
  }

  async getWorkflowById(id: number): Promise<WorkflowDetail> {
    const response = await fetch(`${API_BASE_URL}/workflow/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch workflow: ${response.statusText}`);
    }
    return response.json();
  }

  async getCode(planId: number): Promise<CodeResponse> {
    const response = await fetch(`${API_BASE_URL}/code?planId=${planId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch code: ${response.statusText}`);
    }
    return response.json();
  }

  async runExecution(planId: number): Promise<ExecutionResponse> {
    const response = await fetch(`${API_BASE_URL}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to start execution: ${response.statusText} ${errorText}`);
    }

    return response.json();
  }

  async getTestPlan(id: number): Promise<TestPlanResponse> {
    const response = await fetch(`${API_BASE_URL}/testplans/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch test plan: ${response.statusText}`);
    }
    return response.json();
  }

  async getLocatorMappings(testCaseId: number): Promise<LocatorMappingResponse[]> {
    const response = await fetch(`${API_BASE_URL}/testcases/${testCaseId}/locators`);
    if (!response.ok) {
      throw new Error(`Failed to fetch locators: ${response.statusText}`);
    }
    return response.json();
  }

  async getStepActions(testCaseId: number): Promise<StepAction[]> {
    const response = await fetch(`${API_BASE_URL}/testcases/${testCaseId}/actions`);
    if (!response.ok) {
      throw new Error(`Failed to fetch step actions: ${response.statusText}`);
    }
    return response.json();
  }

  async suggestLocator(stepText: string): Promise<LocatorSuggestionResponse> {
    const response = await fetch(`${API_BASE_URL}/locators/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepText })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to suggest locator: ${response.statusText} ${errorText}`);
    }

    return response.json();
  }

  async generateCode(testPlanId: number): Promise<GeneratedProjectResponse> {
    const response = await fetch(`${API_BASE_URL}/generate/${testPlanId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Failed to generate code: ${response.statusText}`);
    }

    return response.json();
  }

  async executeTests(projectId: number): Promise<ExecutionResultResponse> {
    const response = await fetch(`${API_BASE_URL}/execute/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Failed to execute tests: ${response.statusText}`);
    }

    return response.json();
  }

  async getExecutionResults(projectId: number): Promise<ExecutionResultResponse[]> {
    const response = await fetch(`${API_BASE_URL}/execution/${projectId}/results`);
    if (!response.ok) {
      throw new Error(`Failed to fetch results: ${response.statusText}`);
    }
    return response.json();
  }

  async downloadProject(projectId: number): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/download/${projectId}`);
    if (!response.ok) {
      throw new Error(`Failed to download project: ${response.statusText}`);
    }
    return response.blob();
  }
}

export const apiService = new ApiService();
