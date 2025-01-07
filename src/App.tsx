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
import { ADM } from './pages/ADM';
import Caixa from './pages/Caixa';
import Tecnicos from './pages/Tecnicos';
import Estoque from './pages/Estoque';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Toaster position="top-right" />
        <Routes>
          {/* Rota pública */}
          <Route path="/login" element={<Login />} />

          {/* Rotas protegidas */}
          <Route path="/" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/clientes" element={
            <PrivateRoute>
              <Clientes />
            </PrivateRoute>
          } />
          <Route path="/financeiro" element={
            <PrivateRoute>
              <Financeiro />
            </PrivateRoute>
          } />
          <Route path="/agenda" element={
            <PrivateRoute>
              <Agenda />
            </PrivateRoute>
          } />
          <Route path="/planos" element={
            <PrivateRoute>
              <Planos />
            </PrivateRoute>
          } />
          <Route path="/rede" element={
            <PrivateRoute>
              <Rede />
            </PrivateRoute>
          } />
          <Route path="/suporte" element={
            <PrivateRoute>
              <Suporte />
            </PrivateRoute>
          } />
          <Route path="/adm" element={
            <PrivateRoute>
              <ADM />
            </PrivateRoute>
          } />
          <Route path="/caixa" element={
            <PrivateRoute>
              <Caixa />
            </PrivateRoute>
          } />
          <Route path="/tecnicos" element={
            <PrivateRoute>
              <Tecnicos />
            </PrivateRoute>
          } />
          <Route path="/estoque" element={
            <PrivateRoute>
              <Estoque />
            </PrivateRoute>
          } />

          {/* Redirecionar qualquer rota não encontrada para a home ou login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
