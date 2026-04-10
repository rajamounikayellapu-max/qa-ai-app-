import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, CheckCircle, AlertCircle, PlayCircle } from "lucide-react";

interface ProjectCardProps {
  id: string;
  name: string;
  status: "Running" | "Completed" | "Failed";
  lastUpdated: string;
  totalTestCases: number;
  passRate: number;
  failedCount: number;
}

export default function ProjectCard({
  id,
  name,
  status,
  lastUpdated,
  totalTestCases,
  passRate,
  failedCount,
}: ProjectCardProps) {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "Running":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="w-4 h-4" />;
      case "Running":
        return <PlayCircle className="w-4 h-4" />;
      case "Failed":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer"
      whileHover={{ scale: 1.02 }}
      onClick={() => navigate(`/project-details/${id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">{name}</h3>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                status
              )}`}
            >
              {getStatusIcon(status)}
              {status}
            </span>
            <span className="text-sm text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastUpdated}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900">{totalTestCases}</div>
          <div className="text-sm text-slate-600">Test Cases</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{passRate}%</div>
          <div className="text-sm text-slate-600">Pass Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{failedCount}</div>
          <div className="text-sm text-slate-600">Failed</div>
        </div>
      </div>
    </motion.div>
  );
}