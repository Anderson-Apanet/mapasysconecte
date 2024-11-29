import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import { Cliente } from '../types/cliente';
import ClienteModal from '../components/ClienteModal';

const Clientes: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const clientesPerPage = 5;

  // Buscar clientes
  const fetchClientes = async () => {
    try {
      setLoading(true);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('Usuário não autenticado');
        toast.error('Você precisa estar autenticado para ver os clientes');
        return;
      }

      const { data, error } = await supabase
        .from('clientes')
        .select(`
          id,
          nome,
          email,
          cpf_cnpj,
          bairro,
          id_empresa
        `)
        .eq('id_empresa', 2)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar clientes:', error);
        toast.error('Erro ao carregar clientes: ' + error.message);
        return;
      }

      setClientes(data || []);
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar clientes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  // Filtragem de clientes
  const filteredClientes = clientes.filter((cliente) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      cliente.nome?.toLowerCase().includes(searchLower) ||
      cliente.email?.toLowerCase().includes(searchLower) ||
      cliente.bairro?.toLowerCase().includes(searchLower) ||
      cliente.cpf_cnpj?.toLowerCase().includes(searchLower)
    );
  });

  // Paginação
  const totalPages = Math.ceil(filteredClientes.length / clientesPerPage);
  const indexOfLastCliente = currentPage * clientesPerPage;
  const indexOfFirstCliente = indexOfLastCliente - clientesPerPage;
  const currentClientes = filteredClientes.slice(indexOfFirstCliente, indexOfLastCliente);

  // Reset página quando mudar a busca
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Cliente excluído com sucesso!');
      fetchClientes();
    } catch (error: any) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Erro ao excluir cliente: ' + error.message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciamento de Clientes</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Gerencie os clientes cadastrados no sistema.
        </p>
      </div>

      {/* Search and Add Client */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex-1 w-full sm:max-w-xs">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, email, CPF/CNPJ ou bairro..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        <button
          onClick={() => {
            setSelectedCliente(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : currentClientes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="backdrop-blur-md bg-white/30 dark:bg-gray-800/30 rounded-xl border border-white/50 dark:border-gray-700/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-shadow duration-300">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
              <thead>
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    CPF/CNPJ
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bairro
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                {currentClientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {cliente.nome || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {cliente.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {cliente.cpf_cnpj || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {cliente.bairro || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(cliente)}
                        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mr-4 transition-colors duration-150"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cliente.id)}
                        className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-150"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center items-center gap-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md transition-colors duration-150 
                  ${currentPage === 1
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                  }`}
              >
                Primeiro
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md transition-colors duration-150 
                  ${currentPage === 1
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                  }`}
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md transition-colors duration-150 
                  ${currentPage === totalPages
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                  }`}
              >
                Próximo
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md transition-colors duration-150 
                  ${currentPage === totalPages
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                  }`}
              >
                Último
              </button>
            </div>
          )}
        </div>
      )}

      <ClienteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cliente={selectedCliente}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchClientes();
        }}
      />
    </div>
  );
};

export default Clientes;
