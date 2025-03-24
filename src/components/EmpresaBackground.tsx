import React, { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';

interface EmpresaBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Componente que aplica a cor de fundo da empresa atual
 * Usa o hook useAuth para obter a cor da empresa
 */
const EmpresaBackground: React.FC<EmpresaBackgroundProps> = ({ children, className = '' }) => {
  const { empresaColor } = useAuth();
  const [bgColor, setBgColor] = useState(empresaColor);
  
  // Atualizar a cor de fundo quando a cor da empresa mudar
  useEffect(() => {
    if (empresaColor) {
      console.log('EmpresaBackground: Atualizando cor de fundo para:', empresaColor);
      setBgColor(empresaColor);
    }
  }, [empresaColor]);

  return (
    <div 
      className={`${className}`} 
      style={{ backgroundColor: bgColor }}
    >
      {children}
    </div>
  );
};

export default EmpresaBackground;
