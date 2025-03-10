import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabaseClient';
import { saveEvent } from '../../services/agenda';
import { format } from 'date-fns';
import Modal from '../Modal';
import { Dialog } from '@headlessui/react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMapsApi } from '../../utils/googleMapsLoader';

interface InstalacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: AgendaEvent;
  onEventUpdated?: () => void;
}

interface Cliente {
  id: number;
  nome: string;
}

interface ContratoDetalhes {
  endereco: string;
  complemento: string | null;
  bairro: {
    nome: string;
  };
}

interface MapContainerProps {
  endereco: string;
  complemento?: string;
  bairro?: string;
}

const MapContainer: React.FC<MapContainerProps> = ({ endereco, complemento, bairro }) => {
  const [mapPosition, setMapPosition] = useState({ lat: -29.5169, lng: -49.9278 }); // Coordenadas de Três Cachoeiras, RS
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [geocodingComplete, setGeocodingComplete] = useState(false);
  
  const { isLoaded, loadError } = useGoogleMapsApi();
  
  const mapContainerStyle = {
    width: '100%',
    height: '200px',
    borderRadius: '8px'
  };
  
  const onLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);
  
  const onUnmount = useCallback(() => {
    setMapInstance(null);
  }, []);
  
  // Referência ao endereço atual para evitar loops
  const addressRef = useRef({ endereco, complemento, bairro });
  
  useEffect(() => {
    // Atualiza a referência quando os props mudam
    addressRef.current = { endereco, complemento, bairro };
  }, [endereco, complemento, bairro]);
  
  // Efeito para geocodificação executado apenas uma vez quando o mapa carrega
  useEffect(() => {
    const geocodeAddress = async () => {
      // Se já completou a geocodificação, não faz nada
      if (geocodingComplete) return;
      
      try {
        const { endereco, complemento, bairro } = addressRef.current;
        const fullAddress = `${endereco}${complemento ? `, ${complemento}` : ''}, ${bairro || ''}, Três Cachoeiras, RS, Brasil`;
        console.log('Buscando endereço (uma vez):', fullAddress);
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
        
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          const newPosition = { lat, lng };
          console.log('Nova posição encontrada:', newPosition);
          setMapPosition(newPosition);
          setMarker(newPosition);
          
          // Centraliza o mapa na nova posição se o mapa já estiver carregado
          if (mapInstance) {
            mapInstance.panTo(newPosition);
          }
        } else {
          console.log('Endereço não encontrado, usando posição padrão');
          // Se não encontrar o endereço, usa a posição padrão e mostra o marcador nela
          setMarker(mapPosition);
        }
        
        // Marca a geocodificação como completa
        setGeocodingComplete(true);
      } catch (error) {
        console.error('Erro ao geocodificar endereço:', error);
        // Em caso de erro, usa a posição padrão e mostra o marcador nela
        setMarker(mapPosition);
        setGeocodingComplete(true);
      }
    };
    
    if (isLoaded && !geocodingComplete) {
      geocodeAddress();
    }
  }, [isLoaded, geocodingComplete, mapPosition, mapInstance]);
  
  // Reseta o estado de geocodificação quando o modal é fechado/aberto
  useEffect(() => {
    setGeocodingComplete(false);
    
    return () => {
      // Cleanup ao desmontar
    };
  }, [endereco, complemento, bairro]); // Reseta quando o endereço muda
  
  if (loadError) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-md">Erro ao carregar o mapa</div>;
  }
  
  if (!isLoaded) {
    return <div className="p-4 bg-gray-50 text-gray-600 rounded-md">Carregando mapa...</div>;
  }
  
  return (
    <div className="mt-4">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapPosition}
        zoom={16}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControl: true
        }}
      >
        {marker && (
          <Marker 
            position={marker}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
              scaledSize: new window.google.maps.Size(40, 40)
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
};

export default function InstalacaoModal({ isOpen, onClose, event, onEventUpdated }: InstalacaoModalProps) {
  const [loading, setLoading] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [acompanhante, setAcompanhante] = useState('');
  const [cto, setCto] = useState('');
  const [portaCto, setPortaCto] = useState('');
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [contratoDetalhes, setContratoDetalhes] = useState<ContratoDetalhes | null>(null);
  const [contratoAssinado, setContratoAssinado] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCliente = async () => {
      if (!event?.pppoe) {
        setCliente(null);
        setContratoDetalhes(null);
        return;
      }

      try {
        const { data: contratoData, error: contratoError } = await supabase
          .from('contratos')
          .select(`
            id_cliente,
            endereco,
            complemento,
            bairro:id_bairro (
              nome
            )
          `)
          .eq('pppoe', event.pppoe)
          .single();

        if (contratoError) throw contratoError;

        if (contratoData) {
          setContratoDetalhes({
            endereco: contratoData.endereco,
            complemento: contratoData.complemento,
            bairro: contratoData.bairro
          });

          if (contratoData.id_cliente) {
            const { data: clienteData, error: clienteError } = await supabase
              .from('clientes')
              .select('id, nome')
              .eq('id', contratoData.id_cliente)
              .single();

            if (clienteError) throw clienteError;
            setCliente(clienteData);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        toast.error('Erro ao buscar dados do cliente');
      }
    };

    fetchCliente();
  }, [event?.pppoe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Busca o ID do contrato pelo PPPoE
      let contratoId = null;
      
      if (event.pppoe) {
        const { data: contratoData, error: contratoError } = await supabase
          .from('contratos')
          .select('id')
          .eq('pppoe', event.pppoe)
          .single();

        if (contratoError) {
          console.error('Erro ao buscar contrato:', contratoError);
          throw new Error('Contrato não encontrado para o PPPoE informado');
        }

        contratoId = contratoData.id;
      }

      // Registra a instalação
      const { data: instalacao, error: instalacaoError } = await supabase
        .from('instalacao')
        .insert({
          id_agenda: event.id,
          data_instalacao: event.datainicio,
          relato: observacao,
          acompanhante: acompanhante || null,
          id_contrato: contratoId
        })
        .select()
        .single();

      if (instalacaoError) {
        console.error('Erro ao registrar instalação:', instalacaoError);
        throw instalacaoError;
      }

      // Busca os técnicos responsáveis da agenda
      const { data: responsaveisData, error: responsaveisError } = await supabase
        .from('agenda_responsaveis')
        .select('user_id')
        .eq('agenda_id', event.id);

      if (responsaveisError) {
        console.error('Erro ao buscar responsáveis da agenda:', responsaveisError);
        throw responsaveisError;
      }

      // Se encontrou responsáveis, registra todos na instalação
      if (responsaveisData && responsaveisData.length > 0) {
        const responsaveisInsert = responsaveisData.map(resp => ({
          instalacao_id: instalacao.id,
          tecnico_id: resp.user_id
        }));

        const { error: tecnicosError } = await supabase
          .from('instalacao_tecnicos')
          .insert(responsaveisInsert);

        if (tecnicosError) {
          console.error('Erro ao registrar técnicos responsáveis:', tecnicosError);
          throw tecnicosError;
        }
      }

      // Se tiver contrato, atualiza seu status
      if (contratoId) {
        const { error: contratoError } = await supabase
          .from('contratos')
          .update({ 
            status: 'Instalado',
            data_instalacao: event.datainicio,
            contratoassinado: contratoAssinado
          })
          .eq('id', contratoId);

        if (contratoError) {
          console.error('Erro ao atualizar status do contrato:', contratoError);
          throw contratoError;
        }
      }

      // Atualiza o evento como realizado
      await saveEvent({
        ...event,
        realizada: true
      });

      if (onEventUpdated) {
        onEventUpdated();
      }

      toast.success('Instalação registrada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao registrar instalação:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar instalação. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="min-h-screen px-4 text-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
            Registrar Instalação
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Nome:</strong> {event.nome}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Data:</strong> {event.datainicio}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Responsáveis:</strong>{' '}
                  {event.responsaveis?.map(resp => resp.nome).join(', ') || 'Nenhum responsável definido'}
                </p>
                {event.descricao && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Descrição:</strong> {event.descricao}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Observações
                </label>
                <textarea
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={4}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  CTO
                </label>
                <input
                  type="text"
                  value={cto}
                  onChange={(e) => setCto(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Porta da CTO
                </label>
                <input
                  type="text"
                  value={portaCto}
                  onChange={(e) => setPortaCto(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={isSubmitting}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="acompanhante" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Acompanhante
                </label>
                <input
                  type="text"
                  id="acompanhante"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={acompanhante}
                  onChange={(e) => setAcompanhante(e.target.value)}
                  placeholder="Nome de quem acompanhou a instalação"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contrato Assinado
                </label>
                <div className="mt-1">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      checked={contratoAssinado}
                      onChange={(e) => setContratoAssinado(e.target.checked)}
                    />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                      Sim, o contrato foi assinado
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Relato
                </label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={isSubmitting}
                />
              </div>

              {contratoDetalhes && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Localização do Contrato</h4>
                  <MapContainer 
                    endereco={contratoDetalhes.endereco} 
                    complemento={contratoDetalhes.complemento || ''} 
                    bairro={contratoDetalhes.bairro?.nome} 
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
