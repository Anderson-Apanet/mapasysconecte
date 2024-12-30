import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Contrato } from '../types/contrato';
import { Plano } from '../types/plano';
import { Bairro } from '../types/bairro';
import { User } from '../types/user';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import { GoogleMap, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: -23.5505, // Latitude padrão (ajuste para sua região)
  lng: -46.6333  // Longitude padrão (ajuste para sua região)
};

interface NovoContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: number;
  clienteNome: string;
  clienteBairro: string | null;
  clienteEndereco: string | null;
  clienteComplemento: string | null;
  onSuccess: () => void;
}

export default function NovoContratoModal({ 
  isOpen, 
  onClose, 
  clienteId, 
  clienteNome,
  clienteBairro,
  clienteEndereco,
  clienteComplemento,
  onSuccess 
}: NovoContratoModalProps) {
  const [formData, setFormData] = useState<Partial<Contrato>>({
    id_cliente: clienteId,
    id_plano: null,
    pppoe: '',
    senha: '',
    status: 'Criado',
    tipo: 'Residencial',
    dia_vencimento: 10,
    contratoassinado: false,
    vendedor: '',
    data_cad_contrato: new Date().toISOString().split('T')[0],
    id_bairro: null,
    endereco: clienteEndereco || '',
    complemento: clienteComplemento || '',
    locallat: '',
    locallon: '',
    numero: ''
  });

  const [planos, setPlanos] = useState<Plano[]>([]);
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const lastValidPosition = useRef<google.maps.LatLngLiteral | null>(null);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (window.google) {
      geocoder.current = new google.maps.Geocoder();
      setIsGoogleLoaded(true);
    }
  }, []);

  const formatFullAddress = (components: google.maps.GeocoderAddressComponent[]): string => {
    let street = '', number = '', neighborhood = '', city = '', state = '';

    for (const component of components) {
      if (component.types.includes('route')) {
        street = component.long_name;
      }
      if (component.types.includes('street_number')) {
        number = component.long_name;
      }
      if (component.types.includes('sublocality') || component.types.includes('neighborhood')) {
        neighborhood = component.long_name;
      }
      if (component.types.includes('administrative_area_level_2')) {
        city = component.long_name;
      }
      if (component.types.includes('administrative_area_level_1')) {
        state = component.short_name;
      }
    }

    const addressParts = [];
    if (street) addressParts.push(street);
    if (number) addressParts.push(number);
    if (neighborhood) addressParts.push(neighborhood);
    if (city) addressParts.push(city);
    if (state) addressParts.push(state);

    return addressParts.join(', ');
  };

  const updateMapFromAddress = useCallback(() => {
    if (geocoder.current && formData.endereco) {
      const searchAddress = `${formData.endereco}${formData.bairro ? `, ${formData.bairro}` : ''}, Arroio do Sal - RS`;
      geocoder.current.geocode({ address: searchAddress }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const location = results[0].geometry.location;
          const newPosition = {
            lat: location.lat(),
            lng: location.lng()
          };
          
          // Salvar última posição válida
          lastValidPosition.current = newPosition;
          
          // Atualizar marcador e coordenadas
          setMarkerPosition(newPosition);

          const fullAddress = formatFullAddress(results[0].address_components);
          let neighborhood = '';

          for (const component of results[0].address_components) {
            if (component.types.includes('sublocality') || component.types.includes('neighborhood')) {
              neighborhood = component.long_name;
            }
          }

          setFormData(prev => ({
            ...prev,
            locallat: newPosition.lat.toString(),
            locallon: newPosition.lng.toString(),
            endereco: fullAddress,
            bairro: neighborhood || prev.bairro
          }));

          if (map) {
            map.panTo(newPosition);
            map.setZoom(17);
          }
        }
      });
    }
  }, [formData.endereco, formData.bairro, map]);

  // Debounce para não fazer muitas requisições ao digitar
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.endereco && formData.endereco.trim() !== '') {
        updateMapFromAddress();
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData.endereco, updateMapFromAddress]);

  const onMapClick = async (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });
      
      // Atualizar lat/lng no formulário
      setFormData(prev => ({
        ...prev,
        locallat: lat.toString(),
        locallon: lng.toString()
      }));

      // Usar Geocoding para obter o endereço
      const geocoder = new google.maps.Geocoder();
      try {
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results[0]) {
          const addressComponents = response.results[0].address_components;
          let streetNumber = '';
          let route = '';
          let neighborhood = '';

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

          // Atualizar campos de endereço
          setFormData(prev => ({
            ...prev,
            endereco: route,
            numero: streetNumber,
            // Não atualizamos o bairro automaticamente pois precisamos manter o id_bairro
          }));
        }
      } catch (error) {
        console.error('Erro ao obter endereço:', error);
      }
    }
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    // Centralizar o mapa em Arroio do Sal - RS
    const initialPosition = { lat: -29.5441, lng: -49.8890 };
    lastValidPosition.current = initialPosition;
    map.setCenter(initialPosition);
    map.setZoom(15);
  }, []);

  // Estado para os planos e usuários
  // Carregar planos e usuários ao abrir o modal
  useEffect(() => {
    const fetchData = async () => {
      // Buscar planos
      const { data: planosData, error: planosError } = await supabase
        .from('planos')
        .select('*')
        .eq('ativo', true);

      if (planosError) {
        console.error('Erro ao buscar planos:', planosError);
        toast.error('Erro ao carregar planos');
      } else {
        setPlanos(planosData || []);
      }

      // Buscar bairros
      const { data: bairrosData, error: bairrosError } = await supabase
        .from('bairros')
        .select('*')
        .order('nome');

      if (bairrosError) {
        console.error('Erro ao buscar bairros:', bairrosError);
        toast.error('Erro ao carregar bairros');
      } else {
        setBairros(bairrosData || []);
      }

      // Buscar usuários
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('nome', { ascending: true });

      if (usersError) {
        console.error('Erro ao buscar usuários:', usersError);
        toast.error('Erro ao carregar usuários');
      } else {
        setUsers(usersData || []);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Resetar form ao fechar o modal
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        id_cliente: clienteId,
        id_plano: null,
        pppoe: '',
        senha: '',
        status: 'Criado',
        tipo: 'Residencial',
        dia_vencimento: 10,
        contratoassinado: false,
        vendedor: '',
        data_cad_contrato: new Date().toISOString().split('T')[0],
        id_bairro: null,
        endereco: clienteEndereco || '',
        complemento: clienteComplemento || '',
        locallat: '',
        locallon: '',
        numero: ''
      });
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.id_plano) {
        toast.error('Por favor, selecione um plano');
        return;
      }

      if (!formData.id_bairro) {
        toast.error('Por favor, selecione um bairro');
        return;
      }

      const { error: insertError } = await supabase
        .from('contratos')
        .insert([{
          id_cliente: formData.id_cliente,
          id_plano: formData.id_plano,
          id_bairro: formData.id_bairro,
          pppoe: formData.pppoe,
          senha: formData.senha,
          status: formData.status,
          tipo: formData.tipo,
          dia_vencimento: formData.dia_vencimento,
          contratoassinado: formData.contratoassinado,
          vendedor: formData.vendedor,
          data_cad_contrato: formData.data_cad_contrato,
          endereco: formData.endereco,
          complemento: formData.complemento,
          locallat: formData.locallat,
          locallon: formData.locallon
        }]);

      if (insertError) throw insertError;

      toast.success('Contrato criado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
      toast.error('Erro ao criar contrato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={React.Fragment}>
      <Dialog 
        as="div" 
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={onClose}
      >
        <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
            &#8203;
          </span>

          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6 sm:align-middle">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-2"
                  onClick={onClose}
                >
                  <span className="sr-only">Fechar</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
                    Novo Contrato para {clienteNome}
                  </Dialog.Title>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Mapa */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Localização (clique no mapa para marcar)
                      </label>
                      <div className="h-[400px] w-full rounded-lg overflow-hidden">
                        <GoogleMap
                          mapContainerStyle={mapContainerStyle}
                          center={markerPosition || defaultCenter}
                          zoom={15}
                          onClick={onMapClick}
                          onLoad={onMapLoad}
                          options={{
                            streetViewControl: false,
                            mapTypeControl: false,
                            fullscreenControl: false,
                            zoomControl: true,
                            styles: [
                              {
                                featureType: "poi",
                                elementType: "labels",
                                stylers: [{ visibility: "off" }]
                              }
                            ]
                          }}
                        >
                          {markerPosition && (
                            <Marker
                              position={markerPosition}
                              draggable={true}
                              onDragEnd={(e) => {
                                if (e.latLng) {
                                  onMapClick({
                                    latLng: e.latLng,
                                  } as google.maps.MapMouseEvent);
                                }
                              }}
                            />
                          )}
                        </GoogleMap>
                      </div>
                    </div>

                    {/* Endereço */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Logradouro
                        </label>
                        <input
                          type="text"
                          id="endereco"
                          name="endereco"
                          value={formData.endereco || ''}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label htmlFor="numero" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Número
                        </label>
                        <input
                          type="text"
                          id="numero"
                          name="numero"
                          value={formData.numero || ''}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label htmlFor="complemento" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Complemento
                        </label>
                        <input
                          type="text"
                          id="complemento"
                          name="complemento"
                          value={formData.complemento || ''}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label htmlFor="bairro" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Bairro
                        </label>
                        <select
                          id="bairro"
                          name="id_bairro"
                          value={formData.id_bairro || ''}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Selecione um bairro</option>
                          {bairros.map(bairro => (
                            <option key={bairro.id} value={bairro.id}>
                              {bairro.nome} - {bairro.cidade}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="locallat" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Latitude
                        </label>
                        <input
                          type="text"
                          id="locallat"
                          name="locallat"
                          value={formData.locallat || ''}
                          onChange={handleChange}
                          readOnly
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white bg-gray-100"
                        />
                      </div>

                      <div>
                        <label htmlFor="locallon" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Longitude
                        </label>
                        <input
                          type="text"
                          id="locallon"
                          name="locallon"
                          value={formData.locallon || ''}
                          onChange={handleChange}
                          readOnly
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white bg-gray-100"
                        />
                      </div>
                    </div>

                    {/* Campo de Plano */}
                    <div>
                      <label htmlFor="plano" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Plano
                      </label>
                      <select
                        id="plano"
                        name="id_plano"
                        value={formData.id_plano || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Selecione um plano</option>
                        {planos.map(plano => (
                          <option key={plano.id} value={plano.id}>
                            {plano.nome} - R$ {plano.valor}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* PPPoE e Senha */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="pppoe" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          PPPoE
                        </label>
                        <input
                          type="text"
                          id="pppoe"
                          name="pppoe"
                          required
                          value={formData.pppoe || ''}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label htmlFor="senha" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Senha
                        </label>
                        <input
                          type="text"
                          id="senha"
                          name="senha"
                          required
                          value={formData.senha || ''}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Status e Tipo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Status
                        </label>
                        <select
                          id="status"
                          name="status"
                          value={formData.status || ''}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        >
                          <option value="Criado">Criado</option>
                          <option value="Agendado">Agendado</option>
                          <option value="Instalado">Instalado</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Tipo
                        </label>
                        <select
                          id="tipo"
                          name="tipo"
                          value={formData.tipo || 'Residencial'}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        >
                          <option value="Residencial">Residencial</option>
                          <option value="Comercial">Comercial</option>
                          <option value="Rural">Rural</option>
                        </select>
                      </div>
                    </div>

                    {/* Dia Vencimento e Vendedor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="dia_vencimento" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Dia do Vencimento
                        </label>
                        <input
                          type="number"
                          id="dia_vencimento"
                          name="dia_vencimento"
                          min="1"
                          max="31"
                          value={formData.dia_vencimento || 10}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label htmlFor="vendedor" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Vendedor
                        </label>
                        <select
                          id="vendedor"
                          name="vendedor"
                          value={formData.vendedor || ''}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Selecione um vendedor</option>
                          {users.map(user => (
                            <option key={user.id} value={user.nome}>
                              {user.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Contrato Assinado */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="contratoassinado"
                        name="contratoassinado"
                        checked={formData.contratoassinado || false}
                        onChange={(e) => setFormData(prev => ({ ...prev, contratoassinado: e.target.checked }))}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                      <label htmlFor="contratoassinado" className="ml-2 block text-sm text-gray-900 dark:text-white">
                        Contrato Assinado
                      </label>
                    </div>

                    {/* Botões */}
                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                      >
                        {loading ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                        onClick={onClose}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
