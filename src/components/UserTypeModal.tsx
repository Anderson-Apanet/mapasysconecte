import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';

interface UserType {
  id_user_tipo: number;
  tipo: string;
  created_at: string;
}

interface UserTypePermission {
  id_user_tipo_permissao?: number;
  id_user_tipo: number;
  modulo: string;
  permissao: boolean;
}

interface UserTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: UserType | null;
  userTypePermissions: UserTypePermission[];
  onSuccess: () => void;
  availableModules: {
    [key: string]: string;
  };
}

const UserTypeModal: React.FC<UserTypeModalProps> = ({
  isOpen,
  onClose,
  userType,
  userTypePermissions,
  onSuccess,
  availableModules,
}) => {
  const [tipo, setTipo] = useState('');
  const [permissions, setPermissions] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userType) {
      setTipo(userType.tipo);
      const permObj = userTypePermissions.reduce((acc, curr) => {
        acc[curr.modulo] = curr.permissao;
        return acc;
      }, {} as { [key: string]: boolean });
      setPermissions(permObj);
    } else {
      setTipo('');
      setPermissions({});
    }
  }, [userType, userTypePermissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let userTypeId = userType?.id_user_tipo;

      if (!userTypeId) {
        // Create new user type
        const { data: newUserType, error: createError } = await supabase
          .from('user_tipo')
          .insert([{ tipo: tipo }])
          .select()
          .single();

        if (createError) throw createError;
        userTypeId = newUserType.id_user_tipo;
      } else {
        // Update existing user type
        const { error: updateError } = await supabase
          .from('user_tipo')
          .update({ tipo: tipo })
          .eq('id_user_tipo', userTypeId);

        if (updateError) throw updateError;
      }

      // Handle permissions
      const permissionsToUpsert = Object.entries(permissions).map(([modulo, permissao]) => ({
        id_user_tipo: userTypeId,
        modulo,
        permissao
      }));

      // Delete existing permissions
      await supabase
        .from('user_tipo_permissoes')
        .delete()
        .eq('id_user_tipo', userTypeId);

      // Insert new permissions
      if (permissionsToUpsert.length > 0) {
        const { error: permissionsError } = await supabase
          .from('user_tipo_permissoes')
          .insert(permissionsToUpsert);

        if (permissionsError) throw permissionsError;
      }

      toast.success(userType ? 'Tipo de usuário atualizado com sucesso!' : 'Tipo de usuário criado com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar tipo de usuário:', error);
      toast.error('Erro ao salvar tipo de usuário');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-auto p-6">
          <div className="absolute top-3 right-3">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1"
              aria-label="Fechar"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          <Dialog.Title className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            {userType ? 'Editar Tipo de Usuário' : 'Novo Tipo de Usuário'}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nome do Tipo
                </label>
                <input
                  type="text"
                  id="tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  placeholder="Ex: Administrador"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Permissões de Acesso
                </label>
                <div className="space-y-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  {Object.entries(availableModules).map(([key, label]) => (
                    <div key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`permission-${key}`}
                        checked={permissions[key] || false}
                        onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600"
                      />
                      <label
                        htmlFor={`permission-${key}`}
                        className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                {isLoading ? 'Salvando...' : userType ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default UserTypeModal;
