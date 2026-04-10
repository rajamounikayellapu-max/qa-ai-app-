import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: "In Progress" | "Completed" | "Failed";
  currentStage: "upload" | "testcases" | "locators" | "code" | "execution";
  testPlanId?: number;
}

interface ProjectContextType {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  createProject: (name: string) => Promise<Project>;
  updateProjectStage: (stage: Project["currentStage"]) => void;
  loadProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedCurrent = localStorage.getItem("currentProject");
    const savedProjects = localStorage.getItem("projects");

    if (savedCurrent) {
      try {
        setCurrentProject(JSON.parse(savedCurrent));
      } catch (e) {
        console.error("Failed to parse current project from localStorage", e);
      }
    }

    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (e) {
        console.error("Failed to parse projects from localStorage", e);
      }
    }

    // Load projects from API on mount
    loadProjects();
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (currentProject) {
      localStorage.setItem("currentProject", JSON.stringify(currentProject));
    } else {
      localStorage.removeItem("currentProject");
    }
  }, [currentProject]);

  useEffect(() => {
    localStorage.setItem("projects", JSON.stringify(projects));
  }, [projects]);

  const createProject = async (name: string): Promise<Project> => {
    const response = await fetch("/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error("Failed to create project");
    }

    const project: Project = await response.json();
    setProjects(prev => [project, ...prev.slice(0, 4)]); // Keep only last 5
    setCurrentProject(project);
    return project;
  };

  const updateProjectStage = (stage: Project["currentStage"]) => {
    if (currentProject) {
      const updated = { ...currentProject, currentStage: stage, updatedAt: new Date().toISOString() };
      setCurrentProject(updated);
      setProjects(prev => prev.map(p => p.id === currentProject.id ? updated : p));
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch("/api/project");
      if (response.ok) {
        const data: Project[] = await response.json();
        setProjects(data);
      }
    } catch (e) {
      console.error("Failed to load projects", e);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        projects,
        setProjects,
        createProject,
        updateProjectStage,
        loadProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return context;
}