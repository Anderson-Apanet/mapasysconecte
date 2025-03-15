import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMapsApi } from '../utils/googleMapsLoader';
import { Contrato } from '../types/contrato';
import { Plano } from '../types/plano';
import { Bairro } from '../types/bairro';
import { User } from '../types/user';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import MapWithMarker from './MapWithMarker';

interface NovoContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteData: {
    id: number;
    nome: string;
  };
}

interface Plano {
  id: number;
  nome: string;
  valor: number;
}

const defaultCenter = {
  lat: -29.5441, // Latitude de Arroio do Sal - RS
  lng: -49.8890  // Longitude de Arroio do Sal - RS
};

export default function NovoContratoModal({
  isOpen,
  onClose,
  clienteData,
}: NovoContratoModalProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded } = useGoogleMapsApi();

  const [plano, setPlano] = useState("");
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [tipo, setTipo] = useState("Residencial");
  const [vencimento, setVencimento] = useState("");
  const [endereco, setEndereco] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [bairros, setBairros] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<google.maps.LatLngLiteral>(defaultCenter);
  const [isAddressBeingUpdatedByMap, setIsAddressBeingUpdatedByMap] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [vendedor, setVendedor] = useState("");

  // Função para gerar o PPPoE baseado no nome do cliente e data atual
  const generatePPPoE = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const firstName = clienteData.nome.split(' ')[0].toLowerCase();
    return `${firstName}${year}${month}${day}${hour}`;
  };

  // Função para obter o endereço a partir das coordenadas
  const getAddressFromLatLng = useCallback(async (lat: number, lng: number) => {
    try {
      setIsAddressBeingUpdatedByMap(true);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results && data.results[0]) {
        const addressComponents = data.results[0].address_components;
        let streetNumber = '', route = '', neighborhood = '';
        
        for (const component of addressComponents) {
          if (component.types.includes('street_number')) {
            streetNumber = component.long_name;
          }
          if (component.types.includes('route')) {
            route = component.long_name;
          }
          if (component.types.includes('sublocality') || component.types.includes('neighborhood')) {
            neighborhood = component.long_name;
          }
        }
        
        // Atualiza o endereço
        setEndereco(`${route}${streetNumber ? `, ${streetNumber}` : ''}`);
        
        // Procura o bairro na lista de bairros e atualiza se encontrar
        const foundBairro = bairros.find(b => b.nome.toLowerCase() === neighborhood.toLowerCase());
        if (foundBairro) {
          setBairro(foundBairro.id);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
      toast.error('Erro ao buscar endereço');
    } finally {
      setIsAddressBeingUpdatedByMap(false);
    }
  }, [bairros]);

  // Função para obter coordenadas a partir do endereço
  const getLatLngFromAddress = useCallback(async (address: string) => {
    if (!address || isAddressBeingUpdatedByMap) return;
    
    try {
      console.log('Geocodificando endereço:', address);
      // Adiciona "Arroio do Sal, RS" ao endereço para melhorar a precisão
      const fullAddress = `${address}, Arroio do Sal, RS`;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      console.log('Resposta da geocodificação:', data);
      
      if (data.results && data.results[0] && data.results[0].geometry) {
        const location = data.results[0].geometry.location;
        const newLocation = { lat: location.lat, lng: location.lng };
        console.log('Nova localização:', newLocation);
        setSelectedLocation(newLocation);
        
        // Centraliza o mapa na nova localização
        // if (map) {
        //   map.panTo(newLocation);
        // }
      }
    } catch (error) {
      console.error('Erro ao geocodificar endereço:', error);
    }
  }, [isAddressBeingUpdatedByMap]);

  // Handler para clique no mapa
  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const newLocation = { lat, lng };
      console.log('Clique no mapa:', newLocation);
      setSelectedLocation(newLocation);
      await getAddressFromLatLng(lat, lng);
    }
  }, [getAddressFromLatLng]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar planos
        const { data: planosData, error: planosError } = await supabase
          .from('planos')
          .select('*')
          .order('nome', { ascending: true });

        if (planosError) throw planosError;
        setPlanos(planosData || []);

        // Buscar bairros
        const { data: bairrosData, error: bairrosError } = await supabase
          .from('bairros')
          .select('*')
          .order('nome', { ascending: true });

        if (bairrosError) throw bairrosError;
        setBairros(bairrosData || []);
        
        // Buscar usuários (vendedores)
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('nome', { ascending: true });
          
        if (usersError) throw usersError;
        setUsers(usersData || []);
        
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast.error('Erro ao carregar dados. Por favor, tente novamente.');
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      getLatLngFromAddress(endereco);
    }, 1000); // Delay para evitar muitas requisições durante a digitação
    
    return () => clearTimeout(timeoutId);
  }, [endereco, getLatLngFromAddress]);

  // Monitorar mudanças no selectedLocation
  useEffect(() => {
    console.log('selectedLocation atualizado:', selectedLocation);
  }, [selectedLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clienteData.id) {
      toast.error('Erro: ID do cliente não encontrado');
      return;
    }

    if (!plano) {
      toast.error('Por favor, selecione um plano');
      return;
    }

    if (!vencimento) {
      toast.error('Por favor, informe o dia do vencimento');
      return;
    }

    if (!selectedLocation) {
      toast.error('Por favor, selecione uma localização no mapa');
      return;
    }

    setLoading(true);
    try {
      const pppoe = generatePPPoE();
      const senha = pppoe.replace(/[^0-9]/g, '').split('').reverse().join('');

      const contratoData = {
        id_cliente: clienteData.id,
        id_plano: plano,
        pppoe,
        senha,
        status: 'Criado',
        tipo,
        dia_vencimento: parseInt(vencimento),
        endereco,
        complemento,
        id_bairro: bairro || null,
        data_cad_contrato: new Date().toISOString().split('T')[0],
        contratoassinado: false,
        pendencia: false,
        locallat: selectedLocation.lat,
        locallon: selectedLocation.lng,
        vendedor: vendedor || null
      };

      console.log('Dados a serem salvos:', contratoData);

      const { error } = await supabase
        .from('contratos')
        .insert([contratoData]);

      if (error) throw error;

      // Busca os dados do plano para obter o radius
      const { data: planoData, error: planoError } = await supabase
        .from('planos')
        .select('radius')
        .eq('id', plano)
        .single();

      if (planoError) {
        console.error('Erro ao buscar dados do plano:', planoError);
      } else if (!planoData.radius) {
        console.error('Plano não tem o campo radius definido');
      } else {
        // Adiciona as credenciais no banco radius
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
          const apiUrl = baseUrl.startsWith('http') ? `${baseUrl}/api` : baseUrl;
          const response = await fetch(`${apiUrl}/support/add-contract-credentials`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: contratoData.pppoe,
              password: contratoData.senha,
              groupname: planoData.radius
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro ao adicionar credenciais no radius:', errorData);
            toast.error('Erro ao adicionar credenciais no radius');
          }
        } catch (error) {
          console.error('Erro ao adicionar credenciais no radius:', error);
          toast.error('Erro ao adicionar credenciais no radius');
        }
      }

      toast.success('Contrato criado com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
      toast.error('Erro ao criar contrato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      as="div"
      className="fixed inset-0 z-[60] overflow-y-auto"
      onClose={onClose}
      open={isOpen}
    >
      <div className="min-h-screen px-4 text-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="flex justify-between items-center">
            <Dialog.Title className="text-lg font-medium">
              Novo Contrato - {clienteData?.nome}
            </Dialog.Title>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Plano
                </label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={plano}
                  onChange={(e) => setPlano(e.target.value)}
                  required
                >
                  <option value="">Selecione um plano</option>
                  {planos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} - R$ {p.valor}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tipo
                </label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  required
                >
                  <option value="Residencial">Residencial</option>
                  <option value="Comercial">Comercial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Dia do Vencimento
                </label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={vencimento}
                  onChange={(e) => setVencimento(e.target.value)}
                  required
                >
                  <option value="">Selecione o dia</option>
                  {[...Array(28)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Endereço
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Digite o endereço ou clique no mapa"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Complemento
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bairro
                </label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  required
                >
                  <option value="">Selecione um bairro</option>
                  {bairros.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Vendedor
                </label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={vendedor}
                  onChange={(e) => setVendedor(e.target.value)}
                >
                  <option value="">Selecione um vendedor</option>
                  {users.map((user) => (
                    <option key={user.id_user} value={user.nome || ""}>
                      {user.nome}
                    </option>
                  ))}
                </select>
              </div>

              {console.log('Renderizando mapa com selectedLocation:', selectedLocation)}
              <MapWithMarker 
                center={selectedLocation} 
                onClick={handleMapClick}
              />

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={onClose}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
