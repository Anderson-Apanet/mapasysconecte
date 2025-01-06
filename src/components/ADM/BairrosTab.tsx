import React, { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Bairro } from '../../types/adm';
import { fetchBairros, deleteBairro } from '../../services/adm/bairroService';

interface BairrosTabProps {
  onEdit: (bairro: Bairro) => void;
  onAdd: () => void;
}

export function BairrosTab({ onEdit, onAdd }: BairrosTabProps) {
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const loadBairros = async () => {
    try {
      setIsLoading(true);
      const { bairros: bairrosData, totalPages: total } = await fetchBairros(currentPage, searchTerm);
      setBairros(bairrosData);
      setTotalPages(total);
    } catch (error) {
      console.error('Erro ao buscar bairros:', error);
      toast.error('Erro ao carregar bairros');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBairros();
  }, [currentPage, searchTerm]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este bairro?')) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteBairro(id);
      toast.success('Bairro excluído com sucesso!');
      loadBairros();
    } catch (error) {
      console.error('Erro ao excluir bairro:', error);
      toast.error('Erro ao excluir bairro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="Buscar bairros..."
          className="px-4 py-2 border rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Novo Bairro</span>
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {bairros.map((bairro) => (
            <li key={bairro.id}>
              <div className="px-4 py-4 flex items-center justify-between sm:px-6">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {bairro.nome}
                  </p>
                  <p className="text-sm text-gray-500">
                    {bairro.cidade}
                  </p>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => onEdit(bairro)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(bairro.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 border rounded-lg disabled:opacity-50"
        >
          Anterior
        </button>
        <span>
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 border rounded-lg disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
