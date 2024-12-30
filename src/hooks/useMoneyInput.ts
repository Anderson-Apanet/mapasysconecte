import { useState } from 'react';

export const useMoneyInput = (initialValue: string = '') => {
  const [displayValue, setDisplayValue] = useState(() => {
    if (!initialValue) return '';
    return formatToBRL(parseFloat(initialValue));
  });

  const handleChange = (value: string) => {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');
    
    // Converte para centavos
    const cents = parseInt(numbers) / 100;
    
    // Formata para BRL
    const formatted = formatToBRL(cents);
    
    setDisplayValue(formatted);
  };

  // Retorna o valor numérico (para o backend)
  const getValue = (): number => {
    const numbers = displayValue.replace(/\D/g, '');
    return parseInt(numbers) / 100;
  };

  return {
    value: displayValue,
    setValue: setDisplayValue,
    onChange: handleChange,
    getValue
  };
};

// Função auxiliar para formatar número para BRL
export const formatToBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};
