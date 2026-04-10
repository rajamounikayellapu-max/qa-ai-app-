import AppRouter from "./AppRouter";
import { AppProvider } from "./context/AppContext";
import { ProjectProvider } from "./context/ProjectContext";

export default function App() {
  return (
    <AppProvider>
      <ProjectProvider>
        <AppRouter />
      </ProjectProvider>
    </AppProvider>
  );
}
