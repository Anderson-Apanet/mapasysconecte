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
import Veiculos from './pages/ADM/Veiculos';
import Users from './pages/ADM/Users';
import Messages from './pages/ADM/Messages';
import ResetPassword from './pages/ResetPassword';
import PrivateRoute from './components/PrivateRoute';
import { ROUTES } from './constants/routes';

const App: React.FC = () => {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Rota pública */}
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
        <Route path={ROUTES.RESETPW} element={<ResetPassword />} />
        {/* Rota coringa para redefinição de senha - captura qualquer caminho que o Supabase possa adicionar */}
        <Route path="/resetpw/*" element={<ResetPassword />} />

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

        {/* Rotas administrativas */}
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
        <Route path={ROUTES.ADM_USERS} element={
          <PrivateRoute>
            <Users />
          </PrivateRoute>
        } />
        <Route path={ROUTES.ADM_MESSAGES} element={
          <PrivateRoute>
            <Messages />
          </PrivateRoute>
        } />

        {/* Redirecionar para a página inicial se a rota não existir */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </Router>
  );
};

export default App;
