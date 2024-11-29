import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Home from './pages/Home';
import { ADM } from './pages/ADM';
import Clientes from './pages/Clientes';
import Financeiro from './pages/Financeiro';
import Agenda from './pages/Agenda';
import Suporte from './pages/Suporte';
import Planos from './pages/Planos';

function Layout() {
  const { isExpanded } = useSidebar();

  return (
    <div className="flex h-screen w-screen bg-sky-50 dark:bg-sky-950 overflow-hidden">
      <Toaster position="top-right" />
      <Sidebar />
      <div 
        className={`flex-1 overflow-auto transition-all duration-300 ${
          isExpanded ? 'ml-64' : 'ml-16'
        }`}
      >
        <div className="min-h-screen bg-sky-50 dark:bg-sky-950">
          <div className="w-full p-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/adm" element={<ADM />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/planos" element={<Planos />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/suporte" element={<Suporte />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-sky-50 dark:bg-sky-950 transition-colors duration-200">
        <Toaster position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <SidebarProvider>
                  <Layout />
                </SidebarProvider>
              }
            />
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}
