import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoogleMap, useLoadScript, InfoWindow } from '@react-google-maps/api';

const libraries: ("marker")[] = ["marker"];

interface Contrato {
  id: number;
  created_at: string;
  complemento: string | null;
  contratoassinado: boolean | null;
  data_instalacao: string | null;
  dia_vencimento: number | null;
  id_empresa: number | null;
  endereco: string | null;
  liberado48: string | null;
  locallat: string | null;
  locallon: string | null;
  pppoe: string | null;
  senha: string | null;
  status: string | null;
  tipo: string | null;
  ultparcela: string | null;
  vendedor: string | null;
  data_cad_contrato: string | null;
  id_legado: string | null;
  id_cliente: number | null;
  planos: {
    id: number;
    nome: string;
    valor: number;
  } | null;
  bairros: {
    id: number;
    nome: string;
    cidade: string;
  } | null;
}

interface ContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contrato: Contrato;
}

const ContratoModal: React.FC<ContratoModalProps> = ({ isOpen, onClose, contrato }) => {
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);

  // Garantir que a chave do Google Maps esteja disponível
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey,
    libraries
  });

  const mapOptions = useMemo(() => ({
    styles: [
      {
        featureType: 'all',
        elementType: 'all',
        stylers: [
          { 
            invert_lightness: document.documentElement.classList.contains('dark')
          }
        ]
      }
    ],
    zoomControl: true,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
    mapId: 'mapasys_map'
  }), []);

  const mapContainerStyle = useMemo(() => ({
    width: '100%',
    height: '300px'
  }), []);

  const defaultCenter = useMemo(() => ({
    lat: -23.5505,
    lng: -46.6333
  }), []);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const geocodeAddress = useCallback(async () => {
    if (!contrato.endereco) return;

    setIsLoading(true);
    try {
      const address = `${contrato.endereco}, ${contrato.bairros?.nome || ''}, Brasil`;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${googleMapsApiKey}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        setMapCenter({ lat, lng });
      }
    } catch (error) {
      console.error('Erro ao geocodificar endereço:', error);
    } finally {
      setIsLoading(false);
    }
  }, [contrato.endereco, contrato.bairros, googleMapsApiKey]);

  useEffect(() => {
    if (contrato.locallat && contrato.locallon) {
      setMapCenter({
        lat: parseFloat(contrato.locallat),
        lng: parseFloat(contrato.locallon)
      });
    } else if (contrato.endereco) {
      geocodeAddress();
    }
  }, [contrato, geocodeAddress]);

  useEffect(() => {
    if (!map || !mapCenter || !window.google) return;

    // Limpar marcador anterior
    if (marker) {
      marker.map = null;
    }

    // Limpar infoWindow anterior
    if (infoWindow) {
      infoWindow.close();
      setInfoWindow(null);
    }

    // Criar marcador
    const markerContent = document.createElement('div');
    markerContent.className = 'marker-content';
    markerContent.innerHTML = `
      <div style="
        width: 20px;
        height: 20px;
        background-color: #4F46E5;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        cursor: pointer;
      "></div>
    `;

    try {
      const newMarker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: mapCenter,
        content: markerContent,
        title: contrato.pppoe || 'Localização do Contrato'
      });

      // Criar conteúdo do InfoWindow
      const createInfoWindowContent = () => {
        const container = document.createElement('div');
        container.className = 'p-3 bg-white dark:bg-gray-800';
        container.innerHTML = `
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">
              ${contrato.pppoe}
            </p>
            <span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
              contrato.status === 'Ativo'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }">
              ${contrato.status}
            </span>
          </div>
          <div class="mb-1.5">
            <p class="text-xs text-gray-600 leading-snug">
              ${contrato.endereco}
            </p>
            ${contrato.bairros?.nome ? `
              <p class="text-[10px] text-gray-500 leading-snug">
                ${contrato.bairros.nome}
              </p>
            ` : ''}
          </div>
          ${contrato.planos ? `
            <div class="mt-1.5 pt-1.5 border-t border-gray-100">
              <p class="text-[10px] text-indigo-600 font-medium">
                ${contrato.planos.nome}
              </p>
            </div>
          ` : ''}
        `;
        return container;
      };

      // Criar InfoWindow
      const newInfoWindow = new google.maps.InfoWindow({
        content: createInfoWindowContent(),
        pixelOffset: new google.maps.Size(0, -35),
        maxWidth: 250,
        minWidth: 200
      });

      // Adicionar evento de clique
      newMarker.addListener('click', () => {
        if (showInfoWindow) {
          newInfoWindow.close();
          setShowInfoWindow(false);
        } else {
          newInfoWindow.open(map, newMarker);
          setShowInfoWindow(true);
        }
      });

      // Adicionar evento de fechamento
      newInfoWindow.addListener('closeclick', () => {
        setShowInfoWindow(false);
      });

      setMarker(newMarker);
      setInfoWindow(newInfoWindow);
    } catch (error) {
      console.error('Erro ao criar marcador ou infoWindow:', error);
    }

    return () => {
      if (marker) {
        marker.map = null;
      }
      if (infoWindow) {
        infoWindow.close();
      }
    };
  }, [map, mapCenter, contrato]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    if (marker) {
      marker.map = null;
    }
    setMarker(null);
    setMap(null);
  }, [marker]);

  if (loadError) {
    return (
      <div className="text-sm text-red-500 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        Erro ao carregar o Google Maps
      </div>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-[60]"
    >
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <Dialog.Title className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-3">
                <span>{contrato.pppoe}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  contrato.status === 'Ativo' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {contrato.status}
                </span>
              </Dialog.Title>
              <p className="text-sm text-gray-500 dark:text-gray-400">Detalhes do Contrato</p>
            </div>
            <button
              type="button"
              className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              onClick={onClose}
            >
              <span className="sr-only">Fechar</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-6 space-y-6">
            {/* Informações do Contrato */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Endereço */}
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Endereço</h4>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{contrato.endereco}</p>
                  {contrato.bairros?.nome && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{contrato.bairros.nome}</p>
                  )}
                </div>

                {/* Plano */}
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Plano</h4>
                  <p className="text-base font-medium text-indigo-600 dark:text-indigo-400">{contrato.planos?.nome || '-'}</p>
                </div>

                {/* Valor do Plano */}
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor do Plano</h4>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {contrato.planos?.valor ? new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(contrato.planos.valor) : '-'}
                  </p>
                </div>

                {/* Cidade */}
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cidade</h4>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {contrato.bairros?.cidade || '-'}
                  </p>
                </div>

                {/* Data de Instalação */}
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Instalação</h4>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {formatDate(contrato.data_instalacao)}
                  </p>
                </div>

                {/* Data de Cancelamento */}
                {contrato.data_cancelamento && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Cancelamento</h4>
                    <p className="text-base font-medium text-red-600 dark:text-red-400">
                      {formatDate(contrato.data_cancelamento)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Mapa */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Localização no Mapa</h3>
              {googleMapsApiKey ? (
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                  {isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      zoom={16}
                      center={mapCenter || defaultCenter}
                      options={mapOptions}
                      onLoad={onLoad}
                      onUnmount={onUnmount}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[300px] bg-gray-50 dark:bg-gray-700">
                      <div className="text-gray-500 dark:text-gray-400">Carregando mapa...</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  Chave da API do Google Maps não configurada
                </div>
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ContratoModal;
