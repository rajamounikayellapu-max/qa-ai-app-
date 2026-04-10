import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, PlayCircle, ArrowRight } from "lucide-react";
import { useProject } from "../context/ProjectContext";

export default function RecentProjects() {
  const navigate = useNavigate();
  const { projects } = useProject();

  // Get the 3 most recent projects
  const recentProjects = projects
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  if (recentProjects.length === 0) {
    return null;
  }

  const getStageDisplay = (stage: string) => {
    const stageMap: { [key: string]: string } = {
      upload: "Upload Complete",
      testcases: "Test Cases Generated",
      locators: "Locators Identified",
      scripts: "Scripts Generated",
      execution: "Tests Executing",
      results: "Results Available"
    };
    return stageMap[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "upload":
        return "bg-blue-100 text-blue-800";
      case "testcases":
        return "bg-purple-100 text-purple-800";
      case "locators":
        return "bg-indigo-100 text-indigo-800";
      case "scripts":
        return "bg-cyan-100 text-cyan-800";
      case "execution":
        return "bg-yellow-100 text-yellow-800";
      case "results":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Recent Projects</h2>
        <button
          onClick={() => navigate("/projects")}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recentProjects.map((project) => (
          <motion.div
            key={project.id}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-200"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{project.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStageColor(
                      project.currentStage
                    )}`}
                  >
                    <PlayCircle className="w-3 h-3" />
                    {getStageDisplay(project.currentStage)}
                  </span>
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/project/${project.id}/testcases`)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              Continue Project
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}