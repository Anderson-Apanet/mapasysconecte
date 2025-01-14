import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import Login from './pages/Login';
import Clientes from './pages/Clientes';
import Financeiro from './pages/Financeiro';
import Agenda from './pages/Agenda';
import Planos from './pages/Planos';
import Rede from './pages/Rede';
import Dashboard from './pages/Dashboard';
import Suporte from './pages/Suporte';
import ADM from './pages/ADM';
import Caixa from './pages/Caixa';
import Tecnicos from './pages/Tecnicos';
import Estoque from './pages/Estoque';
import Bairros from './pages/ADM/Bairros';
import Veiculos from './pages/Veiculos';
import PrivateRoute from './components/PrivateRoute';
import { ROUTES } from './constants/routes';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen">
        <Toaster position="top-right" />
        <Routes>
          {/* Rota pública */}
          <Route path={ROUTES.LOGIN} element={<Login />} />

          {/* Rotas protegidas */}
          <Route path={ROUTES.HOME} element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
          <Route path={ROUTES.DASHBOARD} element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path={ROUTES.CLIENTES} element={
            <PrivateRoute>
              <Clientes />
            </PrivateRoute>
          } />
          <Route path={ROUTES.FINANCEIRO} element={
            <PrivateRoute>
              <Financeiro />
            </PrivateRoute>
          } />
          <Route path={ROUTES.AGENDA} element={
            <PrivateRoute>
              <Agenda />
            </PrivateRoute>
          } />
          <Route path={ROUTES.PLANOS} element={
            <PrivateRoute>
              <Planos />
            </PrivateRoute>
          } />
          <Route path={ROUTES.REDE} element={
            <PrivateRoute>
              <Rede />
            </PrivateRoute>
          } />
          <Route path={ROUTES.SUPORTE} element={
            <PrivateRoute>
              <Suporte />
            </PrivateRoute>
          } />
          <Route path={ROUTES.CAIXA} element={
            <PrivateRoute>
              <Caixa />
            </PrivateRoute>
          } />
          <Route path={ROUTES.ADM} element={
            <PrivateRoute>
              <ADM />
            </PrivateRoute>
          } />
          <Route path={ROUTES.TECNICOS} element={
            <PrivateRoute>
              <Tecnicos />
            </PrivateRoute>
          } />
          <Route path={ROUTES.ESTOQUE} element={
            <PrivateRoute>
              <Estoque />
            </PrivateRoute>
          } />
          <Route path={ROUTES.ADM_BAIRROS} element={
            <PrivateRoute>
              <Bairros />
            </PrivateRoute>
          } />
          <Route path={ROUTES.ADM_VEICULOS} element={
            <PrivateRoute>
              <Veiculos />
            </PrivateRoute>
          } />

          {/* Redirecionar para home se a rota não existir */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
