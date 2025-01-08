import { useState, useEffect } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

export interface MenuItem {
  title: string;
  icon: any;
  description: string;
  path: string;
  color: string;
}

export const useCardOrder = (initialCards: MenuItem[]) => {
  // Tenta carregar a ordem salva do localStorage
  const loadSavedOrder = (): MenuItem[] => {
    const saved = localStorage.getItem('menuCardOrder');
    if (saved) {
      try {
        const savedOrder = JSON.parse(saved);
        // Verifica se a ordem salva é válida e tem todos os cards
        if (Array.isArray(savedOrder) && savedOrder.length === initialCards.length) {
          return savedOrder;
        }
      } catch (e) {
        console.error('Erro ao carregar ordem dos cards:', e);
      }
    }
    return initialCards;
  };

  const [cards, setCards] = useState<MenuItem[]>(loadSavedOrder);

  // Reordena os cards
  const reorder = (activeId: string, overId: string) => {
    setCards((items) => {
      const oldIndex = items.findIndex(item => item.title === activeId);
      const newIndex = items.findIndex(item => item.title === overId);
      
      const newOrder = arrayMove(items, oldIndex, newIndex);
      
      // Salva a nova ordem no localStorage
      try {
        localStorage.setItem('menuCardOrder', JSON.stringify(newOrder));
      } catch (e) {
        console.error('Erro ao salvar ordem dos cards:', e);
      }

      return newOrder;
    });
  };

  return {
    cards,
    reorder
  };
};
