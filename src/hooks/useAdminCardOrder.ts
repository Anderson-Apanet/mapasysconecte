import { useState, useEffect } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

export interface AdminMenuItem {
  id: string;
  name: string;
  icon: React.ForwardRefExoticComponent<any>;
  href: string;
  description: string;
  color: string;
}

export const useAdminCardOrder = (initialCards: AdminMenuItem[]) => {
  // Tenta carregar a ordem salva do localStorage
  const loadSavedOrder = (): AdminMenuItem[] => {
    try {
      const saved = localStorage.getItem('adminMenuCardOrder');
      if (!saved) return initialCards;

      const savedOrder = JSON.parse(saved);
      if (!Array.isArray(savedOrder) || savedOrder.length !== initialCards.length) {
        return initialCards;
      }

      // Mapeia a ordem salva para os cards iniciais, mantendo os ícones
      return savedOrder.map(savedCard => {
        const originalCard = initialCards.find(ic => ic.id === savedCard.id);
        if (!originalCard) {
          console.error('Card não encontrado:', savedCard);
          return null;
        }
        return {
          ...originalCard,
          ...savedCard,
          icon: originalCard.icon // Sempre usa o ícone do card original
        };
      }).filter((card): card is AdminMenuItem => card !== null);
    } catch (e) {
      console.error('Erro ao carregar ordem dos cards de administração:', e);
      return initialCards;
    }
  };

  const [cards, setCards] = useState<AdminMenuItem[]>(loadSavedOrder);

  // Salva a ordem no localStorage
  const saveOrder = (newOrder: AdminMenuItem[]) => {
    try {
      if (!Array.isArray(newOrder)) {
        console.error('newOrder não é um array:', newOrder);
        return;
      }

      const serializableOrder = newOrder.map(card => ({
        id: card.id,
        name: card.name,
        description: card.description,
        href: card.href,
        color: card.color
      }));

      localStorage.setItem('adminMenuCardOrder', JSON.stringify(serializableOrder));
    } catch (e) {
      console.error('Erro ao salvar ordem dos cards de administração:', e);
    }
  };

  const handleSetCards = (newCardsOrUpdater: AdminMenuItem[] | ((prev: AdminMenuItem[]) => AdminMenuItem[])) => {
    if (typeof newCardsOrUpdater === 'function') {
      setCards(prev => {
        const newCards = newCardsOrUpdater(prev);
        if (!Array.isArray(newCards)) {
          console.error('Resultado da função updater não é um array:', newCards);
          return prev;
        }
        saveOrder(newCards);
        return newCards;
      });
    } else {
      if (!Array.isArray(newCardsOrUpdater)) {
        console.error('newCards não é um array:', newCardsOrUpdater);
        return;
      }
      setCards(newCardsOrUpdater);
      saveOrder(newCardsOrUpdater);
    }
  };

  return [cards, handleSetCards] as const;
};
