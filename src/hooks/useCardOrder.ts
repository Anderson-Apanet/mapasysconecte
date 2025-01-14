import { useState, useEffect } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

export interface MenuItem {
  title: string;
  icon: React.ForwardRefExoticComponent<any>;
  description: string;
  path: string;
  color: string;
}

export const useCardOrder = (initialCards: MenuItem[]) => {
  // Tenta carregar a ordem salva do localStorage
  const loadSavedOrder = (): MenuItem[] => {
    try {
      const saved = localStorage.getItem('menuCardOrder');
      if (!saved) return initialCards;

      const savedOrder = JSON.parse(saved);
      if (!Array.isArray(savedOrder) || savedOrder.length !== initialCards.length) {
        return initialCards;
      }

      // Mapeia a ordem salva para os cards iniciais, mantendo os ícones
      return savedOrder.map(savedCard => {
        const originalCard = initialCards.find(ic => ic.title === savedCard.title);
        if (!originalCard) {
          console.error('Card não encontrado:', savedCard);
          return null;
        }
        return {
          ...originalCard,
          ...savedCard,
          icon: originalCard.icon // Sempre usa o ícone do card original
        };
      }).filter((card): card is MenuItem => card !== null);
    } catch (e) {
      console.error('Erro ao carregar ordem dos cards:', e);
      return initialCards;
    }
  };

  const [cards, setCards] = useState<MenuItem[]>(loadSavedOrder);

  // Salva a ordem no localStorage
  const saveOrder = (newOrder: MenuItem[]) => {
    try {
      if (!Array.isArray(newOrder)) {
        console.error('newOrder não é um array:', newOrder);
        return;
      }

      const serializableOrder = newOrder.map(card => ({
        title: card.title,
        description: card.description,
        path: card.path,
        color: card.color
      }));

      localStorage.setItem('menuCardOrder', JSON.stringify(serializableOrder));
    } catch (e) {
      console.error('Erro ao salvar ordem dos cards:', e);
    }
  };

  const handleSetCards = (newCardsOrUpdater: MenuItem[] | ((prev: MenuItem[]) => MenuItem[])) => {
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
