import React, { useState } from 'react';
import { PencilIcon, TrashIcon, ArrowsRightLeftIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Material {
  id: number;
  serialnb: string;
  tipo: string;
  id_modelo: number;
  etiqueta: string;
  observacoes: string;
  created_at: string;
  modelo?: {
    nome: string;
    marca: string;
  };
  localizacao?: {
    localizacao_tipo: string;
    veiculo?: { placa: string };
    contrato?: { pppoe: string };
  };
}

interface MaterialListProps {
  materiais: Material[];
  onEdit: (material: Material) => void;
  onDelete: (id: number) => void;
  onMove: (material: Material) => void;
}

const MaterialList: React.FC<MaterialListProps> = ({
  materiais,
  onEdit,
  onDelete,
  onMove
}) => {
  const [expandedModelo, setExpandedModelo] = useState<string | null>(null);

  const renderLocalizacao = (material: Material) => {
    const loc = material.localizacao;
    if (!loc) return 'Empresa';
    
    if (loc.veiculo_id && loc.veiculo) {
      return `Veículo: ${loc.veiculo.placa}`;
    }
    
    if (loc.contrato_id && loc.contrato) {
      return `Contrato: ${loc.contrato.pppoe}`;
    }
    
    return 'Empresa';
  };

  // Agrupar materiais por modelo
  const materiaisPorModelo = materiais.reduce((acc, material) => {
    if (!material.modelo) return acc;
    
    const modeloKey = `${material.modelo.marca} ${material.modelo.nome}`;
    if (!acc[modeloKey]) {
      acc[modeloKey] = {
        marca: material.modelo.marca,
        nome: material.modelo.nome,
        materiais: []
      };
    }
    acc[modeloKey].materiais.push(material);
    return acc;
  }, {} as Record<string, { marca: string; nome: string; materiais: Material[] }>);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Modelo
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quantidade
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Object.entries(materiaisPorModelo).map(([modeloKey, info]) => (
            <React.Fragment key={modeloKey}>
              <tr 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedModelo(expandedModelo === modeloKey ? null : modeloKey)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center">
                  {expandedModelo === modeloKey ? (
                    <ChevronDownIcon className="h-5 w-5 mr-2" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 mr-2" />
                  )}
                  {`${info.marca} ${info.nome}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {info.materiais.length}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                </td>
              </tr>
              {expandedModelo === modeloKey && info.materiais.map((material) => (
                <tr key={material.id} className="bg-gray-50">
                  <td className="pl-14 pr-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {material.serialnb}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {material.tipo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {renderLocalizacao(material)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(material);
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(material);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <ArrowsRightLeftIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(material.id);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MaterialList;
