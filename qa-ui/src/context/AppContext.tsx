import { createContext, useContext, useState, ReactNode } from "react";
import { TestPlanResponse, GeneratedProjectResponse } from "../services/apiService";

interface AppContextType {
  currentTestPlan: TestPlanResponse | null;
  setCurrentTestPlan: (plan: TestPlanResponse | null) => void;
  currentProject: GeneratedProjectResponse | null;
  setCurrentProject: (project: GeneratedProjectResponse | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentTestPlan, setCurrentTestPlan] = useState<TestPlanResponse | null>(null);
  const [currentProject, setCurrentProject] = useState<GeneratedProjectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <AppContext.Provider
      value={{
        currentTestPlan,
        setCurrentTestPlan,
        currentProject,
        setCurrentProject,
        isLoading,
        setIsLoading,
        error,
        setError
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
}
