import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Material {
  id?: number;
  serialnb: string;
  tipo: string;
  id_modelo: number;
  etiqueta: string;
  observacoes: string;
}

interface ModeloMaterial {
  id: number;
  nome: string;
  marca: string;
}

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: Material) => void;
  material?: Material;
  modelos: ModeloMaterial[];
  tiposMaterial: string[];
}

const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  material,
  modelos,
  tiposMaterial
}) => {
  const [formData, setFormData] = useState<Material>({
    serialnb: '',
    tipo: '',
    id_modelo: 0,
    etiqueta: '',
    observacoes: ''
  });

  useEffect(() => {
    if (material) {
      setFormData(material);
    } else {
      setFormData({
        serialnb: '',
        tipo: '',
        id_modelo: 0,
        etiqueta: '',
        observacoes: ''
      });
    }
  }, [material]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-lg max-w-md w-full mx-4 p-6">
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            {material ? 'Editar Material' : 'Novo Material'}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Número de Série
              </label>
              <input
                type="text"
                value={formData.serialnb}
                onChange={(e) => setFormData({ ...formData, serialnb: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tipo
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              >
                <option value="">Selecione um tipo</option>
                {tiposMaterial.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Modelo
              </label>
              <select
                value={formData.id_modelo}
                onChange={(e) => setFormData({ ...formData, id_modelo: Number(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              >
                <option value="">Selecione um modelo</option>
                {modelos.map((modelo) => (
                  <option key={modelo.id} value={modelo.id}>
                    {modelo.marca} {modelo.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Etiqueta
              </label>
              <input
                type="text"
                value={formData.etiqueta}
                onChange={(e) => setFormData({ ...formData, etiqueta: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default MaterialModal;
