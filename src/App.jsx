
import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import "./App.css";


import Navbar from "./Components/Navbar";

const Home = lazy(() => import("./Pages/Home"));
const Projects = lazy(() => import("./Pages/Projects"));
const Contact = lazy(() => import("./Pages/Contact"));
const TaskManager = lazy(() => import("./Pages/TaskManager"));
const NotFound = lazy(() => import("./Pages/NotFound"));

//------------------------------------------------

function App() {
 
  return (
    <>
      <Navbar />

      <Suspense fallback={<div className="route-loading" role="status">Loading page...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/projects" element={<Projects />} />

          <Route path="/contact" element={<Contact />} />

          <Route path="/tasks" element={<TaskManager />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      

    </>
  );
}

export default App;
