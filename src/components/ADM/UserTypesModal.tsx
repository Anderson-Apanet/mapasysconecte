import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { UserGroupIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { fetchUserTypes, addUserType, deleteUserType, fetchUserTypePermissions } from '../../services/adm/userService';
import { UserType, UserTypePermission, DEFAULT_MODULES } from '../../types/userTypes';
import { supabase } from '../../utils/supabaseClient';
import toast from 'react-hot-toast';

interface UserTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserTypesModal: React.FC<UserTypesModalProps> = ({ isOpen, onClose }) => {
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [permissions, setPermissions] = useState<UserTypePermission[]>([]);
  const [newType, setNewType] = useState({ tipo: '' });
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);

  // Carregar tipos de usuário
  const loadUserTypes = async () => {
    try {
      const types = await fetchUserTypes();
      setUserTypes(types);
    } catch (error) {
      console.error('Erro ao carregar tipos:', error);
      toast.error('Erro ao carregar tipos de usuário');
    }
  };

  // Carregar permissões
  const loadPermissions = async (id_user_tipo: number) => {
    try {
      const perms = await fetchUserTypePermissions(id_user_tipo);
      setPermissions(perms);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      toast.error('Erro ao carregar permissões');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUserTypes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedType) {
      loadPermissions(selectedType.id_user_tipo);
    }
  }, [selectedType]);

  const handleAddType = async () => {
    if (!newType.tipo) return;
    
    setLoading(true);
    try {
      await addUserType(newType.tipo);
      setNewType({ tipo: '' });
      loadUserTypes();
      toast.success('Tipo de usuário criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar tipo:', error);
      toast.error('Erro ao criar tipo de usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteType = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este tipo?')) return;

    setLoading(true);
    try {
      await deleteUserType(id);
      loadUserTypes();
      setSelectedType(null);
      toast.success('Tipo de usuário excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir tipo:', error);
      toast.error('Erro ao excluir tipo de usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (modulo: string) => {
    if (!selectedType) return;

    setLoading(true);
    try {
      const currentPerm = permissions.find(p => p.modulo === modulo);
      
      if (currentPerm) {
        // Atualizar permissão existente
        const { error } = await supabase
          .from('user_tipo_permissoes')
          .update({ permissao: !currentPerm.permissao })
          .eq('id_user_tipo_permissao', currentPerm.id_user_tipo_permissao);

        if (error) throw error;
      } else {
        // Criar nova permissão
        const { error } = await supabase
          .from('user_tipo_permissoes')
          .insert([{
            id_user_tipo: selectedType.id_user_tipo,
            modulo,
            permissao: true
          }]);

        if (error) throw error;
      }

      loadPermissions(selectedType.id_user_tipo);
      toast.success('Permissão atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar permissão:', error);
      toast.error('Erro ao atualizar permissão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl mx-4 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-6 w-6 text-purple-500 mr-2" />
              <Dialog.Title className="text-2xl font-semibold text-gray-900 dark:text-white">
                Tipos de Usuários
              </Dialog.Title>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Lista de Tipos */}
            <div className="md:col-span-1 space-y-4">
              {/* Form para adicionar novo tipo */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Novo Tipo de Usuário
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newType.tipo}
                    onChange={(e) => setNewType({ tipo: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ex: Gerente"
                  />
                  <button
                    onClick={handleAddType}
                    disabled={loading}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Lista de tipos */}
              <div className="space-y-2">
                {userTypes.map((type) => (
                  <div
                    key={type.id_user_tipo}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedType?.id_user_tipo === type.id_user_tipo
                        ? 'bg-purple-50 dark:bg-purple-900 border-purple-500'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => setSelectedType(type)}
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      {type.tipo}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteType(type.id_user_tipo);
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissões */}
            <div className="md:col-span-2">
              {selectedType ? (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Permissões para: {selectedType.tipo}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DEFAULT_MODULES.map((modulo) => {
                      const perm = permissions.find(p => p.modulo === modulo);
                      return (
                        <div
                          key={modulo}
                          className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
                        >
                          <input
                            type="checkbox"
                            checked={perm?.permissao || false}
                            onChange={() => handleTogglePermission(modulo)}
                            disabled={loading}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {modulo}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  Selecione um tipo de usuário para gerenciar suas permissões
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default UserTypesModal;
