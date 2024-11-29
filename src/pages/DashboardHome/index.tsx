import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function DashboardHome() {
  const location = useLocation();

  useEffect(() => {
    console.log('DashboardHome rendering at:', location.pathname);
  }, [location]);

  // Só renderiza os cards se estiver na rota raiz
  if (location.pathname !== '/') {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Card de Clientes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900">Clientes</h3>
        <p className="mt-2 text-sm text-gray-600">
          Gerencie seus clientes e veja informações importantes.
        </p>
        <div className="mt-4">
          <span className="text-2xl font-bold text-primary-600">150</span>
          <span className="text-sm text-gray-500 ml-2">clientes ativos</span>
        </div>
      </div>

      {/* Card de Financeiro */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900">Financeiro</h3>
        <p className="mt-2 text-sm text-gray-600">
          Acompanhe suas finanças e faturamento.
        </p>
        <div className="mt-4">
          <span className="text-2xl font-bold text-green-600">R$ 25.000</span>
          <span className="text-sm text-gray-500 ml-2">este mês</span>
        </div>
      </div>

      {/* Card de Agenda */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900">Agenda</h3>
        <p className="mt-2 text-sm text-gray-600">
          Visualize seus compromissos e tarefas.
        </p>
        <div className="mt-4">
          <span className="text-2xl font-bold text-blue-600">8</span>
          <span className="text-sm text-gray-500 ml-2">tarefas hoje</span>
        </div>
      </div>
    </div>
  );
}
