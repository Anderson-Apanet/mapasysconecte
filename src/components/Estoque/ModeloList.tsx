import React from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ModeloSummary {
  id: number;
  nome: string;
  marca: string;
  quantidade: number;
  tipo: string;
}

interface ModeloListProps {
  modelos: ModeloSummary[];
  onEdit: (modelo: ModeloSummary) => void;
  onDelete: (id: number) => void;
  onSelect: (id: number) => void;
}

const ModeloList: React.FC<ModeloListProps> = ({
  modelos,
  onEdit,
  onDelete,
  onSelect
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Marca
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Modelo
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tipo
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quantidade
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {modelos.map((modelo) => (
            <tr 
              key={modelo.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => onSelect(modelo.id)}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {modelo.marca}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {modelo.nome}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {modelo.tipo}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {modelo.quantidade}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(modelo);
                  }}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(modelo.id);
                  }}
                  className="text-red-600 hover:text-red-900"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ModeloList;
