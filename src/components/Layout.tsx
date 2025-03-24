import React, { useEffect, useState } from 'react';
import Header from './Header';
import { EMPRESA_COLOR_CHANGE_EVENT, getEmpresaColor, initializeEmpresaColor } from '../utils/empresaColorEvent';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [backgroundColor, setBackgroundColor] = useState(getEmpresaColor());

  useEffect(() => {
    // Inicializar a cor da empresa
    initializeEmpresaColor();
    
    // Função para atualizar a cor de fundo
    const handleColorChange = (event: CustomEvent) => {
      const { color } = event.detail;
      console.log('Layout: Evento de mudança de cor recebido:', color);
      setBackgroundColor(color);
    };
    
    // Registrar listener para o evento de mudança de cor
    document.addEventListener(
      EMPRESA_COLOR_CHANGE_EVENT, 
      handleColorChange as EventListener
    );
    
    // Verificar a cor atual no localStorage
    const currentColor = getEmpresaColor();
    console.log('Layout: Cor inicial:', currentColor);
    setBackgroundColor(currentColor);
    
    // Aplicar a cor imediatamente ao elemento main
    const applyColorToMain = () => {
      const mainElement = document.querySelector('main');
      if (mainElement) {
        (mainElement as HTMLElement).style.backgroundColor = currentColor;
        console.log('Layout: Cor aplicada diretamente ao main:', currentColor);
      }
    };
    
    // Aplicar a cor após um pequeno delay para garantir que o DOM está pronto
    setTimeout(applyColorToMain, 100);
    
    return () => {
      document.removeEventListener(
        EMPRESA_COLOR_CHANGE_EVENT, 
        handleColorChange as EventListener
      );
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main 
        className="flex-1 pt-16" 
        style={{ backgroundColor }}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;
