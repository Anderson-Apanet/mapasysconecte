// Evento personalizado para notificar mudanças na cor da empresa
export const EMPRESA_COLOR_CHANGE_EVENT = 'empresa-color-change';

/**
 * Formata uma cor para garantir que tenha o prefixo #
 * @param color Cor em formato hexadecimal
 * @returns Cor formatada com prefixo #
 */
export const formatColor = (color: string): string => {
  // Se a cor já começa com #, retornar como está
  if (color.startsWith('#')) {
    return color;
  }
  
  // Verificar se é um valor hexadecimal válido
  const hexRegex = /^[0-9A-Fa-f]{3,6}$/;
  if (hexRegex.test(color)) {
    return `#${color}`;
  }
  
  // Se não for um valor hexadecimal válido, retornar a cor padrão
  console.warn(`Cor inválida: ${color}, usando cor padrão`);
  return '#1092E8';
};

/**
 * Atualiza a cor da empresa no localStorage e dispara um evento personalizado
 * @param color Cor da empresa no formato hexadecimal (ex: #1092E8 ou 1092E8)
 */
export const updateEmpresaColor = (color: string): void => {
  // Garantir que a cor tenha o prefixo #
  const formattedColor = formatColor(color);
  
  console.log(`Atualizando cor da empresa: Original=${color}, Formatada=${formattedColor}`);
  
  // Atualizar a variável CSS
  document.documentElement.style.setProperty('--empresa-cor-fundo', formattedColor);
  
  // Aplicar a cor diretamente ao elemento body
  document.body.style.backgroundColor = formattedColor;
  
  // Aplicar a cor diretamente aos elementos main
  const mainElements = document.querySelectorAll('main');
  if (mainElements.length > 0) {
    console.log(`Aplicando cor ${formattedColor} diretamente a ${mainElements.length} elementos main`);
    mainElements.forEach(element => {
      (element as HTMLElement).style.backgroundColor = formattedColor;
    });
  }
  
  // Armazenar no localStorage
  localStorage.setItem('empresaCor', formattedColor);
  
  // Disparar evento personalizado
  const event = new CustomEvent(EMPRESA_COLOR_CHANGE_EVENT, { detail: { color: formattedColor } });
  document.dispatchEvent(event);
};

/**
 * Obtém a cor atual da empresa do localStorage
 * @returns Cor da empresa ou cor padrão (#1092E8) se não estiver definida
 */
export const getEmpresaColor = (): string => {
  const color = localStorage.getItem('empresaCor');
  if (!color) {
    return '#1092E8';
  }
  return formatColor(color);
};

/**
 * Inicializa a cor da empresa ao carregar a página
 * Esta função deve ser chamada no início da aplicação
 */
export const initializeEmpresaColor = (): void => {
  // Verificar se existe uma cor no localStorage
  const storedColor = localStorage.getItem('empresaCor');
  
  if (storedColor) {
    console.log('Inicializando cor da empresa do localStorage:', storedColor);
    updateEmpresaColor(storedColor);
  } else {
    console.log('Nenhuma cor de empresa encontrada no localStorage, usando cor padrão');
    // Usar cor padrão
    updateEmpresaColor('#1092E8');
  }
  
  // Adicionar um listener para garantir que a cor seja aplicada após o DOM estar completamente carregado
  window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, reaplicando cor da empresa');
    const color = getEmpresaColor();
    updateEmpresaColor(color);
  });
};
