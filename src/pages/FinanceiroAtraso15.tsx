import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';

// Componente de exemplo para implementar a consulta SQL personalizada
const FinanceiroAtraso15: React.FC = () => {
  const [contratos, setContratos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Função para buscar contratos em atraso > 15 dias
  const fetchContratosAtraso15 = async (page: number) => {
    setIsLoading(true);
    try {
      // Consulta SQL direta para contratos em atraso > 15 dias
      const { data, error, count } = await supabase
        .from('contratos')
        .select(`
          *,
          planos(id, nome, radius),
          clientes(id, nome, idasaas),
          titulos!inner(id, valor, vencimento, status, pago)
        `, { count: 'exact' })
        .or('titulos.pago.is.null,titulos.pago.neq.true')
        .lt('titulos.vencimento', new Date(new Date().setDate(new Date().getDate() - 15)).toISOString())
        .neq('status', 'Bloqueado')
        .neq('status', 'Cancelado')
        .neq('tipo', 'Cliente Bonificado')
        .order('pppoe', { ascending: true })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;

      console.log('Total de registros em atraso > 15 dias encontrados:', count);
      setTotalCount(count || 0);

      if (data) {
        // Remover duplicatas de contratos (usando um Map com os IDs)
        const uniqueContratosMap = new Map();
        data.forEach(contrato => {
          if (!uniqueContratosMap.has(contrato.id)) {
            uniqueContratosMap.set(contrato.id, contrato);
          }
        });
        
        const uniqueContratos = Array.from(uniqueContratosMap.values());
        
        const contratosFormatados = uniqueContratos.map(contrato => ({
          ...contrato,
          cliente_nome: contrato.clientes?.nome || 'Cliente não encontrado',
          cliente_idasaas: contrato.clientes?.idasaas,
          plano: contrato.planos || null
        }));

        setContratos(contratosFormatados);
      } else {
        setContratos([]);
      }
    } catch (error: any) {
      console.error('Erro ao buscar contratos em atraso > 15 dias:', error.message);
      toast.error('Erro ao buscar contratos em atraso');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContratosAtraso15(currentPage);
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <div>
      <h2>Contratos em Atraso {'>'} 15 dias</h2>
      {isLoading ? (
        <p>Carregando...</p>
      ) : (
        <div>
          <p>Total: {totalCount} contratos</p>
          <ul>
            {contratos.map(contrato => (
              <li key={contrato.id}>
                {contrato.pppoe} - {contrato.cliente_nome}
              </li>
            ))}
          </ul>
          
          {/* Paginação simples */}
          <div>
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1}
            >
              Anterior
            </button>
            <span> Página {currentPage} </span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={contratos.length < itemsPerPage}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceiroAtraso15;
